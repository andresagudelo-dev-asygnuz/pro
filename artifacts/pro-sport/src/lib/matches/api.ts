import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { FeedMatch } from "@/lib/feed/api";
import type { Match } from "@/lib/types/db";

// Note: src/lib/matches/conflicts.ts handles conflict detection logic.
// This file provides CRUD and participant operations — no overlap.

type ApiResult<T> = { data: T | null; error: string | null };

export interface MatchInput {
  title: string;
  sport_id: string;
  city: string;
  location: string | null;
  starts_at: string;
  duration_minutes: number;
  max_players: number;
  is_public?: boolean;
  description?: string | null;
  skill_level?: string | null;
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
): Promise<ApiResult<{ id: string; title: string }>> {
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
    .select("id, title")
    .single();

  if (error) return { data: null, error: mapDbError(error, "match_create") };
  return { data: data as { id: string; title: string }, error: null };
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
      ...(input.is_public !== undefined && { is_public: input.is_public }),
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

// ── requestJoinMatch — create a "requested" participant entry ────────────────
export async function requestJoinMatch(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_participants")
    .insert({ match_id: matchId, user_id: userId, status: "requested" });
  if (error) return { data: null, error: mapDbError(error, "requestJoinMatch") };
  return { data: null, error: null };
}

// ── cancelJoinRequest — remove a pending join request ────────────────────────
export async function cancelJoinRequest(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_participants")
    .delete()
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .eq("status", "requested");
  if (error) return { data: null, error: mapDbError(error, "cancelJoinRequest") };
  return { data: null, error: null };
}

// ── getRawMatchById — returns full Match row (for edit forms) ─────────────────
export async function getRawMatchById(
  supabase: SupabaseClient,
  matchId: string,
): Promise<ApiResult<Match>> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (error) return { data: null, error: mapDbError(error, "getRawMatchById") };
  return { data: data as Match | null, error: null };
}

// ── resetParticipantConfirmations — clear confirmed_at after schedule change ──
export async function resetParticipantConfirmations(
  supabase: SupabaseClient,
  matchId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_participants")
    .update({ confirmed_at: null })
    .eq("match_id", matchId)
    .not("confirmed_at", "is", null);
  if (error) return { data: null, error: mapDbError(error, "resetConfirmations") };
  return { data: null, error: null };
}

// ── getJoinedParticipantIds — user_ids of joined participants, excluding one user
export async function getJoinedParticipantIds(
  supabase: SupabaseClient,
  matchId: string,
  excludeUserId: string,
): Promise<ApiResult<string[]>> {
  const { data, error } = await supabase
    .from("match_participants")
    .select("user_id")
    .eq("match_id", matchId)
    .neq("user_id", excludeUserId)
    .eq("status", "joined");
  if (error) return { data: null, error: mapDbError(error, "getJoinedParticipantIds") };
  return { data: (data ?? []).map((r: { user_id: string }) => r.user_id), error: null };
}

// ── upsertMatchRatings — bulk upsert ratings after match ends ─────────────────
export async function upsertMatchRatings(
  supabase: SupabaseClient,
  rows: { match_id: string; rater_id: string; rated_id: string; rating: number }[],
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_ratings")
    .upsert(rows, { onConflict: "match_id,rater_id,rated_id" });
  if (error) return { data: null, error: mapDbError(error, "upsertMatchRatings") };

  // Recalculate ratings for affected users
  const uniqueRatedIds = [...new Set(rows.map(r => r.rated_id))];
  for (const userId of uniqueRatedIds) {
    const { data: ratingsData } = await supabase
      .from("match_ratings")
      .select("rating")
      .eq("rated_id", userId);
    
    if (ratingsData && ratingsData.length > 0) {
      const count = ratingsData.length;
      const sum = ratingsData.reduce((acc, row) => acc + row.rating, 0);
      const avg = sum / count;

      await supabase
        .from("profiles")
        .update({ rating_avg: avg, rating_count: count })
        .eq("id", userId);
    }
  }

  return { data: null, error: null };
}

// ── getMatchParticipantsRaw — full MatchParticipant rows ordered by joined_at ──
export async function getMatchParticipantsRaw(
  supabase: SupabaseClient,
  matchId: string,
): Promise<ApiResult<import("@/lib/types/db").MatchParticipant[]>> {
  const { data, error } = await supabase
    .from("match_participants")
    .select("*")
    .eq("match_id", matchId)
    .order("joined_at");
  if (error) return { data: null, error: mapDbError(error, "getMatchParticipantsRaw") };
  return { data: (data ?? []) as import("@/lib/types/db").MatchParticipant[], error: null };
}

// ── getMatchWaitlistRaw — full MatchWaitlist rows ordered by joined_at ─────
export async function getMatchWaitlistRaw(
  supabase: SupabaseClient,
  matchId: string,
): Promise<ApiResult<import("@/lib/types/db").MatchWaitlist[]>> {
  const { data, error } = await supabase
    .from("match_waitlist")
    .select("*")
    .eq("match_id", matchId)
    .order("joined_at");
  if (error) return { data: null, error: mapDbError(error, "getMatchWaitlistRaw") };
  return { data: (data ?? []) as import("@/lib/types/db").MatchWaitlist[], error: null };
}

