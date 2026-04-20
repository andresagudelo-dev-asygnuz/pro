import { describe, it, expect } from "vitest";
import {
  signInSchema,
  signUpSchema,
  onboardingSchema,
  createMatchSchema,
  sendMessageSchema,
  verifyAgeFileSchema,
  AGE_VERIFICATION_MAX_BYTES,
  formDataToObject,
  zFieldErrors,
  reviewVerificationSchema,
  identityBlockSchema,
  fieldVisibilitySchema,
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

describe("verifyAgeFileSchema", () => {
  it("acepta JPG/PNG/PDF dentro del tamaño máximo", () => {
    for (const mime of ["image/jpeg", "image/png", "application/pdf"]) {
      const r = verifyAgeFileSchema.safeParse({
        mime_type: mime,
        file_size_bytes: 1024,
      });
      expect(r.success, `mime=${mime}`).toBe(true);
    }
  });

  it("rechaza mime no permitido (ej. heic, docx)", () => {
    for (const mime of [
      "image/heic",
      "image/webp",
      "application/msword",
      "text/plain",
    ]) {
      const r = verifyAgeFileSchema.safeParse({
        mime_type: mime,
        file_size_bytes: 1024,
      });
      expect(r.success, `mime=${mime}`).toBe(false);
    }
  });

  it("rechaza archivo vacío o negativo", () => {
    expect(
      verifyAgeFileSchema.safeParse({
        mime_type: "image/jpeg",
        file_size_bytes: 0,
      }).success,
    ).toBe(false);
    expect(
      verifyAgeFileSchema.safeParse({
        mime_type: "image/jpeg",
        file_size_bytes: -1,
      }).success,
    ).toBe(false);
  });

  it(`rechaza archivo > ${AGE_VERIFICATION_MAX_BYTES} bytes (5 MB)`, () => {
    const r = verifyAgeFileSchema.safeParse({
      mime_type: "image/jpeg",
      file_size_bytes: AGE_VERIFICATION_MAX_BYTES + 1,
    });
    expect(r.success).toBe(false);
  });

  it("acepta exactamente el máximo permitido (5 MB exacto)", () => {
    const r = verifyAgeFileSchema.safeParse({
      mime_type: "application/pdf",
      file_size_bytes: AGE_VERIFICATION_MAX_BYTES,
    });
    expect(r.success).toBe(true);
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

describe("reviewVerificationSchema", () => {
  const baseApprove = {
    verification_id: UUID,
    decision: "aprobada",
  };

  it("acepta aprobada sin motivo", () => {
    const r = reviewVerificationSchema.safeParse(baseApprove);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.rejection_reason).toBeNull();
  });

  it("acepta rechazada con motivo válido", () => {
    const r = reviewVerificationSchema.safeParse({
      verification_id: UUID,
      decision: "rechazada",
      rejection_reason: "Foto borrosa, no se ve la fecha.",
    });
    expect(r.success).toBe(true);
    if (r.success)
      expect(r.data.rejection_reason).toBe("Foto borrosa, no se ve la fecha.");
  });

  it("rechaza rechazada sin motivo", () => {
    const r = reviewVerificationSchema.safeParse({
      verification_id: UUID,
      decision: "rechazada",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const err = zFieldErrors(r);
      expect(err?.rejection_reason).toBeTruthy();
    }
  });

  it("rechaza rechazada con motivo vacío/espacios", () => {
    const r = reviewVerificationSchema.safeParse({
      verification_id: UUID,
      decision: "rechazada",
      rejection_reason: "   ",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza motivo > 500 chars", () => {
    const r = reviewVerificationSchema.safeParse({
      verification_id: UUID,
      decision: "rechazada",
      rejection_reason: "x".repeat(501),
    });
    expect(r.success).toBe(false);
  });

  it("rechaza decision desconocida (ej. menor_edad via UI)", () => {
    const r = reviewVerificationSchema.safeParse({
      verification_id: UUID,
      decision: "menor_edad",
      rejection_reason: "no aplica",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza verification_id no UUID", () => {
    const r = reviewVerificationSchema.safeParse({
      verification_id: "not-a-uuid",
      decision: "aprobada",
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// identityBlockSchema + fieldVisibilitySchema (HU-003 PR B)
// ---------------------------------------------------------------------------

const ID_VALID = {
  full_name: "Juan Pérez",
  birth_date: "2000-03-15",
  city: "Manizales",
  region: "Caldas",
  country: "CO",
  primary_sport_id: "futbol",
  interests_raw: "senderismo, nutrición deportiva",
  soft_skills_text: "Liderazgo bajo presión.",
  soft_skills_tags_raw: "soft.liderazgo,soft.disciplina",
  slug: "juan-perez",
};

describe("identityBlockSchema", () => {
  it("acepta un payload válido y normaliza arrays + country upper", () => {
    const r = identityBlockSchema.safeParse({ ...ID_VALID, country: "co" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.country).toBe("CO");
    expect(r.data.interests_raw).toEqual([
      "senderismo",
      "nutrición deportiva",
    ]);
    expect(r.data.soft_skills_tags_raw).toEqual([
      "soft.liderazgo",
      "soft.disciplina",
    ]);
    expect(r.data.region).toBe("Caldas");
  });

  it("rechaza menores de 18", () => {
    const today = new Date();
    const tooYoung = `${today.getFullYear() - 17}-01-01`;
    const r = identityBlockSchema.safeParse({
      ...ID_VALID,
      birth_date: tooYoung,
    });
    expect(r.success).toBe(false);
    if (r.success) return;
    const msg = r.error.issues.find((i) => i.path[0] === "birth_date")?.message;
    expect(msg).toContain("mayor de 18");
  });

  it("rechaza fechas en el futuro", () => {
    const r = identityBlockSchema.safeParse({
      ...ID_VALID,
      birth_date: "2999-01-01",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza fechas demasiado antiguas (< 1900)", () => {
    const r = identityBlockSchema.safeParse({
      ...ID_VALID,
      birth_date: "1899-12-31",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza fechas semánticamente inválidas que pasan el regex", () => {
    // Casos que el regex /^\d{4}-\d{2}-\d{2}$/ acepta pero son inválidos.
    // Antes del round-trip, "2000-13-01" y "2000-02-30" producían NaN en
    // `yearsBetween` y `NaN < 18 === false`, salteando el check de edad.
    const invalid = [
      "2000-13-01", // mes 13
      "2000-00-15", // mes 00
      "2000-02-30", // 30 de febrero
      "2000-04-31", // 31 de abril
      "2000-12-32", // día 32
    ];
    for (const birth_date of invalid) {
      const r = identityBlockSchema.safeParse({ ...ID_VALID, birth_date });
      expect(r.success, `birth_date="${birth_date}"`).toBe(false);
      if (r.success) continue;
      const msg = r.error.issues.find((i) => i.path[0] === "birth_date")
        ?.message;
      expect(msg).toBe("Fecha inválida.");
    }
  });

  it("rechaza slug con mayúsculas o espacios", () => {
    const bad = ["Juan Perez", "juan_perez", "juan--perez", "ju", "-juan"];
    for (const slug of bad) {
      const r = identityBlockSchema.safeParse({ ...ID_VALID, slug });
      expect(r.success, `slug="${slug}"`).toBe(false);
    }
  });

  it("acepta slug con números y guion simple", () => {
    const r = identityBlockSchema.safeParse({ ...ID_VALID, slug: "juan-perez-10" });
    expect(r.success).toBe(true);
  });

  it("acota intereses a 10 ítems y descarta vacíos", () => {
    const many = Array.from({ length: 15 }, (_, i) => `interes${i + 1}`).join(", ");
    const r = identityBlockSchema.safeParse({ ...ID_VALID, interests_raw: many });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.interests_raw).toHaveLength(10);
  });

  it("rechaza country que no sea ISO alpha-2", () => {
    for (const bad of ["COL", "C", "123", ""]) {
      const r = identityBlockSchema.safeParse({ ...ID_VALID, country: bad });
      expect(r.success, `country="${bad}"`).toBe(false);
    }
  });

  it("normaliza region vacío a null", () => {
    const r = identityBlockSchema.safeParse({ ...ID_VALID, region: "   " });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.region).toBeNull();
  });

  it("deduplica soft_skills_tags_raw y acota a 10", () => {
    const raw = [
      "soft.liderazgo",
      "soft.liderazgo",
      "soft.disciplina",
      ...Array.from({ length: 15 }, (_, i) => `extra.${i}`),
    ].join(",");
    const r = identityBlockSchema.safeParse({
      ...ID_VALID,
      soft_skills_tags_raw: raw,
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.soft_skills_tags_raw).toHaveLength(10);
    const unique = new Set(r.data.soft_skills_tags_raw);
    expect(unique.size).toBe(r.data.soft_skills_tags_raw.length);
  });
});

describe("fieldVisibilitySchema", () => {
  it("acepta un field_key de identity + nivel válido", () => {
    const r = fieldVisibilitySchema.safeParse({
      field_key: "identity.full_name",
      level: "publico",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza field_keys fuera del bloque identity (vendrán en PR C)", () => {
    const r = fieldVisibilitySchema.safeParse({
      field_key: "morpho.height_m",
      level: "privado",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza niveles no soportados", () => {
    const r = fieldVisibilitySchema.safeParse({
      field_key: "identity.city",
      level: "amigos",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza nivel con acento (la DB usa ASCII)", () => {
    const r = fieldVisibilitySchema.safeParse({
      field_key: "identity.city",
      level: "público",
    });
    expect(r.success).toBe(false);
  });
});
