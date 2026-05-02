import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Cliente Supabase con `service_role` para operaciones privilegiadas
 * server-side:
 *   - Uploads al bucket privado `age-verifications` (RF-007 / ADR-003).
 *   - Inserts administrativos cuando el flujo lo requiere.
 *
 * **NUNCA** importar este módulo desde un Client Component: Next lo marcaría
 * como error por exponer la key al bundle del navegador. Importarlo sólo
 * desde Server Actions o Route Handlers.
 *
 * Si `SUPABASE_SERVICE_ROLE_KEY` no está configurado, devuelve `null` para
 * que el caller decida cómo degradar (ej. error UX controlado).
 */
export function getServiceRoleClient() {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;

  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // `service_role` ignora RLS. La seguridad pasa a ser responsabilidad
    // del código que usa este cliente.
  });
}
