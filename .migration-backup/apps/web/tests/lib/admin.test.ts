import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * `isAdminEmail` depende de `env.ADMIN_EMAILS`, que `lib/env.ts` parsea una
 * sola vez al import-time. Para probar escenarios distintos (lista vacía,
 * varios emails, espacios) reseteamos el módulo entre casos y mutamos
 * `process.env.ADMIN_EMAILS` antes del re-import.
 */
describe("isAdminEmail", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env.ADMIN_EMAILS;
    vi.resetModules();
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = original;
  });

  async function freshModule() {
    const mod = await import("@/lib/auth/admin");
    return mod;
  }

  it("devuelve false cuando ADMIN_EMAILS no está seteada", async () => {
    delete process.env.ADMIN_EMAILS;
    const { isAdminEmail } = await freshModule();
    expect(isAdminEmail("alice@example.com")).toBe(false);
  });

  it("devuelve false cuando ADMIN_EMAILS está vacía", async () => {
    process.env.ADMIN_EMAILS = "";
    const { isAdminEmail } = await freshModule();
    expect(isAdminEmail("alice@example.com")).toBe(false);
  });

  it("devuelve true para un email en la whitelist", async () => {
    process.env.ADMIN_EMAILS = "alice@example.com";
    const { isAdminEmail } = await freshModule();
    expect(isAdminEmail("alice@example.com")).toBe(true);
  });

  it("compara case-insensitive y tolera espacios", async () => {
    process.env.ADMIN_EMAILS = "  Alice@Example.com , BOB@x.io ";
    const { isAdminEmail } = await freshModule();
    expect(isAdminEmail("alice@example.com")).toBe(true);
    expect(isAdminEmail("ALICE@example.com")).toBe(true);
    expect(isAdminEmail("bob@x.io")).toBe(true);
  });

  it("rechaza emails no incluidos", async () => {
    process.env.ADMIN_EMAILS = "alice@example.com";
    const { isAdminEmail } = await freshModule();
    expect(isAdminEmail("eve@example.com")).toBe(false);
  });

  it("rechaza null/undefined/vacío", async () => {
    process.env.ADMIN_EMAILS = "alice@example.com";
    const { isAdminEmail } = await freshModule();
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });
});
