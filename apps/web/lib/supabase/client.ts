import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * Use in Client Components (files with "use client").
 *
 * Nota: en el browser NO podemos importar `@/lib/env` porque ese módulo
 * toca `process.env` en runtime (está permitido, pero Next ya inyecta
 * las `NEXT_PUBLIC_*` al bundle). Evitamos el import para no arrastrar
 * `zod` al cliente sin necesidad.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
