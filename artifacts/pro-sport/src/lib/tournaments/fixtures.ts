import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { MatchRow } from "./matches";

type ApiResult<T> = { data: T | null; error: string | null };

type FixturePairing = {
  round: number;
  homeId: string | null;
  awayId: string | null;
  fixtureOrder: number;
};

/**
 * Round-robin con rotación (método del círculo).
 * Si N es impar, agrega un null como "bye" para hacer el array par.
 * El equipo emparejado con null no juega esa ronda.
 */
export function buildRoundRobinPairings(registrationIds: string[]): FixturePairing[] {
  const ids: (string | null)[] = [...registrationIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 === 1) ids.push(null);

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const pairings: FixturePairing[] = [];
  const rotation: (string | null)[] = [...ids];
  let fixtureOrder = 1;

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = rotation[i];
      const b = rotation[n - 1 - i];
      if (a === null || b === null) continue;
      const isHomeA = (r + i) % 2 === 0;
      pairings.push({
        round: r + 1,
        homeId: isHomeA ? a : b,
        awayId: isHomeA ? b : a,
        fixtureOrder: fixtureOrder++,
      });
    }
    // Rotar: el primer elemento queda fijo, los demás giran
    const fixed = rotation[0];
    const last = rotation[n - 1];
    for (let i = n - 1; i > 1; i--) rotation[i] = rotation[i - 1];
    rotation[1] = last;
    rotation[0] = fixed;
  }

  return pairings;
}

export function buildKnockoutPairings(registrationIds: string[]): FixturePairing[] {
  const n = registrationIds.length;
  if (n < 2) return [];

  // Find next power of 2
  let bracket = 2;
  while (bracket < n) bracket *= 2;

  // Fill with nulls (byes)
  const seeds: (string | null)[] = [...registrationIds];
  while (seeds.length < bracket) seeds.push(null);

  const pairings: FixturePairing[] = [];
  let fixtureOrder = 1;
  const half = bracket / 2;

  for (let i = 0; i < half; i++) {
    const home = seeds[i];
    const away = seeds[bracket - 1 - i];
    if (home === null || away === null) continue;
    pairings.push({ round: 1, homeId: home, awayId: away, fixtureOrder: fixtureOrder++ });
  }

  return pairings;
}

export async function generateFixture(
  supabase: SupabaseClient,
  tournamentId: string,
  format: "liga" | "eliminatoria" | "fase_grupos_eliminatoria",
): Promise<ApiResult<MatchRow[]>> {

  // Idempotencia: no regenerar si ya hay matches
  const { count, error: countErr } = await supabase
    .from("tournament_matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);
  if (countErr) return { data: null, error: mapDbError(countErr, "fixture_count") };
  if ((count ?? 0) > 0) {
    return { data: null, error: "El fixture ya fue generado para este torneo." };
  }

  // Obtener registros confirmados
  const { data: regs, error: regsErr } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("status", "confirmada")
    .order("created_at");
  if (regsErr) return { data: null, error: mapDbError(regsErr, "fixture_regs") };
  const ids = ((regs ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (ids.length < 2) {
    return { data: null, error: "Se necesitan al menos 2 equipos para generar el fixture." };
  }

  let pairings: FixturePairing[];
  if (format === "liga") {
    pairings = buildRoundRobinPairings(ids);
  } else if (format === "eliminatoria") {
    pairings = buildKnockoutPairings(ids);
  } else {
    return { data: null, error: "El formato 'fase_grupos_eliminatoria' requiere configuración de grupos." };
  }
  const rows = pairings.map((p) => ({
    tournament_id: tournamentId,
    round: p.round,
    home_registration_id: p.homeId,
    away_registration_id: p.awayId,
    fixture_order: p.fixtureOrder,
    status: "programado" as const,
  }));

  const { data, error } = await supabase
    .from("tournament_matches")
    .insert(rows)
    .select();
  if (error) return { data: null, error: mapDbError(error, "fixture_insert") };
  return { data: (data ?? []) as MatchRow[], error: null };
}
