import { describe, it, expect } from "vitest";
import { slugifyName } from "@/lib/profiles/slug";

describe("slugifyName", () => {
  it("quita acentos y normaliza a kebab-case ASCII", () => {
    expect(slugifyName("Juan Pérez García")).toBe("juan-perez-garcia");
  });

  it("colapsa espacios y caracteres no alfanuméricos en un solo guion", () => {
    expect(slugifyName("María José  ---  del Pilar!!")).toBe(
      "maria-jose-del-pilar",
    );
  });

  it("respeta el regex del CHECK de profiles_core.slug", () => {
    const regex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    const samples = [
      "Ana Ñoño",
      "  espacios  alrededor  ",
      "Juan10",
      "Carlos-Andrés",
      "María - José",
    ];
    for (const s of samples) {
      const slug = slugifyName(s);
      expect(regex.test(slug), `slug "${slug}" desde "${s}"`).toBe(true);
    }
  });

  it("devuelve 'usuario' si la entrada queda vacía tras normalizar", () => {
    expect(slugifyName("!!!")).toBe("usuario");
    expect(slugifyName("   ")).toBe("usuario");
    expect(slugifyName("🔥🎉")).toBe("usuario");
  });

  it("trunca a ≤80 chars manteniendo el regex válido", () => {
    const long = "a".repeat(150);
    const slug = slugifyName(long);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)).toBe(true);
  });

  it("no deja guiones al inicio ni al final", () => {
    expect(slugifyName("   -Juan-   ")).toBe("juan");
    expect(slugifyName("---")).toBe("usuario");
  });
});
