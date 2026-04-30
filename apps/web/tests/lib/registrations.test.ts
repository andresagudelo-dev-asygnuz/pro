import { describe, test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createTeam,
  registerSoloToTournament,
  registerTeamToTournament,
  cancelRegistration,
  findUnverifiedUsers,
  getMyTeams,
  getTeamMembers,
  listRegistrations,
  getMyRegistrations,
} from "@/lib/tournaments/registrations";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const TEAM_ID = "22222222-2222-4222-8222-222222222222";
const TOURNAMENT_ID = "33333333-3333-4333-8333-333333333333";
const MEMBER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

describe("registrations · validation", () => {
  test("createTeam rejects nombre corto", async () => {
    const supabase = mockAuthedClient(USER_ID) as unknown as SupabaseClient;
    const res = await createTeam(supabase, { name: "a", memberUserIds: [] });
    expect(res.error).toMatch(/al menos 2 caracteres/);
    expect(res.data).toBeNull();
  });

  test("registerSolo falla sin auth", async () => {
    const supabase = mockAuthedClient(null) as unknown as SupabaseClient;
    const res = await registerSoloToTournament(supabase, {
      tournamentId: TOURNAMENT_ID,
    });
    expect(res.error).toBe("No autenticado");
  });

  test("cancelRegistration rechaza UUID inválido", async () => {
    const supabase = mockAuthedClient(USER_ID) as unknown as SupabaseClient;
    const res = await cancelRegistration(supabase, {
      registrationId: "not-a-uuid",
    });
    expect(res.error).toMatch(/Inscripción inválida/);
  });
});

describe("registrations · age verification gate", () => {
  test("findUnverifiedUsers retorna lista vacía cuando todos aprobados", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const supabase = { rpc } as unknown as SupabaseClient;

    const res = await findUnverifiedUsers(supabase, [MEMBER_A, MEMBER_B]);
    expect(res.error).toBeNull();
    expect(res.unverified).toEqual([]);
    expect(rpc).toHaveBeenCalledWith("find_unverified_users", {
      p_user_ids: [MEMBER_A, MEMBER_B],
    });
  });

  test("findUnverifiedUsers devuelve los IDs faltantes", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: [MEMBER_B], error: null });
    const supabase = { rpc } as unknown as SupabaseClient;

    const res = await findUnverifiedUsers(supabase, [MEMBER_A, MEMBER_B]);
    expect(res.unverified).toEqual([MEMBER_B]);
  });

  test("findUnverifiedUsers corto-circuita con lista vacía sin llamar RPC", async () => {
    const rpc = vi.fn();
    const supabase = { rpc } as unknown as SupabaseClient;

    const res = await findUnverifiedUsers(supabase, []);
    expect(res.unverified).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("registrations · registerTeamToTournament", () => {
  test("bloquea si algún miembro no tiene verificación aprobada", async () => {
    const calls: string[] = [];
    const from = vi.fn((table: string) => {
      calls.push(table);
      if (table === "team_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ user_id: MEMBER_A }, { user_id: MEMBER_B }],
              error: null,
            }),
          }),
        };
      }
      // No debería llegar al insert de tournament_registrations
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });
    // RPC responde con MEMBER_B no verificado.
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: [MEMBER_B], error: null });

    const supabase = {
      ...mockAuthedClient(USER_ID),
      from,
      rpc,
    } as unknown as SupabaseClient;

    const res = await registerTeamToTournament(supabase, {
      tournamentId: TOURNAMENT_ID,
      teamId: TEAM_ID,
    });

    expect(res.data).toBeNull();
    expect(res.error).toMatch(/verificación de edad/);
    expect(calls).toEqual(["team_members"]);
    expect(rpc).toHaveBeenCalledWith("find_unverified_users", {
      p_user_ids: [MEMBER_A, MEMBER_B],
    });
  });

  test("bloquea si el equipo no tiene miembros", async () => {
    const from = vi.fn((table: string) => {
      if (table === "team_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
    const supabase = {
      ...mockAuthedClient(USER_ID),
      from,
    } as unknown as SupabaseClient;

    const res = await registerTeamToTournament(supabase, {
      tournamentId: TOURNAMENT_ID,
      teamId: TEAM_ID,
    });
    expect(res.error).toMatch(/no tiene miembros/i);
  });

  test("inserta registration cuando todos los miembros están aprobados", async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "reg-1",
            tournament_id: TOURNAMENT_ID,
            team_id: TEAM_ID,
            user_id: null,
            status: "confirmada",
            registered_by: USER_ID,
            created_at: "",
            updated_at: "",
          },
          error: null,
        }),
      }),
    });

    const from = vi.fn((table: string) => {
      if (table === "team_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ user_id: MEMBER_A }, { user_id: MEMBER_B }],
              error: null,
            }),
          }),
        };
      }
      if (table === "tournament_registrations") {
        return { insert: insertMock };
      }
      throw new Error(`unexpected table ${table}`);
    });
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });

    const supabase = {
      ...mockAuthedClient(USER_ID),
      from,
      rpc,
    } as unknown as SupabaseClient;

    const res = await registerTeamToTournament(supabase, {
      tournamentId: TOURNAMENT_ID,
      teamId: TEAM_ID,
    });

    expect(res.error).toBeNull();
    expect(res.data?.id).toBe("reg-1");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tournament_id: TOURNAMENT_ID,
        team_id: TEAM_ID,
        user_id: null,
        status: "confirmada",
        registered_by: USER_ID,
      }),
    );
  });

  test("mapea P0001/tournament_full a mensaje UX", async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "P0001", message: "tournament_full" },
        }),
      }),
    });

    const from = vi.fn((table: string) => {
      if (table === "team_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ user_id: MEMBER_A }],
              error: null,
            }),
          }),
        };
      }
      if (table === "tournament_registrations") {
        return { insert: insertMock };
      }
      throw new Error(`unexpected table ${table}`);
    });
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });

    const supabase = {
      ...mockAuthedClient(USER_ID),
      from,
      rpc,
    } as unknown as SupabaseClient;

    const res = await registerTeamToTournament(supabase, {
      tournamentId: TOURNAMENT_ID,
      teamId: TEAM_ID,
    });

    expect(res.data).toBeNull();
    expect(res.error).toMatch(/lleno/i);
  });

  test("mapea P0001/tournament_not_open a mensaje UX", async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "P0001", message: "tournament_not_open" },
        }),
      }),
    });

    const from = vi.fn((table: string) => {
      if (table === "team_members") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ user_id: MEMBER_A }],
              error: null,
            }),
          }),
        };
      }
      if (table === "tournament_registrations") {
        return { insert: insertMock };
      }
      throw new Error(`unexpected table ${table}`);
    });
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });

    const supabase = {
      ...mockAuthedClient(USER_ID),
      from,
      rpc,
    } as unknown as SupabaseClient;

    const res = await registerTeamToTournament(supabase, {
      tournamentId: TOURNAMENT_ID,
      teamId: TEAM_ID,
    });

    expect(res.data).toBeNull();
    expect(res.error).toMatch(/no está abierto a inscripciones/i);
  });
});

