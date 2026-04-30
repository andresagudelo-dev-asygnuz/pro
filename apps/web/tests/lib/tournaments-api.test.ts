import { describe, test, expect, vi } from "vitest";
import {
  createTournament,
  getTournamentById,
  getTournaments,
  getMyTournaments,
  publishTournament,
} from "@/lib/tournaments/api";
import type { SupabaseClient } from "@supabase/supabase-js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const TOURNAMENT_ID = "22222222-2222-4222-8222-222222222222";

function baseTournamentInput() {
  return {
    name: "Torneo",
    format: "liga" as const,
    slots: 16,
    location: "Pereira",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    status: "borrador" as const,
    categories: [],
  };
}

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

describe("Tournaments API Layer · createTournament", () => {
  test("falla si no está autenticado", async () => {
    const mockSupabase = mockAuthedClient(null) as unknown as SupabaseClient;
    const result = await createTournament(mockSupabase, baseTournamentInput());
    expect(result.error).toBe("No autenticado");
    expect(result.data).toBeNull();
  });

  test("rechaza input inválido (nombre corto) sin consultar auth", async () => {
    const authMock = vi.fn();
    const mockSupabase = { auth: { getUser: authMock } } as unknown as SupabaseClient;
    const result = await createTournament(mockSupabase, {
      ...baseTournamentInput(),
      name: "a",
    });
    expect(result.error).toMatch(/.+/);
    expect(result.data).toBeNull();
    expect(authMock).not.toHaveBeenCalled();
  });

  test("inserta con owner_id del usuario autenticado", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: TOURNAMENT_ID }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const mockSupabase = {
      ...mockAuthedClient(USER_ID),
      from: vi.fn().mockReturnValue({ insert }),
    } as unknown as SupabaseClient;

    const result = await createTournament(mockSupabase, baseTournamentInput());
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ id: TOURNAMENT_ID });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ owner_id: USER_ID, name: "Torneo" }),
    );
  });

  test("mapea errores DB a mensaje humano", async () => {
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value" },
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const mockSupabase = {
      ...mockAuthedClient(USER_ID),
      from: vi.fn().mockReturnValue({ insert }),
    } as unknown as SupabaseClient;

    const result = await createTournament(mockSupabase, baseTournamentInput());
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe("Tournaments API Layer · getTournamentById", () => {
  test("retorna la fila cuando existe", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: TOURNAMENT_ID, name: "Torneo" },
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const mockSupabase = { from } as unknown as SupabaseClient;

    const res = await getTournamentById(mockSupabase, TOURNAMENT_ID);
    expect(res.error).toBeNull();
    expect(res.data).toEqual({ id: TOURNAMENT_ID, name: "Torneo" });
    expect(from).toHaveBeenCalledWith("tournaments");
    expect(eq).toHaveBeenCalledWith("id", TOURNAMENT_ID);
  });

  test("propaga error DB", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied" },
    });
    const mockSupabase = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
    } as unknown as SupabaseClient;

    const res = await getTournamentById(mockSupabase, TOURNAMENT_ID);
    expect(res.data).toBeNull();
    expect(res.error).toBeTruthy();
  });
});

describe("Tournaments API Layer · getTournaments / getMyTournaments", () => {
  test("getTournaments pide orden descendente", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: TOURNAMENT_ID }],
      error: null,
    });
    const select = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({ select });
    const mockSupabase = { from } as unknown as SupabaseClient;

    const res = await getTournaments(mockSupabase);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([{ id: TOURNAMENT_ID }]);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  test("getMyTournaments exige auth", async () => {
    const mockSupabase = mockAuthedClient(null) as unknown as SupabaseClient;
    const res = await getMyTournaments(mockSupabase);
    expect(res.error).toBe("No autenticado");
  });

  test("getMyTournaments filtra por owner_id del caller", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });
    const mockSupabase = {
      ...mockAuthedClient(USER_ID),
      from,
    } as unknown as SupabaseClient;

    const res = await getMyTournaments(mockSupabase);
    expect(res.error).toBeNull();
    expect(eq).toHaveBeenCalledWith("owner_id", USER_ID);
  });
});

describe("Tournaments API Layer · publishTournament", () => {
  test("exige auth", async () => {
    const mockSupabase = mockAuthedClient(null) as unknown as SupabaseClient;
    const res = await publishTournament(mockSupabase, TOURNAMENT_ID);
    expect(res.error).toBe("No autenticado");
  });

  test("dispara update filtrando por id+owner_id+status='borrador'", async () => {
    const eqCalls: Array<[string, unknown]> = [];
    const single = vi.fn().mockResolvedValue({
      data: { id: TOURNAMENT_ID, status: "abierto_inscripciones" },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const eq3 = vi.fn().mockImplementation((...args: [string, unknown]) => {
      eqCalls.push(args);
      return { select };
    });
    const eq2 = vi.fn().mockImplementation((...args: [string, unknown]) => {
      eqCalls.push(args);
      return { eq: eq3 };
    });
    const eq1 = vi.fn().mockImplementation((...args: [string, unknown]) => {
      eqCalls.push(args);
      return { eq: eq2 };
    });
    const update = vi.fn().mockReturnValue({ eq: eq1 });
    const from = vi.fn().mockReturnValue({ update });
    const mockSupabase = {
      ...mockAuthedClient(USER_ID),
      from,
    } as unknown as SupabaseClient;

    const res = await publishTournament(mockSupabase, TOURNAMENT_ID);
    expect(res.error).toBeNull();
    expect(update).toHaveBeenCalledWith({ status: "abierto_inscripciones" });
    expect(eqCalls).toEqual([
      ["id", TOURNAMENT_ID],
      ["owner_id", USER_ID],
      ["status", "borrador"],
    ]);
  });
});
