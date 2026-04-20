import { z } from "zod";
import type { SkillLevel, VisibilityLevel } from "@/lib/types/db";
import { IDENTITY_FIELD_KEYS } from "@/lib/types/db";

/**
 * Schemas centralizados de validación de FormData para server actions.
 *
 * Ventajas sobre las validaciones ad-hoc anteriores:
 *   - Único source of truth de reglas (ej. `password.min(8)`).
 *   - Mensajes consistentes en español.
 *   - Conversión + validación en un solo paso.
 *   - Errores estructurados por campo (para resaltar en UI).
 */

const SKILL_LEVELS = [
  "principiante",
  "intermedio",
  "avanzado",
  "pro",
] as const satisfies readonly SkillLevel[];

const emailSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un email.")
  .email("Email inválido.")
  .max(254, "Email demasiado largo.");

const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(128, "Contraseña demasiado larga.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresá tu contraseña."),
});

// Checkbox de HTML: si va marcado llega como "on" (o el value del input), si
// va desmarcado no llega. Convertimos cualquier presencia no-vacía a `true`.
const checkboxToBoolean = z
  .union([z.string(), z.undefined(), z.boolean()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      return s === "on" || s === "true" || s === "1" || s === "yes";
    }
    return false;
  });

// Nota: no hay refine "al menos un rol". La UI permite desmarcar ambos y en
// ese caso el trigger DB `on_auth_user_created_roles` (migración
// 20260417130000) asigna `is_player = true` por defecto (RF-001). Validar
// client-side rompería la promesa UX "si no marcás ninguno te damos jugador".
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z
    .string()
    .trim()
    .min(2, "Ingresá tu nombre completo.")
    .max(80, "Nombre demasiado largo."),
  is_player: checkboxToBoolean,
  is_promoter: checkboxToBoolean,
});

/**
 * Verificación de edad (RF-007).
 *
 * El File no pasa por `formDataToObject`: se valida aparte en la Server Action
 * y aquí sólo declaramos los límites (mime + size) para consumir el mismo
 * schema desde tests unitarios (ver `tests/lib/schemas.test.ts`).
 */
export const AGE_VERIFICATION_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const satisfies readonly string[];

export const AGE_VERIFICATION_MAX_BYTES = 5 * 1024 * 1024;

export const verifyAgeFileSchema = z.object({
  mime_type: z.enum(AGE_VERIFICATION_ALLOWED_MIME, {
    error: () => ({
      message: "Formato no permitido. Subí JPG, PNG o PDF.",
    }),
  }),
  file_size_bytes: z
    .number()
    .int()
    .positive("Archivo vacío.")
    .max(AGE_VERIFICATION_MAX_BYTES, "El archivo supera los 5 MB."),
});

/**
 * Revisión de verificación por admin (HU-002 §6 / PR D Sprint 1).
 *
 * Un `decision` = "aprobada" pasa a estado aprobada (sin motivo requerido).
 * Un `decision` = "rechazada" exige `rejection_reason` (2–500 chars) para
 * que el usuario pueda corregir y reintentar. `menor_edad` no se expone en
 * MVP1: es bloqueo permanente y se setea sólo vía SQL manual (ver ADR-003).
 */
export const REVIEW_DECISIONS = ["aprobada", "rechazada"] as const satisfies readonly [
  "aprobada",
  "rechazada",
];

export const reviewVerificationSchema = z
  .object({
    verification_id: z.string().uuid("ID inválido."),
    decision: z.enum(REVIEW_DECISIONS, {
      error: () => ({ message: "Decisión inválida." }),
    }),
    rejection_reason: z
      .string()
      .trim()
      .max(500, "Motivo demasiado largo (máx 500 caracteres).")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .superRefine((val, ctx) => {
    if (val.decision === "rechazada") {
      const r = val.rejection_reason;
      if (!r || r.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["rejection_reason"],
          message: "Ingresá un motivo (mínimo 2 caracteres).",
        });
      }
    }
  });

