export { createClient } from './client'
// Uso: const supabase = createClient()  — singleton interno, siempre retorna la misma instancia

// Pre-built singleton — import this directly in hooks/pages instead of calling createClient()
// This avoids createClient() calls outside of lib/
import { createClient } from './client'
export const supabase = createClient()
