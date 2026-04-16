"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SkillLevel } from "@/lib/types/db";

export type ProfileState = {
  error?: string;
};

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
const SKILL_LEVELS: SkillLevel[] = [
  "principiante",
  "intermedio",
  "avanzado",
  "pro",
];

export async function saveOnboarding(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const full_name = String(formData.get("full_name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const primary_sport_id = String(formData.get("primary_sport_id") ?? "").trim();
  const primary_skill_level = String(
    formData.get("primary_skill_level") ?? "",
  ).trim() as SkillLevel;

  if (!USERNAME_RE.test(username)) {
    return {
      error: "Username: 3 a 24 caracteres, minúsculas, números o guion bajo.",
    };
  }
  if (!full_name) return { error: "Ingresá tu nombre completo." };
  if (!city) return { error: "Ingresá tu ciudad." };
  if (!primary_sport_id) return { error: "Elegí tu deporte principal." };
  if (!SKILL_LEVELS.includes(primary_skill_level)) {
    return { error: "Elegí un nivel de juego válido." };
  }

  // Upsert: el trigger on_auth_user_created ya insertó un row, nosotros
  // actualizamos con los datos del onboarding (o creamos si faltase).
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      username,
      full_name,
      city,
      bio,
      primary_sport_id,
      primary_skill_level,
    },
    { onConflict: "id" },
  );

  if (error) {
    if (error.code === "23505") {
      return { error: "Ese username ya está tomado, probá otro." };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/feed");
}
