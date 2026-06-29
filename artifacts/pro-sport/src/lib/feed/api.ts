import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";

type ApiResult<T> = { data: T | null; error: string | null };
type PaginatedResult<T> = { data: T | null; error: string | null; nextCursor: string | null };

export interface FeedMatch {
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
  sport: { id: string; name: string } | null;
  organizer: { id: string; full_name: string | null; avatar_url: string | null } | null;
  participants_count: number;
  cancha_booking_id: string | null;
}

export interface FeedFilters {
  city?: string;
  sport_id?: string;
  skill_level?: string;
  status?: string;
}

const DEFAULT_LIMIT = 20;

// Build a FeedMatch array from raw rows + a participant count map
function buildFeedMatches(
  rows: Array<{
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
  }>,
  countMap: Map<string, number>
): FeedMatch[] {
  return rows.map((row) => ({
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
    participants_count: countMap.get(row.id) ?? 0,
  }));
}

async function fetchParticipantCounts(
  supabase: SupabaseClient,
  matchIds: string[]
): Promise<Map<string, number>> {
  const countMap = new Map<string, number>();
  if (matchIds.length === 0) return countMap;

  const { data, error } = await supabase
    .from("match_participants")
    .select("match_id")
    .in("match_id", matchIds)
    .eq("status", "joined");

  if (error || !data) return countMap;
  for (const row of data as Array<{ match_id: string }>) {
    countMap.set(row.match_id, (countMap.get(row.match_id) ?? 0) + 1);
  }
  return countMap;
}

// ── getFeedMatches — paginated list of open matches for discovery ─────────────
export async function getFeedMatches(
  supabase: SupabaseClient,
  filters: FeedFilters,
  options: { cursor?: string; limit?: number }
): Promise<PaginatedResult<FeedMatch[]>> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const status = filters.status ?? "open";
  const now = new Date().toISOString();

  let query = supabase
    .from("matches")
    .select(
      "id, title, starts_at, duration_minutes, city, location, max_players, status, organizer_id, is_public, skill_level, cancha_booking_id, sports(id, name), profiles!organizer_id(id, full_name, avatar_url)"
    )
    .eq("status", status)
    .gte("starts_at", now)
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (options.cursor) {
    query = query.gt("starts_at", options.cursor);
  }
  if (filters.city) {
    query = query.ilike("city", `%${filters.city}%`);
  }
  if (filters.sport_id) {
    query = query.eq("sport_id", filters.sport_id);
  }
  if (filters.skill_level) {
    query = query.eq("skill_level", filters.skill_level);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: mapDbError(error, "feed_matches"), nextCursor: null };

  const rows = (data ?? []) as unknown as Parameters<typeof buildFeedMatches>[0];
  const matchIds = rows.map((r) => r.id);
  const countMap = await fetchParticipantCounts(supabase, matchIds);
  const matches = buildFeedMatches(rows, countMap);

  const nextCursor = matches.length === limit ? matches[matches.length - 1].starts_at : null;
  return { data: matches, error: null, nextCursor };
}

