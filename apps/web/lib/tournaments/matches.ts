import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "../errors/map-db-error";
import {
  matchCreateSchema,
  matchResultSchema,
  matchEventSchema,
  type MatchCreateInput,
  type MatchResultInput,
  type MatchEventInput,
} from "../validation/schemas";

/**
 * HU-006 / RF-005 — Resultados y tabla de posiciones.
 *
 * Contrato:
 *   - `createMatch` y `recordResult` requieren que el caller sea el owner
 *     del torneo. El enforcement real está en RLS + triggers.
 *   - Al pasar un match a `finalizado`, el trigger `tm_after_finalize_refresh`
 *     se encarga de refrescar `public.standings`. El caller puede asumir que
 *     al leer `listStandings(tournamentId)` justo después ya está actualizado.
 *   - `listStandings` NO filtra por rol: la vista materializada es pública
 *     (se muestra en la ficha del torneo).
 */

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
    return "El torneo no está en estado para cargar resultados (debe estar en 'cerrado_inscripciones' o 'finalizado').";
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
  input: MatchCreateInput,
): Promise<{ error: string | null; data: MatchRow | null }> {
  const parsed = matchCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const { data: userAuth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userAuth.user) {
    return { error: "No autenticado", data: null };
  }

  const { data, error } = await supabase
    .from("tournament_matches")
    .insert({
      tournament_id: parsed.data.tournamentId,
      round: parsed.data.round,
      group_code: parsed.data.groupCode ?? null,
      fixture_order: parsed.data.fixtureOrder ?? null,
      home_registration_id: parsed.data.homeRegistrationId,
      away_registration_id: parsed.data.awayRegistrationId,
      scheduled_at: parsed.data.scheduledAt ?? null,
      venue: parsed.data.venue ?? null,
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
  input: MatchResultInput,
): Promise<{ error: string | null; data: MatchRow | null }> {
  const parsed = matchResultSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const { data: userAuth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userAuth.user) {
    return { error: "No autenticado", data: null };
  }

  const { data, error } = await supabase
    .from("tournament_matches")
    .update({
      home_score: parsed.data.homeScore,
      away_score: parsed.data.awayScore,
      status: parsed.data.status,
    })
    .eq("id", parsed.data.matchId)
    .select()
    .single();

  if (error) return { error: mapResultError(error, "record_result"), data: null };
  return { error: null, data: data as MatchRow };
}

export async function addMatchEvent(
  supabase: SupabaseClient,
  input: MatchEventInput,
): Promise<{ error: string | null; data: MatchEventRow | null }> {
  const parsed = matchEventSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, data: null };
  }

  const { data: userAuth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !userAuth.user) {
    return { error: "No autenticado", data: null };
  }

  const { data, error } = await supabase
    .from("match_events")
    .insert({
      match_id: parsed.data.matchId,
      event_type: parsed.data.eventType,
      minute: parsed.data.minute ?? null,
      player_id: parsed.data.playerId ?? null,
      team_side: parsed.data.teamSide ?? null,
      notes: parsed.data.notes ?? null,
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

/**
 * Algoritmo puro de cálculo de fila de standings a partir de una lista de
 * partidos finalizados. Útil para tests unitarios y para la UI si quisiera
 * calcular en vivo antes de que el refresh de la mat view termine.
 *
 * Cada partido se cuenta DOS veces: una desde la perspectiva del local y
 * otra desde la del visitante. Reglas de liga estándar: V=3pts, E=1pt, D=0.
 */
export function computeStandingFromMatches(
  tournamentId: string,
  registrationId: string,
  matches: Array<
    Pick<
      MatchRow,
      | "tournament_id"
      | "home_registration_id"
      | "away_registration_id"
      | "home_score"
      | "away_score"
      | "status"
    >
  >,
): StandingRow {
  const row: StandingRow = {
    tournament_id: tournamentId,
    registration_id: registrationId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goals_for: 0,
    goals_against: 0,
    goal_difference: 0,
    points: 0,
  };

  for (const m of matches) {
    if (m.tournament_id !== tournamentId) continue;
    if (m.status !== "finalizado") continue;
    if (m.home_score == null || m.away_score == null) continue;

    let isHome: boolean | null = null;
    if (m.home_registration_id === registrationId) isHome = true;
    else if (m.away_registration_id === registrationId) isHome = false;
    if (isHome === null) continue;

    const gf = isHome ? m.home_score : m.away_score;
    const ga = isHome ? m.away_score : m.home_score;

    row.played += 1;
    row.goals_for += gf;
    row.goals_against += ga;

    if (gf > ga) row.wins += 1;
    else if (gf === ga) row.draws += 1;
    else row.losses += 1;
  }

  row.goal_difference = row.goals_for - row.goals_against;
  row.points = row.wins * 3 + row.draws;
  return row;
}
