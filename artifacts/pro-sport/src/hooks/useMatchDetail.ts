import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Match, MatchParticipant, Profile, Sport, CanchaBooking, MatchInvitation, MatchWaitlist } from "@/lib/types/db";
import { getMyMatchInvitation, respondToMatchInvitation, getMatchInvitations, sendMatchInvitations } from "@/lib/friends/api";

const supabase = createClient();

export type ChatMessage = { id: string; sender_id: string; content: string; created_at: string };
export type FullCancha = { name: string; address: string; phone?: string | null; price_per_hour?: number | null };
export type FullBooking = CanchaBooking & { canchas?: FullCancha | null };

export function useMatchDetail(matchId: string, userId: string | undefined) {
  // Core state
  const [match, setMatch] = useState<Match | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [organizer, setOrganizer] = useState<Profile | null>(null);
  const [participants, setParticipants] = useState<MatchParticipant[]>([]);
  const [profilesById, setProfilesById] = useState<Map<string, Profile>>(new Map());
  const [canchaBooking, setCanchaBooking] = useState<FullBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sendingMsg, setSendingMsg] = useState(false);

  // Invitation & Waitlist
  const [myInvitation, setMyInvitation] = useState<MatchInvitation | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<(MatchInvitation & { profile?: Profile })[]>([]);
  const [waitlist, setWaitlist] = useState<(MatchWaitlist & { profile?: Profile })[]>([]);

  const load = useCallback(async () => {
    if (!matchId || !userId) return;
    setLoading(true);
    try {
      const { data: matchRaw } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
      if (!matchRaw) {
        setError("Partido no encontrado");
        setLoading(false);
        return;
      }
      const m = matchRaw as Match;
      setMatch(m);

      const [
        { data: sportData },
        { data: orgData },
        { data: partsData },
        { data: messagesData },
        bookingRes,
        invRes,
        allInvRes,
        waitlistRes,
      ] = await Promise.all([
        supabase.from("sports").select("*").eq("id", m.sport_id).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", m.organizer_id).maybeSingle(),
        supabase.from("match_participants").select("*").eq("match_id", m.id).order("joined_at"),
        supabase.from("messages").select("*").eq("conversation_id", m.id).order("created_at", { ascending: true }).limit(200),
        m.cancha_booking_id
          ? supabase.from("cancha_bookings").select("*, canchas(name, address, phone, price_per_hour)").eq("id", m.cancha_booking_id).maybeSingle()
          : Promise.resolve({ data: null }),
        getMyMatchInvitation(supabase, m.id, userId),
        getMatchInvitations(supabase, m.id),
        supabase.from("match_waitlist").select("*").eq("match_id", m.id).order("joined_at"),
      ]);

      if (bookingRes.data) setCanchaBooking(bookingRes.data as FullBooking);
      if (invRes.data) setMyInvitation(invRes.data);

      setSport(sportData as Sport | null);
      setOrganizer(orgData as Profile | null);

      const parts = (partsData ?? []) as MatchParticipant[];
      setParticipants(parts);
      setMessages((messagesData ?? []) as ChatMessage[]);

      // Load profiles for participants + organizer + waitlist + invites
      const pIds = Array.from(new Set([
        ...parts.map((p) => p.user_id),
        m.organizer_id,
        ...(waitlistRes.data ?? []).map((w: any) => w.user_id),
        ...(allInvRes.data ?? []).map((i: any) => i.invitee_id)
      ]));

      const { data: ppData } = await supabase.from("profiles").select("*").in("id", pIds);
      const map = new Map<string, Profile>();
      ((ppData ?? []) as Profile[]).forEach((p) => map.set(p.id, p));
      setProfilesById(map);

      // Pending invitations (organizer view)
      if (allInvRes.data && allInvRes.data.length > 0) {
        setPendingInvitations(
          (allInvRes.data as MatchInvitation[]).map((i) => ({
            ...i,
            profile: map.get(i.invitee_id),
          }))
        );
      } else {
        setPendingInvitations([]);
      }

      // Waitlist
      if (waitlistRes.data && waitlistRes.data.length > 0) {
        setWaitlist(
          (waitlistRes.data as MatchWaitlist[]).map((w) => ({
            ...w,
            profile: map.get(w.user_id),
          }))
        );
      } else {
        setWaitlist([]);
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar los datos del partido");
    } finally {
      setLoading(false);
    }
  }, [matchId, userId]);

  useEffect(() => {
    if (matchId && userId) load();
  }, [matchId, userId, load]);

  // Realtime
  useEffect(() => {
    if (!matchId) return;

    // Messages channel
    const msgChannel = supabase
      .channel(`match-chat-${matchId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${matchId}` },
        (payload: { new: ChatMessage }) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe();

    // Match status & participants channel
    const matchChannel = supabase
      .channel(`match-detail-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_participants", filter: `match_id=eq.${matchId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [matchId, load]);

  const sendMessage = async (content: string) => {
    if (!userId || !matchId || !content.trim()) return;
    setSendingMsg(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: matchId,
        sender_id: userId,
        content: content.trim(),
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error("Error al enviar mensaje");
      console.error(err);
    } finally {
      setSendingMsg(false);
    }
  };

  const joinMatch = async () => {
    if (!userId || !matchId) return;
    try {
      const { error } = await supabase.from("match_participants").insert({
        match_id: matchId,
        user_id: userId,
        status: "joined",
      });
      if (error) throw error;

      if (match && match.organizer_id !== userId) {
        const { data: profile } = await supabase.from("profiles").select("full_name, username").eq("id", userId).maybeSingle();
        const joinerName = profile?.full_name || profile?.username || "Alguien";

        await supabase.from("notifications").insert({
          user_id: match.organizer_id,
          type: "match_joined",
          data: {
            match_id: match.id,
            match_title: match.title,
            joiner_id: userId,
            joiner_name: joinerName,
          }
        });
      }

      toast.success("¡Te uniste al partido!");
      load();
    } catch (err: any) {
      toast.error(err.message || "Error al unirte");
    }
  };

  const leaveMatch = async () => {
    if (!userId || !matchId) return;
    try {
      const { error } = await supabase
        .from("match_participants")
        .delete()
        .eq("match_id", matchId)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success("Saliste del partido");
      load();
    } catch (err: any) {
      toast.error(err.message || "Error al salir");
    }
  };

  const requestJoin = async () => {
    if (!userId || !matchId) return;
    try {
      const { error } = await supabase.from("match_participants").insert({
        match_id: matchId,
        user_id: userId,
        status: "requested",
      });
      if (error) throw error;

      if (match && match.organizer_id !== userId) {
        const { data: profile } = await supabase.from("profiles").select("full_name, username").eq("id", userId).maybeSingle();
        const requesterName = profile?.full_name || profile?.username || "Alguien";

        await supabase.from("notifications").insert({
          user_id: match.organizer_id,
          type: "match_request",
          data: {
            match_id: match.id,
            match_title: match.title,
            requester_id: userId,
            requester_name: requesterName,
          }
        });
      }

      toast.success("Solicitud enviada");
      load();
    } catch (err: any) {
      toast.error(err.message || "Error al enviar solicitud");
    }
  };

  return {
    match,
    sport,
    organizer,
    participants,
    profilesById,
    canchaBooking,
    loading,
    error,
    messages,
    sendingMsg,
    myInvitation,
    pendingInvitations,
    waitlist,
    sendMessage,
    joinMatch,
    leaveMatch,
    requestJoin,
    refresh: load,
    confirmAttendance: async () => {
      if (!userId || !matchId) return;
      try {
        const { error } = await supabase.from("match_participants").update({ confirmed_at: new Date().toISOString() }).eq("match_id", matchId).eq("user_id", userId);
        if (error) throw error;
        toast.success("¡Asistencia confirmada!");
        load();
      } catch (err: any) {
        toast.error("Error al confirmar asistencia");
      }
    },
    cancelMatch: async () => {
      if (!userId || !matchId) return;
      try {
        const { error } = await supabase.from("matches").update({ status: "cancelled" }).eq("id", matchId);
        if (error) throw error;
        toast.success("El partido fue cancelado.");
        load();
      } catch (err: any) {
        toast.error("No se pudo cancelar el partido.");
      }
    },
    joinWaitlist: async () => {
      if (!userId || !matchId) return;
      try {
        const alreadyIn = waitlist.some((w) => w.user_id === userId);
        if (alreadyIn) {
          const entry = waitlist.find((w) => w.user_id === userId)!;
          await supabase.from("match_waitlist").delete().eq("id", entry.id);
          toast.success("Saliste de la lista de espera.");
        } else {
          const { error } = await supabase.from("match_waitlist").insert({ match_id: matchId, user_id: userId });
          if (error) throw error;
          toast.success("¡Estás en la lista de espera!");
        }
        load();
      } catch (err: any) {
        toast.error("Error en lista de espera");
      }
    },
    acceptJoinRequest: async (participantUserId: string) => {
      if (!matchId) return;
      try {
        const { error } = await supabase.from("match_participants").update({ status: "joined" }).eq("match_id", matchId).eq("user_id", participantUserId);
        if (error) throw error;
        toast.success("Solicitud aceptada");
        load();
      } catch (err: any) {
        toast.error("Error al aceptar solicitud");
      }
    },
    rejectJoinRequest: async (participantUserId: string) => {
      if (!matchId) return;
      try {
        const { error } = await supabase.from("match_participants").delete().eq("match_id", matchId).eq("user_id", participantUserId);
        if (error) throw error;
        toast.success("Solicitud rechazada");
        load();
      } catch (err: any) {
        toast.error("Error al rechazar solicitud");
      }
    },
    respondInvitation: async (invitationId: string, status: "accepted" | "rejected") => {
      if (!userId || !matchId) return;
      try {
        const { error } = await respondToMatchInvitation(supabase, invitationId, status);
        if (error) throw error;
        if (status === "accepted") {
          await supabase.from("match_participants").insert({ match_id: matchId, user_id: userId, status: "joined" });
          toast.success("¡Te uniste al partido!");
        } else {
          toast.success("Rechazaste la invitación.");
        }
        load();
      } catch (err: any) {
        toast.error("Error al responder invitación");
      }
    }
  };
}
