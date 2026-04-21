"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAgeVerificationAprobada } from "@/lib/auth/age-verification";
import {
  conditionalBlockSchema,
  fieldVisibilitySchema,
  formDataToObject,
  zFieldErrors,
} from "@/lib/validation/schemas";
import {
  CONDITIONAL_FIELD_KEYS,
  type ConditionalFieldKey,
  type SkillTag,
  type SkillTagCategory,
  type VisibilityLevel,
} from "@/lib/types/db";

export type SaveConditionalState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  savedAt?: number;
};

/**
 * Server Action — HU-003 PR C: guarda Bloque 3 Capacidades Condicionales.
 *
 * Las 4 categorías (strength/speed/endurance/flexibility) llegan como:
 *   <cat>_tags_raw  string CSV con ids del catálogo `skill_tags`
 *   <cat>_notes     texto libre 0..400 chars
 * Validamos cada grupo de tags contra el catálogo (categoría matching)
 * antes del upsert a `profiles_conditional`.
 */
export async function saveConditionalBlock(
  _prev: SaveConditionalState,
  formData: FormData,
): Promise<SaveConditionalState> {
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
  for (const key of CONDITIONAL_FIELD_KEYS) {
    const v = obj[`visibility[${key}]`];
    if (typeof v === "string" && v.length > 0) visibilityInput[key] = v;
    delete obj[`visibility[${key}]`];
  }

  const parsed = conditionalBlockSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      error: "Revisá los campos marcados.",
      fieldErrors: zFieldErrors(parsed) ?? undefined,
    };
  }

  const {
    strength_tags_raw,
    strength_notes,
    speed_tags_raw,
    speed_notes,
    endurance_tags_raw,
    endurance_notes,
    flexibility_tags_raw,
    flexibility_notes,
  } = parsed.data;

  // --- Validar cada grupo de tags contra el catálogo -----------------
  const groups: {
    category: SkillTagCategory;
    raw: string[];
    fieldError: string;
  }[] = [
    {
      category: "strength",
      raw: strength_tags_raw,
      fieldError: "strength_tags_raw",
    },
    { category: "speed", raw: speed_tags_raw, fieldError: "speed_tags_raw" },
    {
      category: "endurance",
      raw: endurance_tags_raw,
      fieldError: "endurance_tags_raw",
    },
    {
      category: "flexibility",
      raw: flexibility_tags_raw,
      fieldError: "flexibility_tags_raw",
    },
  ];

  const validated: Record<string, string[]> = {};
  for (const g of groups) {
    if (g.raw.length === 0) {
      validated[g.category] = [];
      continue;
    }
    const { data: validTags } = await supabase
      .from("skill_tags")
      .select("id")
      .eq("category", g.category)
      .eq("active", true)
      .in("id", g.raw);
    const validIds = new Set(
      ((validTags as Pick<SkillTag, "id">[] | null) ?? []).map((t) => t.id),
    );
    const filtered = g.raw.filter((t) => validIds.has(t));
    if (filtered.length !== g.raw.length) {
      return {
        error: "Revisá los campos marcados.",
        fieldErrors: {
          [g.fieldError]: "Hay habilidades fuera del catálogo permitido.",
        },
      };
    }
    validated[g.category] = filtered;
  }

  // --- Validar visibilidad por campo contra schema ------------------
  const visibilityByKey: Partial<Record<ConditionalFieldKey, VisibilityLevel>> =
    {};
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
      !(CONDITIONAL_FIELD_KEYS as readonly string[]).includes(
        parsedVis.data.field_key,
      )
    ) {
      return {
        error: "Revisá los campos marcados.",
        fieldErrors: {
          [`visibility.${field_key}`]: "Campo fuera del bloque condicional.",
        },
      };
    }
    visibilityByKey[parsedVis.data.field_key as ConditionalFieldKey] =
      parsedVis.data.level;
  }

  // --- Upsert profiles_conditional ----------------------------------
  const nowIso = new Date().toISOString();
  const { error: upsertErr } = await supabase
    .from("profiles_conditional")
    .upsert(
      {
        user_id: user.id,
        strength_tags: validated.strength,
        strength_notes,
        speed_tags: validated.speed,
        speed_notes,
        endurance_tags: validated.endurance,
        endurance_notes,
        flexibility_tags: validated.flexibility,
        flexibility_notes,
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
    console.error("[saveConditionalBlock] upsert error", upsertErr);
    return {
      error: "No pudimos guardar tus capacidades condicionales. Probá de nuevo.",
    };
  }

  // --- Upsert visibilidad por campo ---------------------------------
  if (Object.keys(visibilityByKey).length > 0) {
    const rows = (
      Object.entries(visibilityByKey) as [
        ConditionalFieldKey,
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
      console.error("[saveConditionalBlock] visibility upsert error", visErr);
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
    message: "Capacidades condicionales actualizadas.",
    savedAt: Date.now(),
  };
}
