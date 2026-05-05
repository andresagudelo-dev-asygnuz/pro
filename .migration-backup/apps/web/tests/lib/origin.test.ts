import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock `next/headers` y `@/lib/env` antes de importar resolveOrigin.
const headersMock = vi.hoisted(() => ({ map: new Map<string, string>() }));
vi.mock("next/headers", () => ({
  headers: async () => ({
    get: (key: string) => headersMock.map.get(key.toLowerCase()) ?? null,
  }),
}));

const allowedMock = vi.hoisted(() => ({
  set: new Set<string>(["http://localhost:3000", "https://app.example.com"]),
}));
vi.mock("@/lib/env", () => ({
  getAllowedOrigins: () => allowedMock.set,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  },
}));

import { resolveOrigin } from "@/lib/auth/origin";

describe("resolveOrigin", () => {
  beforeEach(() => {
    headersMock.map.clear();
  });
  afterEach(() => {
    headersMock.map.clear();
  });

  it("usa Origin si está en el allowlist", async () => {
    headersMock.map.set("origin", "https://app.example.com");
    await expect(resolveOrigin()).resolves.toBe("https://app.example.com");
  });

  it("rechaza Origin NO listado y usa x-forwarded-*", async () => {
    headersMock.map.set("origin", "https://evil.com");
    headersMock.map.set("x-forwarded-host", "app.example.com");
    headersMock.map.set("x-forwarded-proto", "https");
    await expect(resolveOrigin()).resolves.toBe("https://app.example.com");
  });

  it("maneja headers con coma-separados (CDN→LB)", async () => {
    headersMock.map.set("x-forwarded-host", "app.example.com, internal.lb");
    headersMock.map.set("x-forwarded-proto", "https, http");
    await expect(resolveOrigin()).resolves.toBe("https://app.example.com");
  });

  it("fallback al primer allowlist si nada matchea", async () => {
    headersMock.map.set("origin", "https://attacker.com");
    headersMock.map.set("x-forwarded-host", "other.com");
    await expect(resolveOrigin()).resolves.toBe("http://localhost:3000");
  });

  it("usa host directo si no hay x-forwarded-host", async () => {
    headersMock.map.set("host", "localhost:3000");
    await expect(resolveOrigin()).resolves.toBe("http://localhost:3000");
  });
});
