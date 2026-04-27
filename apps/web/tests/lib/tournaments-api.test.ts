import { describe, test, expect, vi } from "vitest";
import { createTournament } from "@/lib/tournaments/api";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Tournaments API Layer", () => {
  test("createTournament fails if not authenticated", async () => {
    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as unknown as SupabaseClient;

    const data = {
      name: "Torneo",
      format: "liga" as const,
      slots: 16,
      location: "Pereira",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      status: "borrador" as const,
      categories: [],
    };

    const result = await createTournament(mockSupabase, data);
    expect(result.error).toBe("No autenticado");
  });

  test("createTournament calls supabase with correct data", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "123" }, error: null }),
      }),
    });

    const mockSupabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
      from: vi.fn().mockReturnValue({ insert: mockInsert }),
    } as unknown as SupabaseClient;

    const data = {
      name: "Torneo",
      format: "liga" as const,
      slots: 16,
      location: "Pereira",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      status: "borrador" as const,
      categories: [],
    };

    const result = await createTournament(mockSupabase, data);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ id: "123" });
    expect(mockSupabase.from).toHaveBeenCalledWith("tournaments");
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      name: "Torneo",
      owner_id: "user-1",
    }));
  });
});
