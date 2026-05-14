import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { FeedMatch } from "@/lib/feed/api";

// Note: src/lib/matches/conflicts.ts handles conflict detection logic.
// This file provides CRUD and participant operations — no overlap.

type ApiResult<T> = { data: T | null; error: string | null };

export interface MatchInput {
  title: string;
  sport_id: string;
  city: string;
  location: string;
  starts_at: string;
  duration_minutes: number;
  max_players: number;
  description?: string;
  skill_level?: string;
  cancha_booking_id?: string | null;
}

export interface MatchFilters {
  city?: string;
  sport_id?: string;
  status?: string;
  organizer_id?: string;
}

export interface MatchParticipantRow {
  user_id: string;
  status: string;
  profile: { full_name: string | null; avatar_url: string | null } | null;
}

// ── createMatch ───────────────────────────────────────────────────────────────
export async function createMatch(
  supabase: SupabaseClient,
  input: MatchInput,
  organizerId: string
): Promise<ApiResult<{ id: string }>> {
  const { data, error } = await supabase
    .from("matches")
    .insert({
      title: input.title,
      sport_id: input.sport_id,
      city: input.city,
      location: input.location,
      starts_at: input.starts_at,
      duration_minutes: input.duration_minutes,
      max_players: input.max_players,
      description: input.description ?? null,
      skill_level: input.skill_level ?? null,
      cancha_booking_id: input.cancha_booking_id ?? null,
      organizer_id: organizerId,
      status: "open",
    })
    .select("id")
    .single();

  if (error) return { data: null, error: mapDbError(error, "match_create") };
  return { data: data as { id: string }, error: null };
}

// ── updateMatch ───────────────────────────────────────────────────────────────
export async function updateMatch(
  supabase: SupabaseClient,
  matchId: string,
  input: Partial<MatchInput>
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("matches")
    .update({
      ...(input.title !== undefined && { title: input.title }),
      ...(input.sport_id !== undefined && { sport_id: input.sport_id }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.starts_at !== undefined && { starts_at: input.starts_at }),
      ...(input.duration_minutes !== undefined && { duration_minutes: input.duration_minutes }),
      ...(input.max_players !== undefined && { max_players: input.max_players }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.skill_level !== undefined && { skill_level: input.skill_level }),
      ...(input.cancha_booking_id !== undefined && { cancha_booking_id: input.cancha_booking_id }),
    })
    .eq("id", matchId);

  if (error) return { data: null, error: mapDbError(error, "match_update") };
  return { data: null, error: null };
}

// ── cancelMatch — sets status to 'cancelled'; checks user is organizer ────────
export async function cancelMatch(
  supabase: SupabaseClient,
  matchId: string,
  userId: string
): Promise<ApiResult<null>> {
  // Verify the user is the organizer before cancelling
  const { data: match, error: fetchErr } = await supabase
    .from("matches")
    .select("organizer_id")
    .eq("id", matchId)
    .maybeSingle();

  if (fetchErr) return { data: null, error: mapDbError(fetchErr, "match_cancel_fetch") };
  if (!match) return { data: null, error: "No encontramos el partido." };
  if ((match as { organizer_id: string }).organizer_id !== userId) {
    return { data: null, error: "No tenés permisos para cancelar este partido." };
  }

  const { error } = await supabase
    .from("matches")
    .update({ status: "cancelled" })
    .eq("id", matchId);

  if (error) return { data: null, error: mapDbError(error, "match_cancel") };
  return { data: null, error: null };
}

// ── getMatchById — fetch a single match with sport and organizer profile ───────
export async function getMatchById(
  supabase: SupabaseClient,
  matchId: string
): Promise<ApiResult<FeedMatch>> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, title, starts_at, duration_minutes, city, location, max_players, status, organizer_id, is_public, skill_level, cancha_booking_id, sports(id, name), profiles!organizer_id(id, full_name, avatar_url)"
    )
    .eq("id", matchId)
    .maybeSingle();

  if (error) return { data: null, error: mapDbError(error, "match_get") };
  if (!data) return { data: null, error: "No encontramos el partido." };

  const row = data as unknown as {
    id: string;
    title: string;
    starts_at: string;
    duration_minutes: number;
    city: string;
    location: string;
    max_players: number;
    status: string;
    organizer_id: string;
    is_public: boolean;
    skill_level: string | null;
    cancha_booking_id: string | null;
    sports: { id: string; name: string } | null;
    profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
  };

  // Fetch participant count separately
  const { count } = await supabase
    .from("match_participants")
    .select("user_id", { count: "exact", head: true })
    .eq("match_id", matchId)
    .eq("status", "joined");

  const match: FeedMatch = {
    id: row.id,
    title: row.title,
    starts_at: row.starts_at,
    duration_minutes: row.duration_minutes,
    city: row.city,
    location: row.location,
    max_players: row.max_players,
    status: row.status,
    organizer_id: row.organizer_id,
    is_public: row.is_public,
    skill_level: row.skill_level ?? null,
    cancha_booking_id: row.cancha_booking_id,
    sport: row.sports ?? null,
    organizer: row.profiles ?? null,
    participants_count: count ?? 0,
  };

  return { data: match, error: null };
}

// ── getMatchParticipants — list participants with profile info ─────────────────
export async function getMatchParticipants(
  supabase: SupabaseClient,
  matchId: string
): Promise<ApiResult<MatchParticipantRow[]>> {
  const { data, error } = await supabase
    .from("match_participants")
    .select("user_id, status, profiles(full_name, avatar_url)")
    .eq("match_id", matchId);

  if (error) return { data: null, error: mapDbError(error, "match_participants") };

  const rows = (data ?? []) as unknown as Array<{
    user_id: string;
    status: string;
    profiles: { full_name: string | null; avatar_url: string | null } | null;
  }>;

  return {
    data: rows.map((r) => ({
      user_id: r.user_id,
      status: r.status,
      profile: r.profiles ?? null,
    })),
    error: null,
  };
}

// ── joinMatch — upsert participant with status 'joined' ───────────────────────
export async function joinMatch(
  supabase: SupabaseClient,
  matchId: string,
  userId: string
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_participants")
    .upsert(
      { match_id: matchId, user_id: userId, status: "joined" },
      { onConflict: "match_id,user_id" }
    );

  if (error) return { data: null, error: mapDbError(error, "match_join") };
  return { data: null, error: null };
}

// ── leaveMatch — set participant status to 'left' ─────────────────────────────
export async function leaveMatch(
  supabase: SupabaseClient,
  matchId: string,
  userId: string
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_participants")
    .update({ status: "left" })
    .eq("match_id", matchId)
    .eq("user_id", userId);

  if (error) return { data: null, error: mapDbError(error, "match_leave") };
  return { data: null, error: null };
}
