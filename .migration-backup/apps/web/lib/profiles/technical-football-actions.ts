"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAgeVerificationAprobada } from "@/lib/auth/age-verification";
import {
  fieldVisibilitySchema,
  formDataToObject,
  technicalFootballBlockSchema,
  zFieldErrors,
} from "@/lib/validation/schemas";
import {
  TECHNICAL_FOOTBALL_FIELD_KEYS,
  type DominantFoot,
  type FootballPosition,
  type TechnicalFootballFieldKey,
  type VisibilityLevel,
} from "@/lib/types/db";

export type SaveTechnicalFootballState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  savedAt?: number;
};

/**
 * Server Action — HU-003 PR C: guarda Bloque 4 Destrezas Técnicas Fútbol.
 *
 * `position` y `dominant_foot` son NOT NULL en DB; los textos (performance,
 * tactical_role) son opcionales 0..1000 chars.
 */
export async function saveTechnicalFootballBlock(
  _prev: SaveTechnicalFootballState,
  formData: FormData,
): Promise<SaveTechnicalFootballState> {
  const av = await requireAgeVerificationAprobada();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== av.user_id) {
    return { error: "Tu sesión expiró. Volvé a iniciar sesión." };
  }

  const obj = formDataToObject(formData);

  const visibilityInput: Record<string, string> = {};
  for (const key of TECHNICAL_FOOTBALL_FIELD_KEYS) {
    const v = obj[`visibility[${key}]`];
    if (typeof v === "string" && v.length > 0) visibilityInput[key] = v;
    delete obj[`visibility[${key}]`];
  }

  const parsed = technicalFootballBlockSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      error: "Revisá los campos marcados.",
      fieldErrors: zFieldErrors(parsed) ?? undefined,
    };
  }

  const { position, dominant_foot, performance_notes, tactical_role_notes } =
    parsed.data;

  // --- Validar visibilidad por campo contra schema ------------------
  const visibilityByKey: Partial<
    Record<TechnicalFootballFieldKey, VisibilityLevel>
  > = {};
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
    if (
      !(TECHNICAL_FOOTBALL_FIELD_KEYS as readonly string[]).includes(
        parsedVis.data.field_key,
      )
    ) {
      return {
        error: "Revisá los campos marcados.",
        fieldErrors: {
          [`visibility.${field_key}`]: "Campo fuera del bloque técnico.",
        },
      };
    }
    visibilityByKey[parsedVis.data.field_key as TechnicalFootballFieldKey] =
      parsedVis.data.level;
  }

  // --- Upsert profiles_technical_football --------------------------
  const nowIso = new Date().toISOString();
  const { error: upsertErr } = await supabase
    .from("profiles_technical_football")
    .upsert(
      {
        user_id: user.id,
        position: position as FootballPosition,
        dominant_foot: dominant_foot as DominantFoot,
        performance_notes,
        tactical_role_notes,
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
    console.error("[saveTechnicalFootballBlock] upsert error", upsertErr);
    return {
      error: "No pudimos guardar tu bloque técnico. Probá de nuevo.",
    };
  }

  // --- Upsert visibilidad por campo -------------------------------
  if (Object.keys(visibilityByKey).length > 0) {
    const rows = (
      Object.entries(visibilityByKey) as [
        TechnicalFootballFieldKey,
        VisibilityLevel,
      ][]
    ).map(([field_key, level]) => ({
      user_id: user.id,
      field_key,
      level,
      updated_at: nowIso,
    }));
    const { error: visErr } = await supabase
      .from("profile_field_visibility")
      .upsert(rows, { onConflict: "user_id,field_key" });
    if (visErr) {
      console.error(
        "[saveTechnicalFootballBlock] visibility upsert error",
        visErr,
      );
      return {
        error:
          "Guardamos tus datos pero no pudimos actualizar la visibilidad. Probá de nuevo.",
      };
    }
  }

  revalidatePath("/perfil");
  const { data: coreRow } = await supabase
    .from("profiles_core")
    .select("slug")
    .eq("user_id", user.id)
    .maybeSingle<{ slug: string }>();
  if (coreRow?.slug) revalidatePath(`/u/${coreRow.slug}`);

  return {
    message: "Destrezas técnicas actualizadas.",
    savedAt: Date.now(),
  };
}
