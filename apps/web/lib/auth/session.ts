import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/db";

/**
 * Devuelve el user de Supabase o `null` si no hay sesión.
 * Usa `React.cache` para deduplicar llamadas dentro de la misma request.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Fuerza que haya sesión. Redirige a /login si no hay.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Devuelve el profile del usuario logueado (o null).
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

/**
 * Fuerza que haya sesión + profile completo.
 *   - Si no hay sesión → /login
 *   - Si el profile no tiene los campos mínimos → /onboarding
 */
export async function requireCompleteProfile(): Promise<Profile> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as Profile | null;
  if (!profile || !isProfileComplete(profile)) {
    redirect("/onboarding");
  }
  return profile;
}

export function isProfileComplete(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.username &&
      profile.full_name &&
      profile.city &&
      profile.primary_sport_id &&
      profile.primary_skill_level,
  );
}
