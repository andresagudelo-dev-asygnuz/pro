import { describe, it, expect, vi } from "vitest";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";

function mkSupabase(result: { error: unknown }) {
  return {
    rpc: vi.fn().mockResolvedValue(result),
  } as unknown as SupabaseClient;
}

describe("checkRateLimit", () => {
  it("ok: true cuando la función no devuelve error", async () => {
    const sb = mkSupabase({ error: null });
    await expect(
      checkRateLimit(sb, { key: "x", max: 5, windowSeconds: 60 }),
    ).resolves.toEqual({ ok: true });
  });

  it("ok: false con mensaje amigable cuando P0001/rate_limited", async () => {
    const sb = mkSupabase({
      error: { code: "P0001", message: "rate_limited: 6 of 5 requests in 60 seconds" },
    });
    const r = await checkRateLimit(sb, { key: "x", max: 5, windowSeconds: 60 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Muchos intentos");
  });

  it("degrada suave (permite) si la función falla por otro motivo", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const sb = mkSupabase({
      error: { code: "42883", message: "function does not exist" },
    });
    const r = await checkRateLimit(sb, { key: "x", max: 5, windowSeconds: 60 });
    expect(r.ok).toBe(true);
  });

  it("presets están dentro de rangos razonables", () => {
    for (const preset of Object.values(RATE_LIMITS)) {
      expect(preset.max).toBeGreaterThan(0);
      expect(preset.windowSeconds).toBeGreaterThan(0);
    }
  });
});