export const onboardingSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9_]{3,24}$/,
      "Username: 3 a 24 caracteres, minúsculas, números o guion bajo.",
    ),
  full_name: z.string().trim().min(2, "Ingresá tu nombre.").max(80),
  city: z.string().trim().min(1, "Ingresá tu ciudad.").max(80),
  bio: z
    .string()
    .trim()
    .max(500, "La bio no puede superar los 500 caracteres.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  primary_sport_id: z
    .string()
    .trim()
    .min(1, "Elegí tu deporte principal.")
    .max(40, "Deporte inválido."),
  primary_skill_level: z.enum(SKILL_LEVELS, {
    error: () => ({ message: "Elegí un nivel de juego válido." }),
  }),
});

export const createMatchSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Ingresá un título (mínimo 3 caracteres).")
      .max(120, "Título demasiado largo."),
    description: z
      .string()
      .trim()
      .max(2000, "La descripción no puede superar los 2000 caracteres.")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    sport_id: z
      .string()
      .trim()
      .min(1, "Elegí un deporte.")
      .max(40, "Deporte inválido."),
    city: z.string().trim().min(1, "Indicá la ciudad.").max(80),
    location: z.string().trim().min(1, "Indicá el lugar/cancha.").max(200),
    starts_at: z
      .string()
      .min(1, "Fecha/hora inválida.")
      .transform((raw, ctx) => {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) {
          ctx.addIssue({ code: "custom", message: "Fecha/hora inválida." });
          return z.NEVER;
        }
        if (d.getTime() < Date.now() - 5 * 60_000) {
          ctx.addIssue({
            code: "custom",
            message: "La fecha tiene que ser futura.",
          });
          return z.NEVER;
        }
        return d.toISOString();
      }),
    duration_minutes: z.coerce
      .number()
      .int()
      .positive("Duración inválida.")
      .max(600, "Duración demasiado larga (máx 10 h)."),
    max_players: z.coerce
      .number()
      .int()
      .min(2, "Mínimo 2 jugadores.")
      .max(64, "Máximo 64 jugadores."),
    skill_level: z
      .string()
      .optional()
      .transform((v) => {
        if (!v) return null;
        return (SKILL_LEVELS as readonly string[]).includes(v)
          ? (v as SkillLevel)
          : null;
      }),
  })
  .strict();

export const sendMessageSchema = z.object({
  match_id: z.string().uuid(),
  content: z.string().trim().min(1).max(2000, "Mensaje demasiado largo."),
});

/**
 * Perfil tipo ficha · Bloque 1 Identidad (HU-003 / RF-002).
 *
 * Reglas espejo de los CHECK constraints de `public.profiles_core` en la
 * migración `20260417140000`:
 *   - full_name: 2..120 chars.
 *   - birth_date: YYYY-MM-DD, ≥ 18 años (chequeo client-side; server repite).
 *   - city: 2..80 chars.
 *   - region: opcional, 1..80 chars cuando viene.
 *   - country: ISO alpha-2, 2 chars.
 *   - primary_sport_id: referencia a `public.sports` (validado server-side).
 *   - interests: hasta 10 ítems separados por coma.
 *   - soft_skills_text: 0..1000 chars.
 *   - soft_skills_tags: hasta 10 ids de catálogo (validados contra
 *     `skill_tags` server-side).
 *   - slug: 3..80, minúsculas/dígitos/guiones.
 */
export const VISIBILITY_LEVEL_VALUES = [
  "publico",
  "promotores",
  "privado",
] as const satisfies readonly VisibilityLevel[];

const MIN_BIRTH = "1900-01-01";

function yearsBetween(fromIso: string, nowIso: string): number {
  const from = new Date(fromIso);
  const now = new Date(nowIso);
  let years = now.getUTCFullYear() - from.getUTCFullYear();
  const m = now.getUTCMonth() - from.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < from.getUTCDate())) years -= 1;
  return years;
}

