"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAgeVerificationAprobada } from "@/lib/auth/age-verification";
import {
  fieldVisibilitySchema,
  formDataToObject,
  identityBlockSchema,
  zFieldErrors,
} from "@/lib/validation/schemas";
import {
  IDENTITY_FIELD_KEYS,
  type IdentityFieldKey,
  type Sport,
  type SkillTag,
  type VisibilityLevel,
} from "@/lib/types/db";

export type SaveIdentityState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Timestamp (ms) para resetear banderas UI entre envíos idénticos. */
  savedAt?: number;
};

export type SetFieldVisibilityState = {
  error?: string;
  message?: string;
  savedAt?: number;
};

/**
 * Server Action — HU-003 PR B: guarda Bloque 1 Identidad (`profiles_core`).
 *
 * 1. Verifica sesión + verificación de edad aprobada (gate UX; RLS/DB es
 *    la capa de verdad).
 * 2. Parsea FormData con `identityBlockSchema`. La visibilidad por campo
 *    se envía en paralelo con claves `visibility[<field_key>]` y se valida
 *    contra `fieldVisibilitySchema` (enums del catálogo).
 * 3. Valida contra catálogos abiertos: `primary_sport_id` en `sports` y
 *    `soft_skills_tags` en `skill_tags` (category=soft).
 * 4. Upsert de `profiles_core` (PK `user_id`).
 * 5. Upsert en batch de `profile_field_visibility` para los 7 field_keys
 *    de identity; si no hay fila aún, el trigger la crea con default y
 *    nosotros la reescribimos.
 * 6. Revalida `/perfil` y `/u/<slug>` (la vista pública llega en PR D; ya
 *    dejamos la revalidación lista).
 */
export async function saveIdentityBlock(
  _prev: SaveIdentityState,
  formData: FormData,
): Promise<SaveIdentityState> {
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
  for (const key of IDENTITY_FIELD_KEYS) {
    const v = obj[`visibility[${key}]`];
    if (typeof v === "string" && v.length > 0) visibilityInput[key] = v;
    delete obj[`visibility[${key}]`];
  }

  const parsed = identityBlockSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      error: "Revisá los campos marcados.",
      fieldErrors: zFieldErrors(parsed) ?? undefined,
    };
  }

  const {
    full_name,
    birth_date,
    city,
    region,
    country,
    primary_sport_id,
    interests_raw,
    soft_skills_text,
    soft_skills_tags_raw,
    slug,
  } = parsed.data;

  // --- Validar primary_sport_id contra catálogo `sports` ---------------
  const { data: sport } = await supabase
    .from("sports")
    .select("id")
    .eq("id", primary_sport_id)
    .maybeSingle<Pick<Sport, "id">>();
  if (!sport) {
    return {
      error: "Revisá los campos marcados.",
      fieldErrors: { primary_sport_id: "Deporte no disponible." },
    };
  }

  // --- Validar soft_skills_tags contra catálogo `skill_tags` -----------
  const rawTags = soft_skills_tags_raw as string[];
  let softSkillsTags: string[] = [];
  if (rawTags.length > 0) {
    const { data: validTags } = await supabase
      .from("skill_tags")
      .select("id")
      .eq("category", "soft")
      .eq("active", true)
      .in("id", rawTags);
    const validIds = new Set(
      ((validTags as Pick<SkillTag, "id">[] | null) ?? []).map((t) => t.id),
    );
    softSkillsTags = rawTags.filter((t) => validIds.has(t));
    if (softSkillsTags.length !== rawTags.length) {
      return {
        error: "Revisá los campos marcados.",
        fieldErrors: {
          soft_skills_tags: "Hay habilidades fuera del catálogo permitido.",
        },
      };
    }
  }

  // --- Validar visibilidad por campo contra schema --------------------
  const visibilityByKey: Partial<Record<IdentityFieldKey, VisibilityLevel>> = {};
  for (const [field_key, level] of Object.entries(visibilityInput)) {
    const parsedVis = fieldVisibilitySchema.safeParse({ field_key, level });
    if (!parsedVis.success) {
      return {
        error: "Revisá los campos marcados.",
        fieldErrors: { [`visibility.${field_key}`]: "Visibilidad inválida." },
      };
    }
    visibilityByKey[parsedVis.data.field_key] = parsedVis.data.level;
  }

  // --- Upsert profiles_core -----------------------------------------
  const nowIso = new Date().toISOString();
  const { error: upsertErr } = await supabase.from("profiles_core").upsert(
    {
      user_id: user.id,
      full_name,
      birth_date,
      city,
      region,
      country,
      primary_sport_id,
      interests: interests_raw,
      soft_skills_text,
      soft_skills_tags: softSkillsTags,
      slug,
      updated_at: nowIso,
    },
    { onConflict: "user_id" },
  );

  if (upsertErr) {
    if (upsertErr.code === "23505") {
      return {
        error: "Revisá los campos marcados.",
        fieldErrors: { slug: "Ese slug ya está en uso. Probá con otro." },
      };
    }
    if (upsertErr.code === "23514") {
      return {
        error:
          "Hay un campo con un valor fuera de los límites aceptados. Revisá el formulario.",
      };
    }
    console.error("[saveIdentityBlock] upsert error", upsertErr);
    return { error: "No pudimos guardar tu perfil. Probá de nuevo." };
  }

  // --- Upsert visibilidad por campo -----------------------------------
  if (Object.keys(visibilityByKey).length > 0) {
    const rows = (Object.entries(visibilityByKey) as [
      IdentityFieldKey,
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
      console.error("[saveIdentityBlock] visibility upsert error", visErr);
      return {
        error:
          "Guardamos tus datos pero no pudimos actualizar la visibilidad. Probá de nuevo.",
      };
    }
  }

  revalidatePath("/perfil");
  revalidatePath(`/u/${slug}`);
  return {
    message: "Perfil actualizado.",
    savedAt: Date.now(),
  };
}

/**
 * Server Action — ajuste inmediato de visibilidad por campo sin pasar por
 * el form completo. Útil cuando el usuario cambia el dropdown y queremos
 * persistir sin esperar al Guardar global.
 *
 * No requiere `profiles_core` pre-existente: siembra la fila si no existe
 * (`upsert`). Complementa el trigger DB.
 */
export async function setFieldVisibility(
  _prev: SetFieldVisibilityState,
  formData: FormData,
): Promise<SetFieldVisibilityState> {
  await requireAgeVerificationAprobada();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Tu sesión expiró. Volvé a iniciar sesión." };
  }

  const obj = formDataToObject(formData);
  const parsed = fieldVisibilitySchema.safeParse(obj);
  if (!parsed.success) {
    return { error: "Campo o nivel inválido." };
  }

  const { field_key, level } = parsed.data;

  const { error } = await supabase
    .from("profile_field_visibility")
    .upsert(
      { user_id: user.id, field_key, level, updated_at: new Date().toISOString() },
      { onConflict: "user_id,field_key" },
    );

  if (error) {
    console.error("[setFieldVisibility] upsert error", error);
    return { error: "No pudimos guardar la visibilidad. Probá de nuevo." };
  }

  revalidatePath("/perfil");
  return { message: "Visibilidad actualizada.", savedAt: Date.now() };
}