describe("registrations · createTeam", () => {
  test("crea team y agrega miembros extra (excluyendo capitán)", async () => {
    const insertedTeams: unknown[] = [];
    const insertedMembers: unknown[] = [];
    const from = vi.fn((table: string) => {
      if (table === "teams") {
        return {
          insert: vi.fn().mockImplementation((payload: unknown) => {
            insertedTeams.push(payload);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: TEAM_ID,
                    name: "Test FC",
                    captain_id: USER_ID,
                    created_at: "",
                    updated_at: "",
                  },
                  error: null,
                }),
              }),
            };
          }),
        };
      }
      if (table === "team_members") {
        return {
          insert: vi.fn().mockImplementation((rows: unknown) => {
            insertedMembers.push(rows);
            return Promise.resolve({ data: null, error: null });
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    const supabase = {
      ...mockAuthedClient(USER_ID),
      from,
    } as unknown as SupabaseClient;

    const res = await createTeam(supabase, {
      name: "Test FC",
      memberUserIds: [USER_ID, MEMBER_A, MEMBER_B],
    });

    expect(res.error).toBeNull();
    expect(res.data?.id).toBe(TEAM_ID);
    expect(insertedTeams).toEqual([{ name: "Test FC", captain_id: USER_ID }]);
    // USER_ID (capitán) excluido; solo MEMBER_A y MEMBER_B.
    expect(insertedMembers).toEqual([
      [
        { team_id: TEAM_ID, user_id: MEMBER_A, role: "player" },
        { team_id: TEAM_ID, user_id: MEMBER_B, role: "player" },
      ],
    ]);
  });

  test("no inserta miembros si solo viene el capitán", async () => {
    const memberInsert = vi.fn();
    const from = vi.fn((table: string) => {
      if (table === "teams") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: TEAM_ID, name: "Solo", captain_id: USER_ID, created_at: "", updated_at: "" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "team_members") return { insert: memberInsert };
      throw new Error(`unexpected table ${table}`);
    });

    const supabase = {
      ...mockAuthedClient(USER_ID),
      from,
    } as unknown as SupabaseClient;

    const res = await createTeam(supabase, {
      name: "Solo",
      memberUserIds: [USER_ID],
    });
    expect(res.error).toBeNull();
    expect(memberInsert).not.toHaveBeenCalled();
  });

  test("falla sin auth", async () => {
    const supabase = mockAuthedClient(null) as unknown as SupabaseClient;
    const res = await createTeam(supabase, { name: "Test FC", memberUserIds: [] });
    expect(res.error).toBe("No autenticado");
  });

  test("mapea error DB al insertar team", async () => {
    const from = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: "23505", message: "duplicate key" },
          }),
        }),
      }),
    });
    const supabase = {
      ...mockAuthedClient(USER_ID),
      from,
    } as unknown as SupabaseClient;
    const res = await createTeam(supabase, { name: "Test FC", memberUserIds: [] });
    expect(res.data).toBeNull();
    expect(res.error).toBeTruthy();
  });
});

