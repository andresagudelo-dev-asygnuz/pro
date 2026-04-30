import { describe, test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createMatch,
  recordResult,
  addMatchEvent,
  computeStandingFromMatches,
  type MatchRow,
} from "@/lib/tournaments/matches";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const TOURNAMENT_ID = "33333333-3333-4333-8333-333333333333";
const REG_HOME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REG_AWAY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const REG_THIRD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MATCH_ID = "44444444-4444-4444-8444-444444444444";

function mockAuthedClient(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
  };
}

describe("matches · validation", () => {
  test("createMatch rechaza home == away", async () => {
    const supabase = mockAuthedClient(USER_ID) as unknown as SupabaseClient;
    const res = await createMatch(supabase, {
      tournamentId: TOURNAMENT_ID,
      round: 1,
      homeRegistrationId: REG_HOME,
      awayRegistrationId: REG_HOME,
    });
    expect(res.error).toMatch(/no puede enfrentarse a sí mismo/);
    expect(res.data).toBeNull();
  });

  test("createMatch falla sin auth", async () => {
    const supabase = mockAuthedClient(null) as unknown as SupabaseClient;
    const res = await createMatch(supabase, {
      tournamentId: TOURNAMENT_ID,
      round: 1,
      homeRegistrationId: REG_HOME,
      awayRegistrationId: REG_AWAY,
    });
    expect(res.error).toBe("No autenticado");
  });

  test("recordResult rechaza score negativo", async () => {
    const supabase = mockAuthedClient(USER_ID) as unknown as SupabaseClient;
    const res = await recordResult(supabase, {
      matchId: MATCH_ID,
      homeScore: -1,
      awayScore: 0,
      status: "finalizado",
    });
    expect(res.error).toMatch(/no puede ser negativo/);
  });

  test("addMatchEvent rechaza minuto > 130", async () => {
    const supabase = mockAuthedClient(USER_ID) as unknown as SupabaseClient;
    const res = await addMatchEvent(supabase, {
      matchId: MATCH_ID,
      eventType: "gol",
      minute: 999,
      teamSide: "home",
      playerId: null,
      notes: null,
    });
    expect(res.error).toMatch(/<= 130/);
  });
});

describe("matches · recordResult error mapping", () => {
  test("mapea P0001/tournament_not_ready_for_results", async () => {
    const update = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "P0001", message: "tournament_not_ready_for_results" },
      }),
    };
    const supabase = {
      ...mockAuthedClient(USER_ID),
      from: vi.fn().mockReturnValue(update),
    } as unknown as SupabaseClient;

    const res = await recordResult(supabase, {
      matchId: MATCH_ID,
      homeScore: 2,
      awayScore: 1,
      status: "finalizado",
    });
    expect(res.error).toMatch(/no está en estado para cargar resultados/i);
  });

  test("mapea 42501/permission a mensaje UX", async () => {
    const update = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "42501", message: "new row violates row-level security policy" },
      }),
    };
    const supabase = {
      ...mockAuthedClient(USER_ID),
      from: vi.fn().mockReturnValue(update),
    } as unknown as SupabaseClient;

    const res = await recordResult(supabase, {
      matchId: MATCH_ID,
      homeScore: 1,
      awayScore: 1,
      status: "finalizado",
    });
    expect(res.error).toMatch(/no tenés permisos/i);
  });
});

describe("matches · computeStandingFromMatches (algoritmo puro)", () => {
  const baseMatch = (
    overrides: Partial<MatchRow>,
  ): Pick<
    MatchRow,
    | "tournament_id"
    | "home_registration_id"
    | "away_registration_id"
    | "home_score"
    | "away_score"
    | "status"
  > => ({
    tournament_id: TOURNAMENT_ID,
    home_registration_id: REG_HOME,
    away_registration_id: REG_AWAY,
    home_score: 0,
    away_score: 0,
    status: "finalizado",
    ...overrides,
  });

  test("partido ganado como local suma 3 puntos", () => {
    const row = computeStandingFromMatches(TOURNAMENT_ID, REG_HOME, [
      baseMatch({ home_score: 3, away_score: 1 }),
    ]);
    expect(row).toMatchObject({
      played: 1,
      wins: 1,
      draws: 0,
      losses: 0,
      goals_for: 3,
      goals_against: 1,
      goal_difference: 2,
      points: 3,
    });
  });

  test("partido perdido como visitante no suma puntos", () => {
    const row = computeStandingFromMatches(TOURNAMENT_ID, REG_AWAY, [
      baseMatch({ home_score: 3, away_score: 1 }),
    ]);
    expect(row).toMatchObject({
      played: 1,
      wins: 0,
      draws: 0,
      losses: 1,
      goals_for: 1,
      goals_against: 3,
      goal_difference: -2,
      points: 0,
    });
  });

  test("empate suma 1 punto a cada lado", () => {
    const rowHome = computeStandingFromMatches(TOURNAMENT_ID, REG_HOME, [
      baseMatch({ home_score: 2, away_score: 2 }),
    ]);
    const rowAway = computeStandingFromMatches(TOURNAMENT_ID, REG_AWAY, [
      baseMatch({ home_score: 2, away_score: 2 }),
    ]);
    expect(rowHome.points).toBe(1);
    expect(rowHome.draws).toBe(1);
    expect(rowAway.points).toBe(1);
    expect(rowAway.draws).toBe(1);
  });

  test("ignora partidos no finalizados", () => {
    const row = computeStandingFromMatches(TOURNAMENT_ID, REG_HOME, [
      baseMatch({ home_score: null, away_score: null, status: "programado" }),
      baseMatch({ home_score: 5, away_score: 0, status: "en_juego" }),
    ]);
    expect(row.played).toBe(0);
    expect(row.points).toBe(0);
  });

  test("ignora partidos de otros torneos", () => {
    const row = computeStandingFromMatches(TOURNAMENT_ID, REG_HOME, [
      baseMatch({ tournament_id: "99999999-9999-4999-8999-999999999999", home_score: 10, away_score: 0 }),
    ]);
    expect(row.played).toBe(0);
  });

  test("ignora partidos donde el registration no participó", () => {
    const row = computeStandingFromMatches(TOURNAMENT_ID, REG_THIRD, [
      baseMatch({ home_score: 1, away_score: 0 }),
    ]);
    expect(row.played).toBe(0);
  });

  test("acumulado de 3 partidos (V + E + D)", () => {
    const row = computeStandingFromMatches(TOURNAMENT_ID, REG_HOME, [
      baseMatch({ home_score: 2, away_score: 0 }), // V local
      baseMatch({
        home_registration_id: REG_AWAY,
        away_registration_id: REG_HOME,
        home_score: 1,
        away_score: 1,
      }), // E como visitante
      baseMatch({
        home_registration_id: REG_AWAY,
        away_registration_id: REG_HOME,
        home_score: 3,
        away_score: 2,
      }), // D como visitante
    ]);
    expect(row).toMatchObject({
      played: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      goals_for: 2 + 1 + 2, // 5
      goals_against: 0 + 1 + 3, // 4
      goal_difference: 1,
      points: 3 + 1 + 0, // 4
    });
  });
});
