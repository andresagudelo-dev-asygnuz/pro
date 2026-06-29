import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";

export type MatchStatus =
  | "programado"
  | "en_juego"
  | "finalizado"
  | "w_o"
  | "cancelado";

export type MatchEventType =
  | "gol"
  | "auto_gol"
  | "amarilla"
  | "roja"
  | "sustitucion";

export type MatchRow = {
  id: string;
  tournament_id: string;
  round: number;
  group_code: string | null;
  fixture_order: number | null;
  home_registration_id: string | null;
  away_registration_id: string | null;
  scheduled_at: string | null;
  venue: string | null;
  home_score: number | null;
  away_score: number | null;
  status: MatchStatus;
  correction_window_ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MatchEventRow = {
  id: string;
  match_id: string;
  event_type: MatchEventType;
  minute: number | null;
  player_id: string | null;
  team_side: "home" | "away" | null;
  notes: string | null;
  created_at: string;
};

export type StandingRow = {
  tournament_id: string;
  registration_id: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

function mapResultError(
  error: { code?: string; message?: string } | null,
  fallbackContext = "match",
): string {
  if (!error) return "Error desconocido";
  const code = error.code ?? "";
  const msg = error.message ?? "";
  if (code === "P0001" && /tournament_not_ready_for_results/i.test(msg)) {
    return "El torneo no está en estado para cargar resultados.";
  }
  if (code === "P0002" && /tournament_not_found/i.test(msg)) {
    return "El torneo no existe o fue eliminado.";
  }
  if (code === "42501" || /permission|policy/i.test(msg)) {
    return "No tenés permisos para modificar este partido.";
  }
  return mapDbError(error, fallbackContext);
}

export async function createMatch(
  supabase: SupabaseClient,
  input: {
    tournamentId: string;
    round: number;
    groupCode?: string | null;
    fixtureOrder?: number | null;
    homeRegistrationId: string;
    awayRegistrationId: string;
    scheduledAt?: string | null;
    venue?: string | null;
  },
): Promise<{ error: string | null; data: MatchRow | null }> {
  const { data, error } = await supabase
    .from("tournament_matches")
    .insert({
      tournament_id: input.tournamentId,
      round: input.round,
      group_code: input.groupCode ?? null,
      fixture_order: input.fixtureOrder ?? null,
      home_registration_id: input.homeRegistrationId,
      away_registration_id: input.awayRegistrationId,
      scheduled_at: input.scheduledAt ?? null,
      venue: input.venue ?? null,
    })
    .select()
    .single();

  if (error) return { error: mapResultError(error, "create_match"), data: null };
  return { error: null, data: data as MatchRow };
}

export async function listMatches(
  supabase: SupabaseClient,
  tournamentId: string,
): Promise<{ error: string | null; data: MatchRow[] }> {
  const { data, error } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("round", { ascending: true })
    .order("fixture_order", { ascending: true, nullsFirst: false })
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (error) return { error: mapResultError(error, "list_matches"), data: [] };
  return { error: null, data: (data ?? []) as MatchRow[] };
}

export async function getMatchById(
  supabase: SupabaseClient,
  matchId: string,
): Promise<{ error: string | null; data: MatchRow | null }> {
  const { data, error } = await supabase
    .from("tournament_matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (error) return { error: mapResultError(error, "get_match"), data: null };
  return { error: null, data: data as MatchRow | null };
}

export async function recordResult(
  supabase: SupabaseClient,
  input: {
    matchId: string;
    homeScore: number;
    awayScore: number;
    status: MatchStatus;
  },
): Promise<{ error: string | null; data: MatchRow | null }> {
  const { data, error } = await supabase
    .from("tournament_matches")
    .update({
      home_score: input.homeScore,
      away_score: input.awayScore,
      status: input.status,
    })
    .eq("id", input.matchId)
    .select()
    .single();

  if (error) return { error: mapResultError(error, "record_result"), data: null };
  return { error: null, data: data as MatchRow };
}

export async function addMatchEvent(
  supabase: SupabaseClient,
  input: {
    matchId: string;
    eventType: MatchEventType;
    minute?: number | null;
    playerId?: string | null;
    teamSide?: "home" | "away" | null;
    notes?: string | null;
  },
): Promise<{ error: string | null; data: MatchEventRow | null }> {
  const { data, error } = await supabase
    .from("match_events")
    .insert({
      match_id: input.matchId,
      event_type: input.eventType,
      minute: input.minute ?? null,
      player_id: input.playerId ?? null,
      team_side: input.teamSide ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) return { error: mapResultError(error, "add_match_event"), data: null };
  return { error: null, data: data as MatchEventRow };
}

export async function listMatchEvents(
  supabase: SupabaseClient,
  matchId: string,
): Promise<{ error: string | null; data: MatchEventRow[] }> {
  const { data, error } = await supabase
    .from("match_events")
    .select("*")
    .eq("match_id", matchId)
    .order("minute", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) return { error: mapResultError(error, "list_match_events"), data: [] };
  return { error: null, data: (data ?? []) as MatchEventRow[] };
}

export type MatchWithNames = MatchRow & {
  home_team_name: string | null;
  away_team_name: string | null;
  home_player_name: string | null;
  away_player_name: string | null;
};

type ApiResult<T> = { error: string | null; data: T | null };

export async function listMatchesWithNames(
  supabase: SupabaseClient,
  tournamentId: string,
): Promise<ApiResult<MatchWithNames[]>> {
  const { data, error } = await supabase
    .from("tournament_matches")
    .select(`
      id, tournament_id, round, group_code, fixture_order,
      home_registration_id, away_registration_id, scheduled_at, venue,
      home_score, away_score, status, correction_window_ends_at,
      created_at, updated_at,
      home:tournament_registrations!tournament_matches_home_registration_id_fkey(
        team:teams(name),
        profile:profiles(full_name, username)
      ),
      away:tournament_registrations!tournament_matches_away_registration_id_fkey(
        team:teams(name),
        profile:profiles(full_name, username)
      )
    `)
    .eq("tournament_id", tournamentId)
    .order("round")
    .order("fixture_order", { nullsFirst: false });

  if (error) return { data: null, error: mapDbError(error, "matches_with_names") };

  type RawMatch = { id: string; tournament_id: string; round: number; group_code: string | null; fixture_order: number | null; home_registration_id: string | null; away_registration_id: string | null; scheduled_at: string | null; venue: string | null; home_score: number | null; away_score: number | null; status: string; correction_window_ends_at: string | null; created_at: string; updated_at: string; home: { team: { name: string } | null; profile: { full_name: string | null; username: string | null } | null } | null; away: { team: { name: string } | null; profile: { full_name: string | null; username: string | null } | null } | null };
  const rows: MatchWithNames[] = ((data ?? []) as unknown as RawMatch[]).map((m) => ({
    id: m.id,
    tournament_id: m.tournament_id,
    round: m.round,
    group_code: m.group_code,
    fixture_order: m.fixture_order,
    home_registration_id: m.home_registration_id,
    away_registration_id: m.away_registration_id,
    scheduled_at: m.scheduled_at,
    venue: m.venue,
    home_score: m.home_score,
    away_score: m.away_score,
    status: m.status as MatchStatus,
    correction_window_ends_at: m.correction_window_ends_at,
    created_at: m.created_at,
    updated_at: m.updated_at,
    home_team_name: m.home?.team?.name ?? null,
    away_team_name: m.away?.team?.name ?? null,
    home_player_name: m.home?.profile?.full_name ?? m.home?.profile?.username ?? null,
    away_player_name: m.away?.profile?.full_name ?? m.away?.profile?.username ?? null,
  }));
  return { data: rows, error: null };
}

export async function listStandings(
  supabase: SupabaseClient,
  tournamentId: string,
): Promise<{ error: string | null; data: StandingRow[] }> {
  const { data, error } = await supabase
    .from("standings")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("points", { ascending: false })
    .order("goal_difference", { ascending: false })
    .order("goals_for", { ascending: false });

  if (error) return { error: mapResultError(error, "list_standings"), data: [] };
  return { error: null, data: (data ?? []) as StandingRow[] };
}
