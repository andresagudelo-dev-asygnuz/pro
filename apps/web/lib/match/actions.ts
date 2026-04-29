"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withAuth } from "@/lib/auth/with-auth";
import { mapDbError } from "@/lib/errors/map-db-error";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  createMatchSchema,
  formDataToObject,
  sendMessageSchema,
  zFieldErrors,
} from "@/lib/validation/schemas";

export type MatchFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createMatch(
  _prev: MatchFormState,
  formData: FormData,
): Promise<MatchFormState> {
  const parsed = createMatchSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return {
      error: "Revisá los campos marcados.",
      fieldErrors: zFieldErrors(parsed) ?? undefined,
    };
  }
  const input = parsed.data;

  return withAuth(async ({ user, supabase }) => {
    const rl = await checkRateLimit(supabase, {
      key: `create-match:${user.id}`,
      ...RATE_LIMITS.createMatch,
    });
    if (!rl.ok) return { error: rl.error };

    const courtId = formData.get("court_id") as string;
    const manualLocation = formData.get("location") as string;

    if ((!courtId || courtId === "manual") && !manualLocation) {
      return {
        error: "Revisá los campos marcados.",
        fieldErrors: { location: "Indicá el lugar o seleccioná una cancha." },
      };
    }

    const { data, error } = await supabase
      .from("matches")
      .insert({
        organizer_id: user.id,
        sport_id: input.sport_id,
        title: input.title,
        description: input.description,
        skill_level: input.skill_level,
        city: input.city,
        location: input.location,
        starts_at: input.starts_at,
        duration_minutes: input.duration_minutes,
        max_players: input.max_players,
      })
      .select("id")
      .single();

    if (error) return { error: mapDbError(error, "createMatch") };

    // Si se seleccionó una cancha, crear la reserva
    if (courtId && courtId !== "manual") {
      const start = new Date(input.starts_at);
      const end = new Date(start.getTime() + input.duration_minutes * 60000);

      await supabase.from("venue_reservations").insert({
        court_id: courtId,
        match_id: data.id,
        reserved_by: user.id,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status: "confirmed",
      });

      // Actualizar location con el nombre real de la cancha
      const { data: court } = await supabase
        .from("venue_courts")
        .select("name, venue:venues(name)")
        .eq("id", courtId)
        .single();

      if (court) {
        const venue = court.venue as { name: string } | { name: string }[] | null;
        const venueName = Array.isArray(venue) ? venue[0]?.name : venue?.name;
        await supabase
          .from("matches")
          .update({
            location: `${venueName} - ${court.name}`,
          })
          .eq("id", data.id);
      }
    }

    // Auto-join al organizador como participante. Si falla el insert igual
    // devolvemos el match creado; el organizador puede refrescar y re-joinear.
    await supabase.from("match_participants").insert({
      match_id: data.id,
      user_id: user.id,
      status: "joined",
    });

    revalidatePath("/feed");
    redirect(`/matches/${data.id}`);
  });
}

export type JoinResult = { ok: true } | { ok: false; error: string };

export async function joinMatch(matchId: string): Promise<JoinResult> {
  return withAuth(async ({ user, supabase }) => {
    const rl = await checkRateLimit(supabase, {
      key: `join:${user.id}`,
      ...RATE_LIMITS.joinLeave,
    });
    if (!rl.ok) return { ok: false, error: rl.error };

    // Defense-in-depth check previo al insert (el trigger es la garantía real).
    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select("id, max_players, status, organizer_id")
      .eq("id", matchId)
      .single();
    if (matchErr || !match) {
      return { ok: false, error: "Partido no encontrado." };
    }
    if (match.status !== "open") {
      return { ok: false, error: "El partido ya no admite nuevos jugadores." };
    }
    const { count, error: countErr } = await supabase
      .from("match_participants")
      .select("*", { count: "exact", head: true })
      .eq("match_id", matchId);
    if (countErr) return { ok: false, error: mapDbError(countErr, "joinMatch:count") };
    if ((count ?? 0) >= match.max_players) {
      return { ok: false, error: "El partido ya está completo." };
    }

    const { error } = await supabase.from("match_participants").insert({
      match_id: matchId,
      user_id: user.id,
      status: "requested",
    });

    if (error) {
      // 23505 = unique violation (ya estaba unido → no-op)
      if (error.code === "23505") {
        revalidatePath(`/matches/${matchId}`);
        return { ok: true };
      }
      return { ok: false, error: mapDbError(error, "joinMatch:insert") };
    }
    // Notificar al organizador sobre la nueva solicitud
    await supabase.from("notifications").insert({
      user_id: match.organizer_id,
      type: "match_request",
      data: {
        match_id: matchId,
        player_id: user.id,
        player_name: (await supabase.from('profiles_core').select('full_name').eq('user_id', user.id).single()).data?.full_name
      },
    });

    revalidatePath(`/matches/${matchId}`);
    revalidatePath("/feed");
    return { ok: true };
  });
}

