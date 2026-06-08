import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type {
  Profile,
  ProfileMorpho,
  ProfileConditional,
  ProfileTechnicalFootball,
  VisibilityLevel,
} from "@/lib/types/db";

type ApiResult<T> = { data: T | null; error: string | null };
type PaginatedResult<T> = { data: T | null; error: string | null; nextCursor: string | null };

export interface PlayerSearchFilters {
  city?: string;
  skill_level?: string;
  position?: string;
}

export async function searchPlayers(
  supabase: SupabaseClient,
  filters: PlayerSearchFilters,
  options: { cursor?: string; limit?: number }
): Promise<PaginatedResult<Profile[]>> {
  const limit = options.limit ?? 20;

  const { data: playerRoles, error: rolesErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("is_player", true);

  if (rolesErr) return { data: null, error: mapDbError(rolesErr, "search_players_roles"), nextCursor: null };

  const playerIds = (playerRoles ?? []).map((r: { user_id: string }) => r.user_id);
  if (playerIds.length === 0) return { data: [], error: null, nextCursor: null };

  let query = supabase
    .from("profiles")
    .select(
      "id, username, full_name, avatar_url, city, primary_sport_id, primary_skill_level, position, preferred_foot, rating_avg, rating_count, matches_played, skill_pace, skill_shooting, skill_passing, skill_dribbling, skill_defending, skill_physical, created_at, updated_at, banner_url, bio, tournament_goals, tournament_matches, business_name, business_phone, business_whatsapp, business_website"
    )
    .in("id", playerIds)
    .order("matches_played", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }
  if (filters.skill_level) {
    query = query.eq("primary_skill_level", filters.skill_level);
  }
  if (filters.position) {
    query = query.eq("position", filters.position);
  }
  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: mapDbError(error, "search_players"), nextCursor: null };

  const players = (data ?? []) as Profile[];
  const nextCursor = players.length === limit ? players[players.length - 1].created_at : null;
  return { data: players, error: null, nextCursor };
}

type ProfileBlocks = {
  morpho: ProfileMorpho | null;
  conditional: ProfileConditional | null;
  technical: ProfileTechnicalFootball | null;
};

export async function getProfileBlocks(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<ProfileBlocks>> {
  const [morphoRes, conditionalRes, technicalRes] = await Promise.all([
    supabase.from("profile_morpho").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profile_conditional").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("profile_technical_football")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (morphoRes.error) return { data: null, error: mapDbError(morphoRes.error, "getProfileBlocks:morpho") };
  if (conditionalRes.error) return { data: null, error: mapDbError(conditionalRes.error, "getProfileBlocks:conditional") };
  if (technicalRes.error) return { data: null, error: mapDbError(technicalRes.error, "getProfileBlocks:technical") };

  return {
    data: {
      morpho: (morphoRes.data as ProfileMorpho | null),
      conditional: (conditionalRes.data as ProfileConditional | null),
      technical: (technicalRes.data as ProfileTechnicalFootball | null),
    },
    error: null,
  };
}

export type MorphoInput = Partial<Omit<ProfileMorpho, "user_id" | "created_at" | "updated_at">>;

export async function updateMorpho(
  supabase: SupabaseClient,
  userId: string,
  data: MorphoInput,
): Promise<ApiResult<ProfileMorpho>> {
  const { data: result, error } = await supabase
    .from("profile_morpho")
    .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "updateMorpho") };
  return { data: result as ProfileMorpho, error: null };
}

export type ConditionalInput = Partial<Omit<ProfileConditional, "user_id" | "created_at" | "updated_at">>;

export async function updateConditional(
  supabase: SupabaseClient,
  userId: string,
  data: ConditionalInput,
): Promise<ApiResult<ProfileConditional>> {
  const { data: result, error } = await supabase
    .from("profile_conditional")
    .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "updateConditional") };
  return { data: result as ProfileConditional, error: null };
}

export type TechnicalInput = Partial<Omit<ProfileTechnicalFootball, "user_id" | "created_at" | "updated_at">>;

export async function updateTechnicalFootball(
  supabase: SupabaseClient,
  userId: string,
  data: TechnicalInput,
): Promise<ApiResult<ProfileTechnicalFootball>> {
  const { data: result, error } = await supabase
    .from("profile_technical_football")
    .upsert({ user_id: userId, ...data }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) return { data: null, error: mapDbError(error, "updateTechnicalFootball") };
  return { data: result as ProfileTechnicalFootball, error: null };
}

const BLOCK_TABLE = {
  morpho: "profile_morpho",
  conditional: "profile_conditional",
  technical_football: "profile_technical_football",
} as const;

export async function updateVisibility(
  supabase: SupabaseClient,
  userId: string,
  block: "morpho" | "conditional" | "technical_football",
  level: VisibilityLevel,
): Promise<ApiResult<null>> {
  const table = BLOCK_TABLE[block];
  const { error } = await supabase
    .from(table)
    .upsert({ user_id: userId, visibility: level }, { onConflict: "user_id" });
  if (error) return { data: null, error: mapDbError(error, `updateVisibility:${block}`) };
  return { data: null, error: null };
}
