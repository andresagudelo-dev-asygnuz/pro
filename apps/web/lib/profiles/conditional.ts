import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import type {
  ConditionalFieldKey,
  ProfileConditional,
  ProfileFieldVisibility,
  SkillTag,
  SkillTagCategory,
  VisibilityField,
  VisibilityLevel,
} from "@/lib/types/db";
import { CONDITIONAL_FIELD_KEYS } from "@/lib/types/db";

/**
 * Queries read-only de Bloque 3 Capacidades Condicionales (HU-003 PR C).
 */

export const getConditionalProfile = cache(
  async (userId?: string): Promise<ProfileConditional | null> => {
    const uid = userId ?? (await getUser())?.id;
    if (!uid) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles_conditional")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    return (data as ProfileConditional | null) ?? null;
  },
);

export const getConditionalVisibilityCatalog = cache(
  async (): Promise<VisibilityField[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("visibility_fields")
      .select("*")
      .eq("bloque", "conditional")
      .eq("active", true)
      .order("field_key", { ascending: true });
    return (data as VisibilityField[] | null) ?? [];
  },
);

export const getConditionalVisibility = cache(
  async (
    userId?: string,
  ): Promise<Record<ConditionalFieldKey, VisibilityLevel>> => {
    const uid = userId ?? (await getUser())?.id;
    const catalog = await getConditionalVisibilityCatalog();
    const defaults = defaultsFromCatalog(catalog);
    if (!uid) return defaults;
    const supabase = await createClient();
    const { data } = await supabase
      .from("profile_field_visibility")
      .select("*")
      .eq("user_id", uid)
      .in("field_key", [...CONDITIONAL_FIELD_KEYS]);
    const rows = (data as ProfileFieldVisibility[] | null) ?? [];
    for (const row of rows) {
      if (
        (CONDITIONAL_FIELD_KEYS as readonly string[]).includes(row.field_key)
      ) {
        defaults[row.field_key as ConditionalFieldKey] = row.level;
      }
    }
    return defaults;
  },
);

export const getSkillTagsByCategory = cache(
  async (category: SkillTagCategory): Promise<SkillTag[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("skill_tags")
      .select("*")
      .eq("category", category)
      .eq("active", true)
      .order("label", { ascending: true });
    return (data as SkillTag[] | null) ?? [];
  },
);

export const getSkillTagsByCategories = cache(
  async (categories: SkillTagCategory[]): Promise<SkillTag[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("skill_tags")
      .select("*")
      .in("category", categories)
      .eq("active", true)
      .order("label", { ascending: true });
    return (data as SkillTag[] | null) ?? [];
  },
);

function defaultsFromCatalog(
  catalog: VisibilityField[],
): Record<ConditionalFieldKey, VisibilityLevel> {
  const out = {} as Record<ConditionalFieldKey, VisibilityLevel>;
  for (const key of CONDITIONAL_FIELD_KEYS) {
    const entry = catalog.find((c) => c.field_key === key);
    out[key] = entry?.default_level ?? "publico";
  }
  return out;
}
