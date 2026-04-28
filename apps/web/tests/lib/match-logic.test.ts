import { describe, it, expect, vi } from "vitest";

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: "match-1", organizer_id: "organizer-1" }, error: null }),
};

// Mock format logic
const mockFormat = {
  formatMatchDate: (d: string) => d,
  formatMatchTime: (t: string) => t,
};

describe("Match Logic Mock", () => {
  it("should be defined", () => {
    expect(mockSupabase).toBeDefined();
    expect(mockFormat).toBeDefined();
  });
});

export const mockAuth = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withAuth: (cb: (args: { user: { id: string }, supabase: any }) => any) => cb({ user: { id: "organizer-1" }, supabase: mockSupabase }),
};
