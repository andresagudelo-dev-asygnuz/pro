import { describe, test, expect } from "vitest";
import { tournamentSchema } from "@/lib/validation/schemas";

describe("Tournament Schema Validation", () => {
  test("accepts valid tournament data", () => {
    const data = {
      name: "Torneo de Verano",
      format: "eliminatoria",
      slots: 16,
      location: "Pereira",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    };

    const result = tournamentSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  test("rejects endDate before startDate", () => {
    const data = {
      name: "Torneo de Verano",
      format: "eliminatoria",
      slots: 16,
      location: "Pereira",
      startDate: "2026-06-30",
      endDate: "2026-06-01",
    };

    const result = tournamentSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("La fecha de fin no puede ser anterior a la de inicio");
    }
  });

  test("rejects slots less than 2", () => {
    const data = {
      name: "Torneo",
      format: "liga",
      slots: 1,
      location: "Manizales",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    };

    const result = tournamentSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