// ── getMyMatches — matches where user is organizer or participant ──────────────
export async function getMyMatches(
  supabase: SupabaseClient,
  userId: string,
  options: { cursor?: string; limit?: number }
): Promise<PaginatedResult<FeedMatch[]>> {
  const limit = options.limit ?? DEFAULT_LIMIT;

  // Fetch match IDs where user is a participant (joined / attended)
  const { data: participations, error: partErr } = await supabase
    .from("match_participants")
    .select("match_id")
    .eq("user_id", userId)
    .in("status", ["joined", "attended"]);

  if (partErr) return { data: null, error: mapDbError(partErr, "my_matches_participants"), nextCursor: null };

  const participantMatchIds = (participations ?? []).map(
    (p: { match_id: string }) => p.match_id
  );

  let query = supabase
    .from("matches")
    .select(
      "id, title, starts_at, duration_minutes, city, location, max_players, status, cancha_booking_id, sports(id, name), profiles!organizer_id(id, full_name, avatar_url)"
    )
    .order("starts_at", { ascending: true })
    .limit(limit);

  // Filter: organizer OR participant
  if (participantMatchIds.length > 0) {
    query = query.or(
      `organizer_id.eq.${userId},id.in.(${participantMatchIds.join(",")})`
    );
  } else {
    query = query.eq("organizer_id", userId);
  }

  if (options.cursor) {
    query = query.gt("starts_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: mapDbError(error, "my_matches"), nextCursor: null };

  const rows = (data ?? []) as unknown as Parameters<typeof buildFeedMatches>[0];
  const matchIds = rows.map((r) => r.id);
  const countMap = await fetchParticipantCounts(supabase, matchIds);
  const matches = buildFeedMatches(rows, countMap);

  const nextCursor = matches.length === limit ? matches[matches.length - 1].starts_at : null;
  return { data: matches, error: null, nextCursor };
}

// ── getOrganizedMatches — paginated matches where user is organizer ───────────
export async function getOrganizedMatches(
  supabase: SupabaseClient,
  userId: string,
  options: { cursor?: string; limit?: number }
): Promise<PaginatedResult<FeedMatch[]>> {
  const limit = options.limit ?? DEFAULT_LIMIT;

  let query = supabase
    .from("matches")
    .select(
      "id, title, starts_at, duration_minutes, city, location, max_players, status, organizer_id, is_public, skill_level, cancha_booking_id, sports(id, name), profiles!organizer_id(id, full_name, avatar_url)"
    )
    .eq("organizer_id", userId)
    .order("starts_at", { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt("starts_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: mapDbError(error, "organized_matches"), nextCursor: null };

  const rows = (data ?? []) as unknown as Parameters<typeof buildFeedMatches>[0];

  if (rows.length > limit) {
    const sliced = rows.slice(0, limit);
    const matchIds = sliced.map((r) => r.id);
    const countMap = await fetchParticipantCounts(supabase, matchIds);
    const matches = buildFeedMatches(sliced, countMap);
    return { data: matches, error: null, nextCursor: matches[matches.length - 1].starts_at };
  }

  const matchIds = rows.map((r) => r.id);
  const countMap = await fetchParticipantCounts(supabase, matchIds);
  const matches = buildFeedMatches(rows, countMap);
  return { data: matches, error: null, nextCursor: null };
}

// ── getParticipatingMatches — paginated matches where user is a participant (not organizer) ──
export async function getParticipatingMatches(
  supabase: SupabaseClient,
  userId: string,
  options: { cursor?: string; limit?: number }
): Promise<PaginatedResult<FeedMatch[]>> {
  const limit = options.limit ?? DEFAULT_LIMIT;

  // Fetch all match IDs where user is an active participant
  const { data: participations, error: partErr } = await supabase
    .from("match_participants")
    .select("match_id")
    .eq("user_id", userId)
    .in("status", ["joined", "attended"]);

  if (partErr) return { data: null, error: mapDbError(partErr, "participating_matches_part"), nextCursor: null };

  const participantMatchIds = (participations ?? []).map(
    (p: { match_id: string }) => p.match_id
  );

  if (participantMatchIds.length === 0) {
    return { data: [], error: null, nextCursor: null };
  }

  let query = supabase
    .from("matches")
    .select(
      "id, title, starts_at, duration_minutes, city, location, max_players, status, organizer_id, is_public, skill_level, cancha_booking_id, sports(id, name), profiles!organizer_id(id, full_name, avatar_url)"
    )
    .in("id", participantMatchIds)
    .neq("organizer_id", userId)
    .order("starts_at", { ascending: false })
    .limit(limit + 1);

  if (options.cursor) {
    query = query.lt("starts_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) return { data: null, error: mapDbError(error, "participating_matches"), nextCursor: null };

  const rows = (data ?? []) as unknown as Parameters<typeof buildFeedMatches>[0];

  if (rows.length > limit) {
    const sliced = rows.slice(0, limit);
    const matchIds = sliced.map((r) => r.id);
    const countMap = await fetchParticipantCounts(supabase, matchIds);
    const matches = buildFeedMatches(sliced, countMap);
    return { data: matches, error: null, nextCursor: matches[matches.length - 1].starts_at };
  }

  const matchIds = rows.map((r) => r.id);
  const countMap = await fetchParticipantCounts(supabase, matchIds);
  const matches = buildFeedMatches(rows, countMap);
  return { data: matches, error: null, nextCursor: null };
}

// ── getFeedEnrichmentData — participant counts, user statuses, friends, booking→cancha mapping ──
export interface FeedEnrichmentData {
  counts: Map<string, number>;
  matchUsers: Map<string, Set<string>>;
  statuses: Map<string, string>;
  friends: Set<string>;
  m2c: Map<string, string>;
}

export async function getFeedEnrichmentData(
  supabase: SupabaseClient,
  matchIds: string[],
  bookingIds: string[],
  userId: string | undefined,
): Promise<FeedEnrichmentData> {
  if (matchIds.length === 0) {
    return { counts: new Map(), matchUsers: new Map(), statuses: new Map(), friends: new Set(), m2c: new Map() };
  }

  const [{ data: countData }, { data: myPartsData }, friendsRes, { data: bookingsData }] = await Promise.all([
    supabase.from("match_participants").select("match_id, user_id").in("match_id", matchIds).eq("status", "joined"),
    userId
      ? supabase.from("match_participants").select("match_id, status").in("match_id", matchIds).eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    userId
      ? supabase.from("friendships").select("requester_id, addressee_id").or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).eq("status", "accepted")
      : Promise.resolve({ data: [] }),
    bookingIds.length > 0
      ? supabase.from("cancha_bookings").select("id, cancha_id").in("id", bookingIds)
      : Promise.resolve({ data: [] }),
  ]);

  const counts = new Map<string, number>();
  const matchUsers = new Map<string, Set<string>>();
  (countData ?? []).forEach((r: { match_id: string; user_id: string }) => {
    counts.set(r.match_id, (counts.get(r.match_id) ?? 0) + 1);
    if (!matchUsers.has(r.match_id)) matchUsers.set(r.match_id, new Set());
    matchUsers.get(r.match_id)!.add(r.user_id);
  });

  const statuses = new Map<string, string>();
  ((myPartsData ?? []) as { match_id: string; status: string }[]).forEach((r) => statuses.set(r.match_id, r.status));

  const friends = new Set<string>();
  ((friendsRes.data ?? []) as { requester_id: string; addressee_id: string }[]).forEach((f) => {
    if (f.requester_id !== userId) friends.add(f.requester_id);
    if (f.addressee_id !== userId) friends.add(f.addressee_id);
  });

  const b2c = new Map<string, string>();
  (bookingsData ?? []).forEach((b: { id: string; cancha_id: string }) => b2c.set(b.id, b.cancha_id));
  const m2c = new Map<string, string>();

  return { counts, matchUsers, statuses, friends, m2c };
}

// ── getMatchesWithBookings — matches linked to cancha_bookings for a user ──────
export async function getMatchesWithBookings(
  supabase: SupabaseClient,
  userId: string
): Promise<ApiResult<FeedMatch[]>> {
  // Find all bookings for this user
  const { data: bookings, error: bookErr } = await supabase
    .from("cancha_bookings")
    .select("id")
    .eq("booked_by", userId);

  if (bookErr) return { data: null, error: mapDbError(bookErr, "matches_with_bookings") };

  const bookingIds = (bookings ?? []).map((b: { id: string }) => b.id);
  if (bookingIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id, title, starts_at, duration_minutes, city, location, max_players, status, cancha_booking_id, sports(id, name), profiles!organizer_id(id, full_name, avatar_url)"
    )
    .in("cancha_booking_id", bookingIds)
    .order("starts_at", { ascending: false });

  if (error) return { data: null, error: mapDbError(error, "matches_with_bookings") };

  const rows = (data ?? []) as unknown as Parameters<typeof buildFeedMatches>[0];
  const matchIds = rows.map((r) => r.id);
  const countMap = await fetchParticipantCounts(supabase, matchIds);
  const matches = buildFeedMatches(rows, countMap);

  return { data: matches, error: null };
}
