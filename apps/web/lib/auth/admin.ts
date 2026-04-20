import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "@/lib/env";
import { getUser } from "@/lib/auth/session";

/**
 * Admin gating — MVP1 (HU-002 §6 / PR D Sprint 1).
 *
 * El sprint plan permite dos caminos para gatear la cola de verificaciones:
 *   a) Whitelist de emails por env (`ADMIN_EMAILS` coma-separados).
 *   b) RLS con service_role (el admin no existe como usuario en auth).
 *
 * Elegimos (a) porque:
 *   - No agrega columnas ni tablas nuevas (cero migración en PR D).
 *   - El admin es un usuario humano con email real, no un bot.
 *   - Al escalar, migraremos a una tabla `admins` con auditoría en post-MVP.
 *
 * La comparación es case-insensitive y tolera espacios alrededor de cada email
 * en la lista. Si `ADMIN_EMAILS` no está seteada, nadie es admin.
 */

/** Set memoizado de emails admin en lowercase. */
function parseAdminEmails(raw: string | undefined): Set<string> {
  const set = new Set<string>();
  if (!raw) return set;
  for (const e of raw.split(",")) {
    const trimmed = e.trim().toLowerCase();
    if (trimmed) set.add(trimmed);
  }
  return set;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const set = parseAdminEmails(env.ADMIN_EMAILS);
  return set.has(email.trim().toLowerCase());
}

/**
 * Devuelve el usuario logueado si es admin, o `null` en cualquier otro caso
 * (sin sesión, email no en whitelist, whitelist vacía).
 *
 * `React.cache` deduplica la llamada dentro del mismo render tree. Útil para
 * decidir si mostrar un link "Admin" en el nav sin redirigir.
 */
export const getAdminUser = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  if (!isAdminEmail(user.email)) return null;
  return user;
});

/**
 * Guard para rutas bajo `/admin/*`. Redirige:
 *   - Sin sesión → /login.
 *   - Sesión pero email no en whitelist → /feed (no revelamos la existencia
 *     de rutas admin ni con 403 ni con notFound; para un no-admin "no existe").
 */
export async function requireAdmin() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) redirect("/feed");
  return user;
}