export async function leaveMatch(matchId: string): Promise<JoinResult> {
  return withAuth(async ({ user, supabase }) => {
    const rl = await checkRateLimit(supabase, {
      key: `leave:${user.id}`,
      ...RATE_LIMITS.joinLeave,
    });
    if (!rl.ok) return { ok: false, error: rl.error };

    // App-level check antes de tocar la DB: organizador no puede salir.
    // El trigger DB `prevent_organizer_leave` es la garantía real.
    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select("organizer_id")
      .eq("id", matchId)
      .single();
    if (matchErr || !match) {
      return { ok: false, error: "Partido no encontrado." };
    }
    if (match.organizer_id === user.id) {
      return {
        ok: false,
        error:
          "Como organizador no podés salir del partido. Cancelalo si no lo vas a jugar.",
      };
    }

    const { error } = await supabase
      .from("match_participants")
      .delete()
      .eq("match_id", matchId)
      .eq("user_id", user.id);

    if (error) return { ok: false, error: mapDbError(error, "leaveMatch") };
    revalidatePath(`/matches/${matchId}`);
    revalidatePath("/feed");
    return { ok: true };
  });
}

export async function cancelMatch(matchId: string): Promise<JoinResult> {
  return withAuth(async ({ user, supabase }) => {
    const { data: match, error: readErr } = await supabase
      .from("matches")
      .select("organizer_id, status")
      .eq("id", matchId)
      .single();
    if (readErr || !match) {
      return { ok: false, error: "Partido no encontrado." };
    }
    if (match.organizer_id !== user.id) {
      return { ok: false, error: "Solo el organizador puede cancelar el partido." };
    }
    if (match.status === "cancelled" || match.status === "completed") {
      return { ok: false, error: "El partido ya está cerrado." };
    }

    const { error } = await supabase
      .from("matches")
      .update({ status: "cancelled" })
      .eq("id", matchId);
    if (error) return { ok: false, error: mapDbError(error, "cancelMatch") };

    revalidatePath(`/matches/${matchId}`);
    revalidatePath("/feed");
    return { ok: true };
  });
}

export async function respondToJoinRequest(
  matchId: string,
  userId: string,
  decision: "joined" | "left",
): Promise<JoinResult> {
  return withAuth(async ({ user, supabase }) => {
    // Verificar que el usuario actual es el organizador
    const { data: match } = await supabase
      .from("matches")
      .select("organizer_id")
      .eq("id", matchId)
      .single();

    if (match?.organizer_id !== user.id) {
      return { ok: false, error: "Solo el organizador puede aprobar solicitudes." };
    }

    const { error } = await supabase
      .from("match_participants")
      .update({ status: decision })
      .eq("match_id", matchId)
      .eq("user_id", userId);

    if (error) return { ok: false, error: mapDbError(error, "respondToJoinRequest") };

    // Notificar al usuario (opcional, implementar tabla notifications)
    if (decision === "joined") {
      await supabase.from("notifications").insert({
        user_id: userId,
        type: "match_accepted",
        data: { match_id: matchId },
      });
    }

    revalidatePath(`/matches/${matchId}`);
    return { ok: true };
  });
}

export async function inviteToMatch(
  matchId: string,
  userId: string,
): Promise<JoinResult> {
  return withAuth(async ({ user, supabase }) => {
    const { data: match } = await supabase
      .from("matches")
      .select("organizer_id")
      .eq("id", matchId)
      .single();

    if (match?.organizer_id !== user.id) {
      return { ok: false, error: "Solo el organizador puede enviar invitaciones." };
    }

    const { error } = await supabase.from("match_participants").insert({
      match_id: matchId,
      user_id: userId,
      status: "invited",
    });

    if (error) return { ok: false, error: mapDbError(error, "inviteToMatch") };

    await supabase.from("notifications").insert({
      user_id: userId,
      type: "match_invite",
      data: { match_id: matchId, invited_by: user.id },
    });

    revalidatePath(`/matches/${matchId}`);
    return { ok: true };
  });
}

export async function sendMessage(
  matchId: string,
  content: string,
): Promise<JoinResult> {
  const parsed = sendMessageSchema.safeParse({
    match_id: matchId,
    content,
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Mensaje inválido.";
    return { ok: false, error: first };
  }

  return withAuth(async ({ user, supabase }) => {
    const rl = await checkRateLimit(supabase, {
      key: `send-msg:${user.id}`,
      ...RATE_LIMITS.sendMessage,
    });
    if (!rl.ok) return { ok: false, error: rl.error };

    // Defense-in-depth: el usuario debe ser participante activo O el
    // organizador del partido. Refleja exactamente la policy RLS
    // `messages_insert_if_in_match`. Nunca es la única garantía (RLS lo es),
    // pero permite devolver un error claro si algo no cuadra.
    const { count } = await supabase
      .from("match_participants")
      .select("*", { count: "exact", head: true })
      .eq("match_id", parsed.data.match_id)
      .eq("user_id", user.id)
      .eq("status", "joined");

    if (!count) {
      const { data: match } = await supabase
        .from("matches")
        .select("organizer_id")
        .eq("id", parsed.data.match_id)
        .maybeSingle();
      if (match?.organizer_id !== user.id) {
        return { ok: false, error: "No tenés acceso al chat de este partido." };
      }
    }

    const { error } = await supabase.from("messages").insert({
      match_id: parsed.data.match_id,
      sender_id: user.id,
      content: parsed.data.content,
    });

    if (error) {
      return { ok: false, error: mapDbError(error, "sendMessage") };
    }
    // No revalidamos — el chat recibe por Realtime en el cliente.
    return { ok: true };
  });
}
