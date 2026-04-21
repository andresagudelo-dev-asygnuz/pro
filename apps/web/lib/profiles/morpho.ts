import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import type {
  MorphoFieldKey,
  ProfileFieldVisibility,
  ProfileMorpho,
  VisibilityField,
  VisibilityLevel,
} from "@/lib/types/db";
import { MORPHO_FIELD_KEYS } from "@/lib/types/db";

/**
 * Queries read-only de Bloque 2 Morfológico (HU-003 PR C).
 *
 * Respetan RLS self-only: el cliente Supabase usa la sesión del usuario y
 * las policies `profiles_morpho_read_self` / `pfv_read_self` restringen a
 * `auth.uid() = user_id`.
 */

export const getMorphoProfile = cache(
  async (): Promise<ProfileMorpho | null> => {
    const user = await getUser();
    if (!user) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles_morpho")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    return (data as ProfileMorpho | null) ?? null;
  },
);

export const getMorphoVisibilityCatalog = cache(
  async (): Promise<VisibilityField[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("visibility_fields")
      .select("*")
      .eq("bloque", "morpho")
      .eq("active", true)
      .order("field_key", { ascending: true });
    return (data as VisibilityField[] | null) ?? [];
  },
);

export const getMorphoVisibility = cache(
  async (): Promise<Record<MorphoFieldKey, VisibilityLevel>> => {
    const user = await getUser();
    const catalog = await getMorphoVisibilityCatalog();
    const defaults = defaultsFromCatalog(catalog);
    if (!user) return defaults;
    const supabase = await createClient();
    const { data } = await supabase
      .from("profile_field_visibility")
      .select("*")
      .eq("user_id", user.id)
      .in("field_key", [...MORPHO_FIELD_KEYS]);
    const rows = (data as ProfileFieldVisibility[] | null) ?? [];
    for (const row of rows) {
      if ((MORPHO_FIELD_KEYS as readonly string[]).includes(row.field_key)) {
        defaults[row.field_key as MorphoFieldKey] = row.level;
      }
    }
    return defaults;
  },
);

function defaultsFromCatalog(
  catalog: VisibilityField[],
): Record<MorphoFieldKey, VisibilityLevel> {
  const out = {} as Record<MorphoFieldKey, VisibilityLevel>;
  for (const key of MORPHO_FIELD_KEYS) {
    const entry = catalog.find((c) => c.field_key === key);
    out[key] = entry?.default_level ?? "promotores";
  }
  return out;
}
