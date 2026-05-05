import { headers } from "next/headers";
import { getAllowedOrigins } from "@/lib/env";

/**
 * Resuelve el origin del request en runtime para el email-redirect de
 * Supabase. Endurecido contra tres vectores:
 *
 *  1. **Comma-separated headers** (CDN → LB → app): `x-forwarded-*` puede
 *     traer "https, http" si pasa por múltiples proxies. Siempre tomamos
 *     el primer valor.
 *  2. **Host-header poisoning**: aceptamos `Origin` si está en el allowlist;
 *     si no, reconstruimos desde `x-forwarded-host`/`host` y volvemos a
 *     chequear contra allowlist. Si nada matchea, caemos al primer origin
 *     del allowlist (origen de confianza conocido).
 *  3. **Localhost en prod**: el fallback final siempre es un dominio listado,
 *     nunca localhost si no estamos en dev.
 */
export async function resolveOrigin(): Promise<string> {
  const hdrs = await headers();
  const allowed = getAllowedOrigins();

  // 1. Browser `Origin` header — si coincide con el allowlist, lo usamos.
  const rawOrigin = hdrs.get("origin");
  if (rawOrigin) {
    const origin = rawOrigin.split(",")[0]?.trim();
    if (origin && allowed.has(origin)) return origin;
  }

  // 2. Reconstruimos desde proxy headers (Vercel setea x-forwarded-*).
  const forwardedHost = hdrs.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? hdrs.get("host")?.split(",")[0]?.trim();
  if (host) {
    const proto =
      hdrs.get("x-forwarded-proto")?.split(",")[0]?.trim() ??
      (host.startsWith("localhost") ? "http" : "https");
    const reconstructed = `${proto}://${host}`;
    if (allowed.has(reconstructed)) return reconstructed;
  }

  // 3. Fallback seguro: primer origin del allowlist.
  const first = allowed.values().next().value;
  return first ?? "http://localhost:3000";
}
