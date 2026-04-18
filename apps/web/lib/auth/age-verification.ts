import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AgeVerification } from "@/lib/types/db";
import { getUser } from "@/lib/auth/session";

/**
 * Devuelve la verificación de edad más reciente del usuario logueado, o null
 * si no hay sesión o no existe ninguna.
 *
 * Usa `React.cache` para deduplicar dentro del mismo render tree.
 */
export const getAgeVerification = cache(
  async (): Promise<AgeVerification | null> => {
    const user = await getUser();
    if (!user) return null;
    const supabase = await createClient();
    const { data } = await supabase
      .from("age_verifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as AgeVerification | null) ?? null;
  },
);

/**
 * Guard para rutas que requieren verificación `aprobada` (HU-002 §4 / ADR-003).
 *
 * - Sin sesión → delega en `requireUser` (redirect /login) vía `getUser()`.
 * - Sin fila o status ≠ aprobada → redirect a `/verificacion`.
 *
 * Sprint 1 crea el helper; Sprint 3 (HU-004) lo usa desde la ruta de
 * inscripción a torneo como capa UX sobre `ensure_verification_aprobada`
 * de Postgres.
 */
export async function requireAgeVerificationAprobada(): Promise<AgeVerification> {
  const av = await getAgeVerification();
  if (!av) redirect("/verificacion");
  if (av.status !== "aprobada") redirect("/verificacion");
  return av;
}
