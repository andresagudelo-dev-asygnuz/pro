import { describe, it, expect } from "vitest";
import { safeRelativePath } from "@/lib/validation/safe-path";

describe("safeRelativePath", () => {
  it("acepta paths relativos que empiezan con /", () => {
    expect(safeRelativePath("/feed")).toBe("/feed");
    expect(safeRelativePath("/matches/123")).toBe("/matches/123");
    expect(safeRelativePath("/onboarding?step=2")).toBe("/onboarding?step=2");
  });

  it("rechaza protocol-relative urls (//evil.com)", () => {
    expect(safeRelativePath("//evil.com")).toBeNull();
    expect(safeRelativePath("//evil.com/phishing")).toBeNull();
  });

  it("rechaza backslash tricks (/\\evil.com)", () => {
    expect(safeRelativePath("/\\evil.com")).toBeNull();
  });

  it("rechaza urls absolutas", () => {
    expect(safeRelativePath("https://evil.com")).toBeNull();
    expect(safeRelativePath("http://evil.com")).toBeNull();
    expect(safeRelativePath("javascript:alert(1)")).toBeNull();
  });

  it("rechaza strings vacías o nulas", () => {
    expect(safeRelativePath("")).toBeNull();
    expect(safeRelativePath(null)).toBeNull();
    expect(safeRelativePath(undefined)).toBeNull();
  });

  it("rechaza paths sin / inicial", () => {
    expect(safeRelativePath("feed")).toBeNull();
    expect(safeRelativePath("matches/123")).toBeNull();
  });
});
