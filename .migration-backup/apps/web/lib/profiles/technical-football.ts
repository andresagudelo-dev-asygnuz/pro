import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import type {
  ProfileFieldVisibility,
  ProfileTechnicalFootball,
  TechnicalFootballFieldKey,
  VisibilityField,
  VisibilityLevel,
} from "@/lib/types/db";
import { TECHNICAL_FOOTBALL_FIELD_KEYS } from "@/lib/types/db";

/**
 * Queries read-only de Bloque 4 Destrezas Técnicas Fútbol (HU-003 PR C).
 */

export const getTechnicalFootballProfile = cache(
  async (userId?: string): Promise<ProfileTechnicalFootball | null> => {
    const uid = userId ?? (await getUser())?.id;
    if (!uid) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles_technical_football")
      .select("*")
      .eq("user_id", uid)
      .maybeSingle();
    return (data as ProfileTechnicalFootball | null) ?? null;
  },
);

export const getTechnicalFootballVisibilityCatalog = cache(
  async (): Promise<VisibilityField[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("visibility_fields")
      .select("*")
      .eq("bloque", "technical.football")
      .eq("active", true)
      .order("field_key", { ascending: true });
    return (data as VisibilityField[] | null) ?? [];
  },
);

export const getTechnicalFootballVisibility = cache(
  async (
    userId?: string,
  ): Promise<Record<TechnicalFootballFieldKey, VisibilityLevel>> => {
    const uid = userId ?? (await getUser())?.id;
    const catalog = await getTechnicalFootballVisibilityCatalog();
    const defaults = defaultsFromCatalog(catalog);
    if (!uid) return defaults;
    const supabase = await createClient();
    const { data } = await supabase
      .from("profile_field_visibility")
      .select("*")
      .eq("user_id", uid)
      .in("field_key", [...TECHNICAL_FOOTBALL_FIELD_KEYS]);
    const rows = (data as ProfileFieldVisibility[] | null) ?? [];
    for (const row of rows) {
      if (
        (TECHNICAL_FOOTBALL_FIELD_KEYS as readonly string[]).includes(
          row.field_key,
        )
      ) {
        defaults[row.field_key as TechnicalFootballFieldKey] = row.level;
      }
    }
    return defaults;
  },
);

function defaultsFromCatalog(
  catalog: VisibilityField[],
): Record<TechnicalFootballFieldKey, VisibilityLevel> {
  const out = {} as Record<TechnicalFootballFieldKey, VisibilityLevel>;
  for (const key of TECHNICAL_FOOTBALL_FIELD_KEYS) {
    const entry = catalog.find((c) => c.field_key === key);
    out[key] = entry?.default_level ?? "publico";
  }
  return out;
}
