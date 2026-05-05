import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Rate limiting backed por Postgres (función `public.check_rate_limit`).
 *
 * Ventajas vs. in-memory: sobrevive a cold starts y funciona con N instancias
 * de Vercel Serverless. El costo es 1 RTT contra Supabase por check; aceptable
 * para endpoints de escritura.
 *
 * La función en la DB sube `count` atómicamente, resetea si pasó la ventana
 * y `raise` con `errcode = P0001` y mensaje `rate_limited: ...` si excede.
 */

export type RateLimitConfig = {
  /** Identificador del recurso — debe encodear acción + sujeto, ej. `login:user@x.com`. */
  key: string;
  /** Máximo de hits dentro de la ventana. */
  max: number;
  /** Ventana en segundos. */
  windowSeconds: number;
};

export type RateLimitResult =
  | { ok: true }
  | { ok: false; error: string };

export async function checkRateLimit(
  supabase: SupabaseClient,
  cfg: RateLimitConfig,
): Promise<RateLimitResult> {
  const { error } = await supabase.rpc("check_rate_limit", {
    p_key: cfg.key,
    p_max: cfg.max,
    p_window_seconds: cfg.windowSeconds,
  });

  if (!error) return { ok: true };

  if (error.code === "P0001" && error.message?.includes("rate_limited")) {
    return {
      ok: false,
      error: "Muchos intentos seguidos. Esperá un momento antes de reintentar.",
    };
  }

  // Si falla la función por otra razón (ej. migración no corrida en dev),
  // NO bloqueamos la operación — degradación suave, pero logueamos.
   
  console.warn("[rate-limit] failed to check, allowing by default:", error);
  return { ok: true };
}

/** Presets comunes. */
export const RATE_LIMITS = {
  // Auth público — agresivo para frenar brute force / spam.
  signIn: { max: 10, windowSeconds: 60 }, // 10 intentos / min por email
  signUp: { max: 5, windowSeconds: 300 }, // 5 signups / 5 min por email
  // Endpoints autenticados — lax (usuarios legítimos no necesitan más).
  sendMessage: { max: 20, windowSeconds: 60 }, // 20 msgs / min
  createMatch: { max: 10, windowSeconds: 300 }, // 10 partidos / 5 min
  joinLeave: { max: 30, windowSeconds: 60 }, // 30 transitions / min
} as const;
