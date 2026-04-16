"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SkillLevel } from "@/lib/types/db";

export type MatchFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<
      | "title"
      | "sport_id"
      | "city"
      | "location"
      | "starts_at"
      | "duration_minutes"
      | "max_players",
      string
    >
  >;
};

const SKILL_LEVELS: SkillLevel[] = [
  "principiante",
  "intermedio",
  "avanzado",
  "pro",
];

export async function createMatch(
  _prev: MatchFormState,
  formData: FormData,
): Promise<MatchFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const sport_id = String(formData.get("sport_id") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const starts_at_raw = String(formData.get("starts_at") ?? "").trim();
  const duration_minutes = Number(formData.get("duration_minutes") ?? 60);
  const max_players = Number(formData.get("max_players") ?? 0);
  const skill_level_raw = String(
    formData.get("skill_level") ?? "",
  ).trim() as SkillLevel | "";

  const fieldErrors: MatchFormState["fieldErrors"] = {};
  if (!title) fieldErrors.title = "Ingresá un título.";
  if (!sport_id) fieldErrors.sport_id = "Elegí un deporte.";
  if (!city) fieldErrors.city = "Indicá la ciudad.";
  if (!location) fieldErrors.location = "Indicá el lugar/cancha.";
  const startsDate = starts_at_raw ? new Date(starts_at_raw) : null;
  if (!startsDate || Number.isNaN(startsDate.getTime())) {
    fieldErrors.starts_at = "Fecha/hora inválida.";
  } else if (startsDate.getTime() < Date.now() - 5 * 60_000) {
    fieldErrors.starts_at = "La fecha tiene que ser futura.";
  }
  if (!Number.isFinite(duration_minutes) || duration_minutes <= 0) {
    fieldErrors.duration_minutes = "Duración inválida.";
  }
  if (!Number.isFinite(max_players) || max_players < 2) {
    fieldErrors.max_players = "Mínimo 2 jugadores.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { error: "Revisá los campos marcados.", fieldErrors };
  }

  const skill_level =
    skill_level_raw && SKILL_LEVELS.includes(skill_level_raw as SkillLevel)
      ? (skill_level_raw as SkillLevel)
      : null;

  const { data, error } = await supabase
    .from("matches")
    .insert({
      organizer_id: user.id,
      sport_id,
      title,
      description,
      skill_level,
      city,
      location,
      starts_at: startsDate!.toISOString(),
      duration_minutes,
      max_players,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Auto-join al organizador como participante.
  await supabase.from("match_participants").insert({
    match_id: data.id,
    user_id: user.id,
    status: "joined",
  });

  revalidatePath("/feed");
  redirect(`/matches/${data.id}`);
}

export type JoinResult = { ok: true } | { ok: false; error: string };

export async function joinMatch(matchId: string): Promise<JoinResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Defense-in-depth check previo al insert (el trigger es la garantía real).
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select("id, max_players, status")
    .eq("id", matchId)
    .single();
  if (matchErr || !match) return { ok: false, error: "Partido no encontrado." };
  if (match.status !== "open") {
    return { ok: false, error: "El partido ya no admite nuevos jugadores." };
  }
  const { count, error: countErr } = await supabase
    .from("match_participants")
    .select("*", { count: "exact", head: true })
    .eq("match_id", matchId);
  if (countErr) return { ok: false, error: countErr.message };
  if ((count ?? 0) >= match.max_players) {
    return { ok: false, error: "El partido ya está completo." };
  }

  const { error } = await supabase.from("match_participants").insert({
    match_id: matchId,
    user_id: user.id,
    status: "joined",
  });

  if (error) {
    // 23505 = unique violation (ya estaba unido → no-op)
    if (error.code === "23505") {
      revalidatePath(`/matches/${matchId}`);
      return { ok: true };
    }
    // P0001 → raise del trigger de capacidad (condición de carrera resuelta).
    if (error.code === "P0001" && error.message.includes("match_full")) {
      return { ok: false, error: "El partido ya está completo." };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/feed");
  return { ok: true };
}

export async function leaveMatch(matchId: string): Promise<JoinResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("match_participants")
    .delete()
    .eq("match_id", matchId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/feed");
  return { ok: true };
}

export async function sendMessage(matchId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) return;
  if (trimmed.length > 2000) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("messages").insert({
    match_id: matchId,
    sender_id: user.id,
    content: trimmed,
  });

  if (error) throw error;
  // No revalidamos — el chat recibe por Realtime en el cliente.
}
