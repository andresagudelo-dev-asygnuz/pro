import { describe, it, expect, vi, beforeEach } from "vitest";
import { respondToJoinRequest, inviteToMatch } from "@/lib/match/actions";

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("@/lib/auth/with-auth", () => ({
  withAuth: (cb: any) => cb({ user: { id: "organizer-1" }, supabase: mockSupabase }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Match Logic Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("respondToJoinRequest", () => {
    it("should allow organizer to approve a request", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { organizer_id: "organizer-1" }, error: null });
      mockSupabase.update.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);

      const res = await respondToJoinRequest("match-1", "player-1", "joined");

      expect(res.ok).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("match_participants");
    });
  });

  describe("inviteToMatch", () => {
    it("should allow organizer to invite a user", async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { organizer_id: "organizer-1" }, error: null });
      mockSupabase.insert.mockResolvedValue({ error: null });

      const res = await inviteToMatch("match-1", "player-2");

      expect(res.ok).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("match_participants");
    });
  });
});