describe("registrations · getMyTeams / getTeamMembers", () => {
  test("getMyTeams filtra por captain_id del caller", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: TEAM_ID, name: "Test FC", captain_id: USER_ID }],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq }),
    });
    const supabase = {
      ...mockAuthedClient(USER_ID),
      from,
    } as unknown as SupabaseClient;

    const res = await getMyTeams(supabase);
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(eq).toHaveBeenCalledWith("captain_id", USER_ID);
  });

  test("getMyTeams falla sin auth", async () => {
    const supabase = mockAuthedClient(null) as unknown as SupabaseClient;
    const res = await getMyTeams(supabase);
    expect(res.error).toBe("No autenticado");
  });

  test("getTeamMembers filtra por team_id", async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [{ team_id: TEAM_ID, user_id: MEMBER_A, role: "captain", joined_at: "" }],
      error: null,
    });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq }),
    });
    const supabase = { from } as unknown as SupabaseClient;
    const res = await getTeamMembers(supabase, TEAM_ID);
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(eq).toHaveBeenCalledWith("team_id", TEAM_ID);
  });

  test("getTeamMembers retorna array vacío cuando no hay miembros (data null)", async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq }),
    });
    const supabase = { from } as unknown as SupabaseClient;
    const res = await getTeamMembers(supabase, TEAM_ID);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });
});

describe("registrations · registerSoloToTournament", () => {
  test("bloquea si el usuario no está verificado", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [USER_ID], error: null });
    const supabase = {
      ...mockAuthedClient(USER_ID),
      rpc,
    } as unknown as SupabaseClient;
    const res = await registerSoloToTournament(supabase, { tournamentId: TOURNAMENT_ID });
    expect(res.data).toBeNull();
    expect(res.error).toMatch(/verificación de edad no está aprobada/i);
  });

  test("inserta cuando el usuario está verificado", async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "reg-solo",
            tournament_id: TOURNAMENT_ID,
            team_id: null,
            user_id: USER_ID,
            status: "confirmada",
            registered_by: USER_ID,
            created_at: "",
            updated_at: "",
          },
          error: null,
        }),
      }),
    });
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const supabase = {
      ...mockAuthedClient(USER_ID),
      rpc,
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    } as unknown as SupabaseClient;

    const res = await registerSoloToTournament(supabase, { tournamentId: TOURNAMENT_ID });
    expect(res.error).toBeNull();
    expect(res.data?.id).toBe("reg-solo");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tournament_id: TOURNAMENT_ID,
        team_id: null,
        user_id: USER_ID,
        status: "confirmada",
        registered_by: USER_ID,
      }),
    );
  });
});

describe("registrations · cancelRegistration / listRegistrations / getMyRegistrations", () => {
  test("cancelRegistration actualiza status='cancelada'", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "reg-1",
        tournament_id: TOURNAMENT_ID,
        team_id: TEAM_ID,
        user_id: null,
        status: "cancelada",
        registered_by: USER_ID,
        created_at: "",
        updated_at: "",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    const supabase = {
      from: vi.fn().mockReturnValue({ update }),
    } as unknown as SupabaseClient;

    const res = await cancelRegistration(supabase, {
      registrationId: "11111111-1111-4111-8111-111111111112",
    });
    expect(res.error).toBeNull();
    expect(res.data?.status).toBe("cancelada");
    expect(update).toHaveBeenCalledWith({ status: "cancelada" });
  });

  test("listRegistrations filtra por tournament_id y ordena ascendente", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: "r1" }, { id: "r2" }],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq }),
    });
    const supabase = { from } as unknown as SupabaseClient;
    const res = await listRegistrations(supabase, TOURNAMENT_ID);
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(2);
    expect(eq).toHaveBeenCalledWith("tournament_id", TOURNAMENT_ID);
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  test("getMyRegistrations exige auth", async () => {
    const supabase = mockAuthedClient(null) as unknown as SupabaseClient;
    const res = await getMyRegistrations(supabase);
    expect(res.error).toBe("No autenticado");
  });

  test("getMyRegistrations filtra por registered_by del caller", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn().mockReturnValue({ order });
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ eq }),
    });
    const supabase = {
      ...mockAuthedClient(USER_ID),
      from,
    } as unknown as SupabaseClient;
    const res = await getMyRegistrations(supabase);
    expect(res.error).toBeNull();
    expect(eq).toHaveBeenCalledWith("registered_by", USER_ID);
  });
});