export const identityBlockSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Ingresá tu nombre completo (mínimo 2 caracteres).")
      .max(120, "Nombre demasiado largo (máx 120 caracteres)."),
    birth_date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (formato AAAA-MM-DD)."),
    city: z
      .string()
      .trim()
      .min(2, "Ingresá tu ciudad (mínimo 2 caracteres).")
      .max(80, "Ciudad demasiado larga."),
    region: z
      .string()
      .trim()
      .max(80, "Región demasiado larga.")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Código de país ISO alpha-2 (ej. CO, AR, MX)."),
    primary_sport_id: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Elegí tu deporte principal.")
      .max(40, "Deporte inválido."),
    interests_raw: z
      .string()
      .trim()
      .max(400, "La lista de intereses es demasiado larga.")
      .optional()
      .transform((v) => {
        if (!v) return [] as string[];
        return v
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .slice(0, 10);
      }),
    soft_skills_text: z
      .string()
      .trim()
      .max(1000, "Máx 1000 caracteres.")
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    soft_skills_tags_raw: z
      .string()
      .trim()
      .max(400, "Demasiadas habilidades seleccionadas.")
      .optional()
      .transform((v) => {
        if (!v) return [] as string[];
        return Array.from(
          new Set(
            v
              .split(",")
              .map((s) => s.trim())
              .filter((s) => s.length > 0),
          ),
        ).slice(0, 10);
      }),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "Slug: sólo minúsculas, números y guiones (sin espacios).",
      )
      .min(3, "Slug muy corto (mínimo 3 caracteres).")
      .max(80, "Slug demasiado largo (máx 80 caracteres)."),
  })
  .superRefine((val, ctx) => {
    // El regex valida forma pero no semántica (p. ej. "2000-13-01" pasa).
    // Chequear con Date y comparar round-trip evita que valores inválidos
    // salteen la verificación de edad por NaN (NaN < 18 === false).
    const parsed = new Date(`${val.birth_date}T00:00:00Z`);
    const roundTrip = Number.isNaN(parsed.getTime())
      ? null
      : parsed.toISOString().slice(0, 10);
    if (roundTrip !== val.birth_date) {
      ctx.addIssue({
        code: "custom",
        path: ["birth_date"],
        message: "Fecha inválida.",
      });
      return;
    }
    if (val.birth_date < MIN_BIRTH) {
      ctx.addIssue({
        code: "custom",
        path: ["birth_date"],
        message: "Fecha demasiado antigua.",
      });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (val.birth_date > today) {
      ctx.addIssue({
        code: "custom",
        path: ["birth_date"],
        message: "La fecha no puede estar en el futuro.",
      });
      return;
    }
    const age = yearsBetween(val.birth_date, today);
    if (age < 18) {
      ctx.addIssue({
        code: "custom",
        path: ["birth_date"],
        message: "Tenés que ser mayor de 18 años.",
      });
    }
  });

/**
 * Visibilidad por campo (HU-003 §1 / ADR-002).
 *
 * El `field_key` debe pertenecer al catálogo `visibility_fields`. Para PR B
 * lo acotamos al bloque 1 (identity.*); PR C/D ampliarán a morpho/conditional/
 * technical.football.
 */
export const fieldVisibilitySchema = z.object({
  field_key: z.enum(IDENTITY_FIELD_KEYS, {
    error: () => ({ message: "Campo inválido." }),
  }),
  level: z.enum(VISIBILITY_LEVEL_VALUES, {
    error: () => ({ message: "Nivel de visibilidad inválido." }),
  }),
});

/**
 * Convierte el resultado de `safeParse` en un `Record<string,string>` para
 * renderear errores por campo en los Forms. Devuelve null si no hubo error.
 */
type SafeParseLike =
  | { success: true }
  | { success: false; error: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> } };

export function zFieldErrors(
  result: SafeParseLike,
): Record<string, string> | null {
  if (result.success) return null;
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.map(String).join(".");
    if (!out[path]) out[path] = issue.message;
  }
  return out;
}

export function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    // Filter Next.js server-action internals ($ACTION_REF_1, $ACTION_1:0, etc.)
    // which break Zod schemas declared with `.strict()`.
    if (key.startsWith("$")) continue;
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}
