import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapDbError, mapAuthError } from "@/lib/errors/map-db-error";

describe("mapDbError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("devuelve mensaje genérico si error es null/undefined", () => {
    expect(mapDbError(null)).toBe("Algo salió mal. Probá de nuevo en un momento.");
    expect(mapDbError(undefined)).toBe("Algo salió mal. Probá de nuevo en un momento.");
  });

  it("nunca filtra el mensaje crudo al cliente", () => {
    const sqlError = {
      code: "UNKNOWN_XYZ",
      message: 'duplicate key value violates unique constraint "profiles_username_key"',
      details: "Key (username)=(andres) already exists.",
    };
    const out = mapDbError(sqlError);
    expect(out).not.toContain("profiles_username_key");
    expect(out).not.toContain("unique constraint");
    expect(out).not.toContain("Key (username)");
  });

  it("mapea 23505 (unique violation) a mensaje amigable", () => {
    expect(mapDbError({ code: "23505", message: "x" })).toBe(
      "Ese valor ya existe. Probá con otro.",
    );
  });

  it("mapea 42501 (RLS denied) a 'sin permisos'", () => {
    expect(mapDbError({ code: "42501", message: "x" })).toContain("permisos");
  });

  it("mapea P0001 con 'match_full' a mensaje de cupos", () => {
    expect(mapDbError({ code: "P0001", message: "match_full: capacity reached" })).toBe(
      "El partido ya está completo.",
    );
  });

  it("mapea P0001 con 'rate_limited' a mensaje de rate limit", () => {
    expect(
      mapDbError({ code: "P0001", message: "rate_limited: 11 of 10 requests" }),
    ).toContain("Muchos intentos");
  });

  it("mapea P0001 con 'organizer_cannot_leave'", () => {
    expect(
      mapDbError({ code: "P0001", message: "organizer_cannot_leave" }),
    ).toContain("organizador");
  });
});

describe("mapAuthError", () => {
  it("mapea 'invalid login' a 'incorrectos'", () => {
    expect(mapAuthError("Invalid login credentials")).toBe(
      "Email o contraseña incorrectos.",
    );
  });

  it("mapea 'already registered'", () => {
    expect(mapAuthError("User already registered")).toContain("cuenta con ese email");
  });

  it("mapea 'email not confirmed'", () => {
    expect(mapAuthError("Email not confirmed")).toContain("confirmaste");
  });

  it("mapea rate limit", () => {
    expect(mapAuthError("rate limit exceeded")).toContain("Muchos intentos");
  });

  it("cae a genérico para mensajes desconocidos", () => {
    expect(mapAuthError("something weird happened")).toBe(
      "Algo salió mal. Probá de nuevo en un momento.",
    );
  });
});
