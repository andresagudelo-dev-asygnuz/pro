import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Match, MatchWaitlist, Profile } from "@/lib/types/db";
import { respondToMatchInvitation } from "@/lib/friends/api";
import {
  joinMatchDirect,
  leaveMatchDirect,
  requestJoinMatch,
  confirmMatchAttendance,
  cancelMatchById,
  acceptParticipantRequest,
  rejectParticipantRequest,
  updateParticipantAttendance,
  joinWaitlist as joinWaitlistDal,
  leaveWaitlist as leaveWaitlistDal,
} from "@/lib/matches/api";
import { getProfileById } from "@/lib/profiles/api";
import { sendNotification } from "@/lib/notifications/api";
import { sendMessage as sendChatMessage } from "@/lib/chat/api";

export function useMatchDetailActions(
  matchId: string,
  userId: string | undefined,
  match: Match | null,
  waitlist: (MatchWaitlist & { profile?: Profile })[],
  onRefresh: () => void
) {
  const [sendingMsg, setSendingMsg] = useState(false);

  const sendMessage = async (content: string) => {
    if (!userId || !matchId || !content.trim()) return;
    setSendingMsg(true);
    try {
      const { error } = await sendChatMessage(supabase, matchId, userId, content);
      if (error) throw new Error(error);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg || "Error al enviar mensaje");
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  const joinMatch = async () => {
    if (!userId || !matchId) return;
    try {
      const { error } = await joinMatchDirect(supabase, matchId, userId);
      if (error) throw new Error(error);

      if (match && match.organizer_id !== userId) {
        const { data: profile } = await getProfileById(supabase, userId);
        const joinerName = profile?.full_name ?? profile?.username ?? "Alguien";

        await sendNotification(supabase, match.organizer_id, "match_joined", {
          match_id: match.id,
          match_title: match.title,
          joiner_id: userId,
          joiner_name: joinerName,
        });
      }

      toast.success("¡Te uniste al partido!");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg || "Error al unirte");
    }
  };

  const leaveMatch = async () => {
    if (!userId || !matchId) return;
    try {
      const { error } = await leaveMatchDirect(supabase, matchId, userId);
      if (error) throw new Error(error);
      toast.success("Saliste del partido");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg || "Error al salir");
    }
  };

  const requestJoin = async () => {
    if (!userId || !matchId) return;
    try {
      const { error } = await requestJoinMatch(supabase, matchId, userId);
      if (error) throw new Error(error);

      if (match && match.organizer_id !== userId) {
        const { data: profile } = await getProfileById(supabase, userId);
        const requesterName = profile?.full_name ?? profile?.username ?? "Alguien";

        await sendNotification(supabase, match.organizer_id, "match_request", {
          match_id: match.id,
          match_title: match.title,
          requester_id: userId,
          requester_name: requesterName,
        });
      }

      toast.success("Solicitud enviada");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg || "Error al enviar solicitud");
    }
  };

  const confirmAttendance = async () => {
    if (!userId || !matchId) return;
    try {
      const { error } = await confirmMatchAttendance(supabase, matchId, userId);
      if (error) throw new Error(error);
      toast.success("¡Asistencia confirmada!");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg || "Error al confirmar asistencia");
    }
  };

  const cancelMatch = async () => {
    if (!userId || !matchId) return;
    try {
      const { error } = await cancelMatchById(supabase, matchId);
      if (error) throw new Error(error);
      toast.success("El partido fue cancelado.");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg || "No se pudo cancelar el partido.");
    }
  };

  const joinWaitlist = async () => {
    if (!userId || !matchId) return;
    try {
      const alreadyIn = waitlist.some((w) => w.user_id === userId);
      if (alreadyIn) {
        const entry = waitlist.find((w) => w.user_id === userId)!;
        const { error } = await leaveWaitlistDal(supabase, entry.id);
        if (error) throw new Error(error);
        toast.success("Saliste de la lista de espera.");
      } else {
        const { error } = await joinWaitlistDal(supabase, matchId, userId);
        if (error) throw new Error(error);
        toast.success("¡Estás en la lista de espera!");
      }
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg || "Error en lista de espera");
    }
  };

  const acceptJoinRequest = async (participantUserId: string) => {
    if (!matchId) return;
    try {
      const { error } = await acceptParticipantRequest(supabase, matchId, participantUserId);
      if (error) throw new Error(error);
      toast.success("Solicitud aceptada");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg || "Error al aceptar solicitud");
    }
  };

  const rejectJoinRequest = async (participantUserId: string) => {
    if (!matchId) return;
    try {
      const { error } = await rejectParticipantRequest(supabase, matchId, participantUserId);
      if (error) throw new Error(error);
      toast.success("Solicitud rechazada");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg || "Error al rechazar solicitud");
    }
  };

  const respondInvitation = async (invitationId: string, status: "accepted" | "rejected") => {
    if (!userId || !matchId) return;
    try {
      const { error } = await respondToMatchInvitation(supabase, invitationId, status);
      if (error) throw new Error(typeof error === "string" ? error : "Error al responder invitación");
      if (status === "accepted") {
        const { error: joinErr } = await joinMatchDirect(supabase, matchId, userId);
        if (joinErr) throw new Error(joinErr);
        toast.success("¡Te uniste al partido!");
      } else {
        toast.success("Rechazaste la invitación.");
      }
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg || "Error al responder invitación");
    }
  };

  const updateAttendance = async (participantUserId: string, status: "attended" | "no_show") => {
    if (!matchId) return;
    try {
      const { error } = await updateParticipantAttendance(supabase, matchId, participantUserId, status);
      if (error) throw new Error(error);
      toast.success("Asistencia actualizada");
      onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      toast.error(msg || "Error al actualizar asistencia");
    }
  };

  return {
    sendingMsg,
    sendMessage,
    joinMatch,
    leaveMatch,
    requestJoin,
    confirmAttendance,
    cancelMatch,
    joinWaitlist,
    acceptJoinRequest,
    rejectJoinRequest,
    respondInvitation,
    updateAttendance,
  };
}
