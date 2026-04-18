import { describe, it, expect } from "vitest";
import {
  signInSchema,
  signUpSchema,
  onboardingSchema,
  createMatchSchema,
  sendMessageSchema,
  formDataToObject,
  zFieldErrors,
} from "@/lib/validation/schemas";

const UUID = "00000000-0000-4000-8000-000000000000";
const SPORT_ID = "futbol";

describe("signInSchema", () => {
  it("acepta credenciales válidas", () => {
    const r = signInSchema.safeParse({ email: "a@b.com", password: "x" });
    expect(r.success).toBe(true);
  });
  it("rechaza emails inválidos", () => {
    const r = signInSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(r.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const base = {
    email: "a@b.com",
    password: "12345678",
    full_name: "Nombre",
    is_player: "on",
  };

  it("exige password >= 8 chars", () => {
    const short = signUpSchema.safeParse({ ...base, password: "1234567" });
    expect(short.success).toBe(false);

    const ok = signUpSchema.safeParse(base);
    expect(ok.success).toBe(true);
  });

  it("rechaza password > 128 chars", () => {
    const r = signUpSchema.safeParse({ ...base, password: "x".repeat(129) });
    expect(r.success).toBe(false);
  });

  it("rechaza full_name muy corto", () => {
    const r = signUpSchema.safeParse({ ...base, full_name: "A" });
    expect(r.success).toBe(false);
  });

  it("interpreta checkboxes HTML: 'on' => true, ausente => false", () => {
    const r = signUpSchema.safeParse({ ...base, is_promoter: "on" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.is_player).toBe(true);
      expect(r.data.is_promoter).toBe(true);
    }

    const onlyPlayer = signUpSchema.safeParse({ ...base });
    expect(onlyPlayer.success).toBe(true);
    if (onlyPlayer.success) {
      expect(onlyPlayer.data.is_player).toBe(true);
      expect(onlyPlayer.data.is_promoter).toBe(false);
    }
  });

  it("ambos desmarcados => schema OK (el trigger DB aplica default is_player=true)", () => {
    const r = signUpSchema.safeParse({
      email: "a@b.com",
      password: "12345678",
      full_name: "Nombre",
      // is_player / is_promoter ausentes
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.is_player).toBe(false);
      expect(r.data.is_promoter).toBe(false);
    }
  });

  it("acepta sólo promotor", () => {
    const r = signUpSchema.safeParse({
      email: "a@b.com",
      password: "12345678",
      full_name: "Nombre",
      is_promoter: "on",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.is_player).toBe(false);
      expect(r.data.is_promoter).toBe(true);
    }
  });
});

describe("onboardingSchema", () => {
  it("normaliza username a lowercase", () => {
    const r = onboardingSchema.safeParse({
      username: "ANDRES_GK",
      full_name: "Andrés",
      city: "Manizales",
      primary_sport_id: SPORT_ID,
      primary_skill_level: "intermedio",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.username).toBe("andres_gk");
  });

  it("rechaza usernames con caracteres inválidos", () => {
    const r = onboardingSchema.safeParse({
      username: "andrés!",
      full_name: "A",
      city: "X",
      primary_sport_id: SPORT_ID,
      primary_skill_level: "intermedio",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza bio > 500 chars", () => {
    const r = onboardingSchema.safeParse({
      username: "andres",
      full_name: "Andrés",
      city: "Manizales",
      bio: "x".repeat(501),
      primary_sport_id: SPORT_ID,
      primary_skill_level: "intermedio",
    });
    expect(r.success).toBe(false);
  });

  it("convierte bio vacía en null", () => {
    const r = onboardingSchema.safeParse({
      username: "andres",
      full_name: "Andrés",
      city: "Manizales",
      bio: "",
      primary_sport_id: SPORT_ID,
      primary_skill_level: "intermedio",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.bio).toBeNull();
  });
});

describe("createMatchSchema", () => {
  const base = {
    title: "Futbol 5",
    sport_id: SPORT_ID,
    city: "Manizales",
    location: "Cancha",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    duration_minutes: "60",
    max_players: "10",
  };

  it("acepta un partido futuro válido", () => {
    const r = createMatchSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("rechaza fechas pasadas", () => {
    const r = createMatchSchema.safeParse({
      ...base,
      starts_at: new Date(Date.now() - 86400000).toISOString(),
    });
    expect(r.success).toBe(false);
  });

  it("rechaza title muy corto", () => {
    const r = createMatchSchema.safeParse({ ...base, title: "ab" });
    expect(r.success).toBe(false);
  });

  it("rechaza descripción > 2000 chars", () => {
    const r = createMatchSchema.safeParse({ ...base, description: "x".repeat(2001) });
    expect(r.success).toBe(false);
  });

  it("rechaza max_players fuera de 2..64", () => {
    expect(createMatchSchema.safeParse({ ...base, max_players: "1" }).success).toBe(false);
    expect(createMatchSchema.safeParse({ ...base, max_players: "100" }).success).toBe(false);
  });

  it("coerce duration_minutes y max_players desde strings", () => {
    const r = createMatchSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.duration_minutes).toBe(60);
      expect(r.data.max_players).toBe(10);
    }
  });

  it("ignora skill_level inválido (lo convierte a null)", () => {
    const r = createMatchSchema.safeParse({ ...base, skill_level: "wizard" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.skill_level).toBeNull();
  });
});

describe("sendMessageSchema", () => {
  it("rechaza mensajes > 2000 chars", () => {
    const r = sendMessageSchema.safeParse({
      match_id: UUID,
      content: "x".repeat(2001),
    });
    expect(r.success).toBe(false);
  });

  it("rechaza mensajes vacíos", () => {
    expect(sendMessageSchema.safeParse({ match_id: UUID, content: "   " }).success).toBe(
      false,
    );
  });

  it("rechaza match_id no UUID", () => {
    expect(sendMessageSchema.safeParse({ match_id: "not-uuid", content: "hi" }).success).toBe(
      false,
    );
  });
});

describe("formDataToObject", () => {
  it("convierte FormData a plain object", () => {
    const fd = new FormData();
    fd.set("a", "1");
    fd.set("b", "2");
    expect(formDataToObject(fd)).toEqual({ a: "1", b: "2" });
  });

  it("descarta claves internas de Next server actions ($ACTION_*)", () => {
    const fd = new FormData();
    fd.set("$ACTION_REF_1", "");
    fd.set("$ACTION_1:0", '{"id":"abc"}');
    fd.set("$ACTION_KEY", "k");
    fd.set("title", "ok");
    expect(formDataToObject(fd)).toEqual({ title: "ok" });
  });
});

describe("zFieldErrors", () => {
  it("devuelve null si parse ok", () => {
    const r = signInSchema.safeParse({ email: "a@b.com", password: "x" });
    expect(zFieldErrors(r)).toBeNull();
  });

  it("devuelve record de campo → mensaje cuando falla", () => {
    const r = signInSchema.safeParse({ email: "bad", password: "" });
    const err = zFieldErrors(r);
    expect(err).not.toBeNull();
    expect(err?.email).toBeTruthy();
    expect(err?.password).toBeTruthy();
  });
});
