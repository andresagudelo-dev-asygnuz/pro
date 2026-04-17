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

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: z
    .string()
    .trim()
    .min(2, "Ingresá tu nombre completo.")
    .max(80, "Nombre demasiado largo."),
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
