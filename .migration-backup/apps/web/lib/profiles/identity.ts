import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import type {
  IdentityFieldKey,
  ProfileCore,
  ProfileFieldVisibility,
  SkillTag,
  VisibilityField,
  VisibilityLevel,
} from "@/lib/types/db";
import { IDENTITY_FIELD_KEYS } from "@/lib/types/db";

/**
 * Queries read-only del Bloque 1 Identidad (HU-003 / RF-002).
 *
 * Todas respetan RLS self-only: el cliente Supabase usa la sesión del
 * usuario y las policies de `profiles_core`/`profile_field_visibility` sólo
 * permiten `auth.uid() = user_id`.
 */

export const getIdentityProfile = cache(
  async (userId?: string): Promise<ProfileCore | null> => {
    const uid = userId ?? (await getUser())?.id;
    if (!uid) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles_core")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    return (data as ProfileCore | null) ?? null;
  },
);

/**
 * Busca un perfil por slug. Útil para la vista pública `/u/[slug]`.
 */
export const getIdentityProfileBySlug = cache(
  async (slug: string): Promise<ProfileCore | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles_core")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    return (data as ProfileCore | null) ?? null;
  },
);

export const getIdentityVisibility = cache(
  async (userId?: string): Promise<Record<IdentityFieldKey, VisibilityLevel>> => {
    const uid = userId ?? (await getUser())?.id;
    if (!uid) return defaultsFromCatalog(await getIdentityVisibilityCatalog());

    const supabase = await createClient();
    const { data } = await supabase
      .from("profile_field_visibility")
      .select("*")
      .eq("user_id", uid)
      .in("field_key", [...IDENTITY_FIELD_KEYS]);

    const rows = (data as ProfileFieldVisibility[] | null) ?? [];
    const catalog = await getIdentityVisibilityCatalog();
    const defaults = defaultsFromCatalog(catalog);
    for (const row of rows) {
      if ((IDENTITY_FIELD_KEYS as readonly string[]).includes(row.field_key)) {
        defaults[row.field_key as IdentityFieldKey] = row.level;
      }
    }
    return defaults;
  },
);

export const getIdentityVisibilityCatalog = cache(
  async (): Promise<VisibilityField[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("visibility_fields")
      .select("*")
      .eq("bloque", "identity")
      .eq("active", true)
      .order("field_key", { ascending: true });
    return (data as VisibilityField[] | null) ?? [];
  },
);

export const getSoftSkillsCatalog = cache(async (): Promise<SkillTag[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("skill_tags")
    .select("*")
    .eq("category", "soft")
    .eq("active", true)
    .order("label", { ascending: true });
  return (data as SkillTag[] | null) ?? [];
});

function defaultsFromCatalog(
  catalog: VisibilityField[],
): Record<IdentityFieldKey, VisibilityLevel> {
  const out = {} as Record<IdentityFieldKey, VisibilityLevel>;
  for (const key of IDENTITY_FIELD_KEYS) {
    const entry = catalog.find((c) => c.field_key === key);
    out[key] = entry?.default_level ?? "publico";
  }
  return out;
}
