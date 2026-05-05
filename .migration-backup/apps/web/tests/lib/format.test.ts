import { describe, it, expect } from "vitest";
import {
  formatMatchDate,
  formatRelativeTime,
  initialsFromName,
} from "@/lib/format";

describe("formatMatchDate", () => {
  it("produce un string no vacío para un ISO válido", () => {
    const out = formatMatchDate("2026-04-20T18:30:00Z");
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("formatRelativeTime", () => {
  it("devuelve string (es) para una fecha futura", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const out = formatRelativeTime(future);
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  it("devuelve string para una fecha pasada", () => {
    const past = new Date(Date.now() - 86400_000 * 2).toISOString();
    const out = formatRelativeTime(past);
    expect(typeof out).toBe("string");
  });
});

describe("initialsFromName", () => {
  it("genera 2 iniciales desde nombre completo", () => {
    expect(initialsFromName("Andrés Agudelo")).toBe("AA");
  });

  it("una sola inicial si el nombre es una palabra", () => {
    expect(initialsFromName("Andrés")).toBe("A");
  });

  it("toma solo las primeras dos palabras", () => {
    expect(initialsFromName("Andrés José Agudelo")).toBe("AJ");
  });

  it("devuelve ? si el nombre es null/undefined/vacío", () => {
    expect(initialsFromName(null)).toBe("?");
    expect(initialsFromName(undefined)).toBe("?");
  });
});