// ── joinMatchDirect — insert participant with status 'joined' (no conflict check) ──
export async function joinMatchDirect(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_participants")
    .insert({ match_id: matchId, user_id: userId, status: "joined" });
  if (error) return { data: null, error: mapDbError(error, "joinMatchDirect") };
  return { data: null, error: null };
}

// ── leaveMatchDirect — delete participant row ──────────────────────────────
export async function leaveMatchDirect(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_participants")
    .delete()
    .eq("match_id", matchId)
    .eq("user_id", userId);
  if (error) return { data: null, error: mapDbError(error, "leaveMatchDirect") };
  return { data: null, error: null };
}

// ── confirmMatchAttendance — set confirmed_at for a participant ────────────
export async function confirmMatchAttendance(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_participants")
    .update({ confirmed_at: new Date().toISOString() })
    .eq("match_id", matchId)
    .eq("user_id", userId);
  if (error) return { data: null, error: mapDbError(error, "confirmMatchAttendance") };
  return { data: null, error: null };
}

// ── updateParticipantAttendance — set final attendance status (attended/no_show) ──
export async function updateParticipantAttendance(
  supabase: SupabaseClient,
  matchId: string,
  participantUserId: string,
  status: "attended" | "no_show",
): Promise<ApiResult<null>> {
  const { error: updateErr } = await supabase
    .from("match_participants")
    .update({ status })
    .eq("match_id", matchId)
    .eq("user_id", participantUserId);

  if (updateErr) return { data: null, error: mapDbError(updateErr, "updateParticipantAttendance") };

  // Auto-increment matches_played if attended
  if (status === "attended") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("matches_played")
      .eq("id", participantUserId)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ matches_played: (profile.matches_played || 0) + 1 })
        .eq("id", participantUserId);
    }
  }

  return { data: null, error: null };
}

// ── cancelMatchById — set match status to 'cancelled' ─────────────────────
export async function cancelMatchById(
  supabase: SupabaseClient,
  matchId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("matches")
    .update({ status: "cancelled" })
    .eq("id", matchId);
  if (error) return { data: null, error: mapDbError(error, "cancelMatchById") };
  return { data: null, error: null };
}

// ── acceptParticipantRequest — promote 'requested' → 'joined' ─────────────
export async function acceptParticipantRequest(
  supabase: SupabaseClient,
  matchId: string,
  participantUserId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_participants")
    .update({ status: "joined" })
    .eq("match_id", matchId)
    .eq("user_id", participantUserId);
  if (error) return { data: null, error: mapDbError(error, "acceptParticipantRequest") };
  return { data: null, error: null };
}

// ── rejectParticipantRequest — delete a pending request ───────────────────
export async function rejectParticipantRequest(
  supabase: SupabaseClient,
  matchId: string,
  participantUserId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_participants")
    .delete()
    .eq("match_id", matchId)
    .eq("user_id", participantUserId);
  if (error) return { data: null, error: mapDbError(error, "rejectParticipantRequest") };
  return { data: null, error: null };
}

// ── toggleWaitlist — join or leave the match waitlist ─────────────────────
export async function joinWaitlist(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("match_waitlist")
    .insert({ match_id: matchId, user_id: userId });
  if (error) return { data: null, error: mapDbError(error, "joinWaitlist") };
  return { data: null, error: null };
}

export async function leaveWaitlist(
  supabase: SupabaseClient,
  entryId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase.from("match_waitlist").delete().eq("id", entryId);
  if (error) return { data: null, error: mapDbError(error, "leaveWaitlist") };
  return { data: null, error: null };
}

// ── upsertMatchChatAccess — ensure conversation row + participant membership ──
export async function upsertMatchChatAccess(
  supabase: SupabaseClient,
  matchId: string,
  matchTitle: string,
  userId: string,
): Promise<ApiResult<null>> {
  const { error: convErr } = await supabase
    .from("conversations")
    .insert(
      { id: matchId, type: "match", reference_id: matchId, title: matchTitle, subtitle: "Chat del partido" }
    );
  if (convErr && convErr.code !== "23505") return { data: null, error: mapDbError(convErr, "upsertMatchConv") };
  
  const { error: partErr } = await supabase
    .from("conversation_participants")
    .insert(
      { conversation_id: matchId, user_id: userId }
    );
  if (partErr && partErr.code !== "23505") return { data: null, error: mapDbError(partErr, "upsertMatchConvPart") };
  
  return { data: null, error: null };
}

// ── getMatchMessages — paginated messages for a match conversation ─────────
export async function getMatchMessages(
  supabase: SupabaseClient,
  matchId: string,
  limit = 200,
): Promise<ApiResult<Array<{ id: string; sender_id: string; content: string; created_at: string }>>> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at")
    .eq("conversation_id", matchId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) return { data: null, error: mapDbError(error, "getMatchMessages") };
  return { data: (data ?? []) as Array<{ id: string; sender_id: string; content: string; created_at: string }>, error: null };
}

// ── createMatchSystemMessage — insert a system/update message in match chat ───
export async function createMatchSystemMessage(
  supabase: SupabaseClient,
  matchId: string,
  senderId: string,
  content: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: matchId, sender_id: senderId, content });
  if (error) return { data: null, error: mapDbError(error, "createMatchSystemMessage") };
  return { data: null, error: null };
}
