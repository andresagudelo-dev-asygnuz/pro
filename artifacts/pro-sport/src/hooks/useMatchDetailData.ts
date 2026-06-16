import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { SUPABASE_DB_SCHEMA } from "@/lib/supabase/schema";
import type { Match, MatchParticipant, Profile, Sport, CanchaBooking, MatchInvitation, MatchWaitlist } from "@/lib/types/db";
import { getMyMatchInvitation, getMatchInvitations } from "@/lib/friends/api";
import {
  getRawMatchById,
  upsertMatchChatAccess,
  getMatchMessages,
  getMatchParticipantsRaw,
  getMatchWaitlistRaw,
} from "@/lib/matches/api";
import { getSportById } from "@/lib/sports/api";
import { getProfileById, getProfilesByIds } from "@/lib/profiles/api";
import { getBookingWithCancha } from "@/lib/canchas/api";

export type ChatMessage = { id: string; sender_id: string; content: string; created_at: string };
export type FullCancha = { name: string; address: string; phone?: string | null; price_per_hour?: number | null };
export type FullBooking = CanchaBooking & { canchas?: FullCancha | null };

export function useMatchDetailData(matchId: string, userId: string | undefined) {
  // Core state
  const [match, setMatch] = useState<Match | null>(null);
  const [sport, setSport] = useState<Sport | null>(null);
  const [organizer, setOrganizer] = useState<Profile | null>(null);
  const [participants, setParticipants] = useState<MatchParticipant[]>([]);
  const [profilesById, setProfilesById] = useState<Map<string, Profile>>(new Map());
  const [canchaBooking, setCanchaBooking] = useState<FullBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chat state (read-only — sendingMsg lives in useMatchDetailActions)
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Invitation & Waitlist
  const [myInvitation, setMyInvitation] = useState<MatchInvitation | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<(MatchInvitation & { profile?: Profile })[]>([]);
  const [waitlist, setWaitlist] = useState<(MatchWaitlist & { profile?: Profile })[]>([]);

  const load = useCallback(async () => {
    if (!matchId || !userId) return;
    setLoading(true);
    try {
      const { data: matchRaw, error: matchErr } = await getRawMatchById(supabase, matchId);
      if (matchErr || !matchRaw) {
        setError(matchErr ?? "Partido no encontrado");
        setLoading(false);
        return;
      }
      const m = matchRaw as Match;
      setMatch(m);

      const [
        sportRes,
        orgRes,
        partsRes,
        bookingRes,
        invRes,
        allInvRes,
        waitlistRes,
      ] = await Promise.all([
        getSportById(supabase, m.sport_id),
        getProfileById(supabase, m.organizer_id),
        getMatchParticipantsRaw(supabase, m.id),
        m.cancha_booking_id
          ? getBookingWithCancha(supabase, m.cancha_booking_id)
          : Promise.resolve({ data: null, error: null }),
        getMyMatchInvitation(supabase, m.id, userId),
        getMatchInvitations(supabase, m.id),
        getMatchWaitlistRaw(supabase, m.id),
      ]);

      if (bookingRes.data) setCanchaBooking(bookingRes.data as unknown as FullBooking);
      if (invRes.data) setMyInvitation(invRes.data);

      setSport(sportRes.data);
      setOrganizer(orgRes.data);

      const parts = (partsRes.data ?? []) as MatchParticipant[];
      setParticipants(parts);

      // Ensure the conversation row and user membership exist before fetching messages.
      // DB triggers may not have run for matches created before fix_match_chat migration.
      const canAccessChat =
        parts.some((p) => p.user_id === userId && p.status === "joined") ||
        m.organizer_id === userId;
      if (canAccessChat) {
        await upsertMatchChatAccess(supabase, m.id, m.title, userId);
      }

      const { data: messagesData } = await getMatchMessages(supabase, m.id);
      setMessages((messagesData ?? []) as ChatMessage[]);

      // Load profiles for participants + organizer + waitlist + invites
      // batch fetch — no DAL for arbitrary ID lists
      const pIds = Array.from(new Set([
        ...parts.map((p) => p.user_id),
        m.organizer_id,
        ...(waitlistRes.data ?? []).map((w: { user_id: string }) => w.user_id),
        ...(allInvRes.data ?? []).map((i: { invitee_id: string }) => i.invitee_id),
      ]));

      const { data: ppData } = await getProfilesByIds(supabase, pIds);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar los datos del partido";
      setError(msg);
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
        { event: "INSERT", schema: SUPABASE_DB_SCHEMA, table: "messages", filter: `conversation_id=eq.${matchId}` },
        (payload: { new: ChatMessage }) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .subscribe((_status: string, err?: Error) => {
        if (err) console.error("[match-chat realtime]", err);
      });

    // Match status & participants channel
    const matchChannel = supabase
      .channel(`match-detail-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: SUPABASE_DB_SCHEMA, table: "matches", filter: `id=eq.${matchId}` },
        () => load()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: SUPABASE_DB_SCHEMA, table: "match_participants", filter: `match_id=eq.${matchId}` },
        () => load()
      )
      .subscribe((_status: string, err?: Error) => {
        if (err) console.error("[match-detail realtime]", err);
      });

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(matchChannel);
    };
  }, [matchId, load]);

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
    myInvitation,
    pendingInvitations,
    waitlist,
    refresh: load,
  };
}
