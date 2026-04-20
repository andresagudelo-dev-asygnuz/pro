import { z } from "zod";
import type { SkillLevel } from "@/lib/types/db";

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
