"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAgeVerificationAprobada } from "@/lib/auth/age-verification";
import {
  fieldVisibilitySchema,
  formDataToObject,
  morphologicalBlockSchema,
  zFieldErrors,
} from "@/lib/validation/schemas";
import {
  MORPHO_FIELD_KEYS,
  type MorphoFieldKey,
  type VisibilityLevel,
} from "@/lib/types/db";

export type SaveMorphoState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Timestamp (ms) para resetear banderas UI entre envíos idénticos. */
  savedAt?: number;
};

/**
 * Server Action — HU-003 PR C: guarda Bloque 2 Morfológico.
 *
 * 1. Gate: sesión válida + verificación de edad aprobada (RLS/DB es la
 *    capa de verdad; esto es UX).
 * 2. Parsea FormData con `morphologicalBlockSchema`.
 * 3. Upsert en `profiles_morpho` (PK `user_id`; trigger DB siembra defaults
 *    de visibility al insertar si no existían).
 * 4. Upsert en batch de overrides de `profile_field_visibility` para los
 *    5 field_keys del bloque morpho.
 * 5. Revalida `/perfil` y `/u/<slug>` (PR D consume la vista pública).
 */
export async function saveMorphologicalBlock(
  _prev: SaveMorphoState,
  formData: FormData,
): Promise<SaveMorphoState> {
  const av = await requireAgeVerificationAprobada();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== av.user_id) {
    return { error: "Tu sesión expiró. Volvé a iniciar sesión." };
  }

  const obj = formDataToObject(formData);

  // --- Extraer overrides de visibilidad antes de validar el bloque ----
  const visibilityInput: Record<string, string> = {};
  for (const key of MORPHO_FIELD_KEYS) {
    const v = obj[`visibility[${key}]`];
    if (typeof v === "string" && v.length > 0) visibilityInput[key] = v;
    delete obj[`visibility[${key}]`];
  }

  const parsed = morphologicalBlockSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      error: "Revisá los campos marcados.",
      fieldErrors: zFieldErrors(parsed) ?? undefined,
    };
  }

  const { height_m, weight_kg, wingspan_m, laterality, somatotype } =
    parsed.data;

  // --- Validar visibilidad por campo contra schema --------------------
  const visibilityByKey: Partial<Record<MorphoFieldKey, VisibilityLevel>> = {};
  for (const [field_key, level] of Object.entries(visibilityInput)) {
    const parsedVis = fieldVisibilitySchema.safeParse({ field_key, level });
    if (!parsedVis.success) {
      return {
        error: "Revisá los campos marcados.",
        fieldErrors: {
          [`visibility.${field_key}`]: "Visibilidad inválida.",
        },
      };
    }
    if (!(MORPHO_FIELD_KEYS as readonly string[]).includes(
      parsedVis.data.field_key,
    )) {
      return {
        error: "Revisá los campos marcados.",
        fieldErrors: {
          [`visibility.${field_key}`]: "Campo fuera del bloque morfológico.",
        },
      };
    }
    visibilityByKey[parsedVis.data.field_key as MorphoFieldKey] =
      parsedVis.data.level;
  }

  // --- Upsert profiles_morpho ----------------------------------------
  const nowIso = new Date().toISOString();
  const { error: upsertErr } = await supabase.from("profiles_morpho").upsert(
    {
      user_id: user.id,
      height_m,
      weight_kg,
      wingspan_m,
      laterality,
      somatotype,
      updated_at: nowIso,
    },
    { onConflict: "user_id" },
  );

  if (upsertErr) {
    if (upsertErr.code === "23514") {
      return {
        error:
          "Hay un campo con un valor fuera de los límites aceptados. Revisá el formulario.",
      };
    }
    console.error("[saveMorphologicalBlock] upsert error", upsertErr);
    return { error: "No pudimos guardar tu bloque morfológico. Probá de nuevo." };
  }

  // --- Upsert visibilidad por campo ----------------------------------
  if (Object.keys(visibilityByKey).length > 0) {
    const rows = (Object.entries(visibilityByKey) as [
      MorphoFieldKey,
      VisibilityLevel,
    ][]).map(([field_key, level]) => ({
      user_id: user.id,
      field_key,
      level,
      updated_at: nowIso,
    }));
    const { error: visErr } = await supabase
      .from("profile_field_visibility")
      .upsert(rows, { onConflict: "user_id,field_key" });
    if (visErr) {
      console.error("[saveMorphologicalBlock] visibility upsert error", visErr);
      return {
        error:
          "Guardamos tus datos pero no pudimos actualizar la visibilidad. Probá de nuevo.",
      };
    }
  }

  // Revalidar /perfil + vista pública (PR D la consumirá).
  revalidatePath("/perfil");
  const { data: coreRow } = await supabase
    .from("profiles_core")
    .select("slug")
    .eq("user_id", user.id)
    .maybeSingle<{ slug: string }>();
  if (coreRow?.slug) revalidatePath(`/u/${coreRow.slug}`);

  return {
    message: "Bloque morfológico actualizado.",
    savedAt: Date.now(),
  };
}
