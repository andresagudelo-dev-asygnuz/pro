import { redirect } from "next/navigation";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AuthContext = {
  user: User;
  supabase: SupabaseClient;
};

/**
 * Helper DRY para server actions: garantiza que hay sesión, inyecta el
 * Supabase client server-side y el user. Redirige a /login si no hay sesión.
 *
 * Uso:
 *   export async function createMatch(prev, formData) {
 *     return withAuth(async ({ user, supabase }) => {
 *       // lógica con garantía de user autenticado
 *     });
 *   }
 */
export async function withAuth<T>(
  fn: (ctx: AuthContext) => Promise<T>,
): Promise<T> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return fn({ user, supabase });
}
