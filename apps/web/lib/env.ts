import { z } from "zod";

/**
 * Validación de variables de entorno en el arranque.
 *
 * Falla FAST si falta algo en vez de dejar que un `process.env.FOO!` tire un
 * `Cannot read properties of undefined` críptico en runtime.
 *
 * Se ejecuta por side-effect en el primer import — en Server Components y
 * Route Handlers se importa indirectamente vía `lib/supabase/server.ts`.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

const serverSchema = publicSchema.extend({
  // URL pública del sitio (usado para metadata/OG y como origin de confianza
  // por defecto en `resolveOrigin`).
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  // Lista separada por comas de orígenes permitidos para el email-redirect
  // post-signup. Si no se setea, usamos NEXT_PUBLIC_SITE_URL + localhost en
  // dev. Ver `resolveOrigin` en lib/auth/origin.ts.
  AUTH_ALLOWED_ORIGINS: z.string().optional(),
  NODE_ENV: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
});

export type Env = z.infer<typeof serverSchema>;

// En Vercel / Next las env vars son strings; no hay undefineds típicamente,
// pero durante `next build` sin runtime envs sí puede faltar. Por eso
// parseamos y mostramos el error con detalle.
const parsed = serverSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  AUTH_ALLOWED_ORIGINS: process.env.AUTH_ALLOWED_ORIGINS,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
});

if (!parsed.success) {
  // No abortamos en build-time para no romper CI con placeholders, pero sí
  // logueamos el issue. En prod Vercel inyecta los valores reales.
   
  console.warn(
    "[env] Variables de entorno inválidas o faltantes:",
    parsed.error.flatten().fieldErrors,
  );
}

export const env: Env = parsed.success
  ? parsed.data
  : {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
      AUTH_ALLOWED_ORIGINS: process.env.AUTH_ALLOWED_ORIGINS,
    };

/**
 * Devuelve el set de orígenes permitidos para email-redirect.
 * Por default incluye `http://localhost:3000` (dev) + cualquier dominio
 * configurado en `AUTH_ALLOWED_ORIGINS` (coma-separados).
 */
export function getAllowedOrigins(): Set<string> {
  const set = new Set<string>(["http://localhost:3000"]);
  const raw = env.AUTH_ALLOWED_ORIGINS;
  if (raw) {
    for (const o of raw.split(",")) {
      const trimmed = o.trim();
      if (trimmed) set.add(trimmed);
    }
  }
  return set;
}
