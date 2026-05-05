import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNotifCount } from "@/context/NotifContext";
import { toast } from "sonner";
import {
  getPendingReceived,
  acceptFriendRequest,
  rejectFriendRequest,
  getPendingMatchInvitations,
  respondToMatchInvitation,
  type FriendWithProfile,
} from "@/lib/friends/api";
import type { Notification, MatchInvitation, Profile } from "@/lib/types/db";

const supabase = createClient();

export type MatchInviteWithMatch = MatchInvitation & {
  matches: { title: string; starts_at: string } | null;
  inviterProfile?: { full_name: string | null; avatar_url: string | null; username: string | null };
};

export function useNotifications(userId: string | undefined) {
  const { clearCount } = useNotifCount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendWithProfile[]>([]);
  const [matchInvitations, setMatchInvitations] = useState<MatchInviteWithMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [notifRes, friendReqRes, matchInvRes] = await Promise.all([
        supabase.from("notifications").select("*").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(60),
        getPendingReceived(supabase, userId),
        getPendingMatchInvitations(supabase, userId),
      ]);

      setNotifications((notifRes.data as Notification[]) || []);
      setFriendRequests(friendReqRes.data ?? []);

      const rawInvites = (matchInvRes.data ?? []) as MatchInviteWithMatch[];
      if (rawInvites.length > 0) {
        const { data: profiles } = await supabase.from("profiles")
          .select("id, full_name, avatar_url, username").in("id", rawInvites.map((i) => i.inviter_id));
        const map = new Map(
          ((profiles ?? []) as Profile[])
            .map((p) => [p.id, p])
        );
        setMatchInvitations(rawInvites.map((inv) => ({ ...inv, inviterProfile: map.get(inv.inviter_id) })));
      } else {
        setMatchInvitations([]);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Error al cargar notificaciones");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`notif-page-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: { new: Notification }) => setNotifications((prev) => [payload.new, ...prev]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: { new: Notification }) => setNotifications((prev) => prev.map((n) => n.id === payload.new.id ? payload.new : n)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAllRead = async () => {
    if (!userId) return;
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", userId).is("read_at", null);
    
    if (error) {
      toast.error("Error al marcar como leídas");
      return;
    }
    
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    clearCount();
  };

  const markOneRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast.error("Error al marcar como leída");
      return;
    }
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const deleteOne = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar.");
      setDeletingId(null);
      return;
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setDeletingId(null);
    toast.success("Notificación eliminada.");
  };

  const deleteAllRead = async () => {
    if (!userId) return;
    const { error } = await supabase.from("notifications").delete()
      .eq("user_id", userId).not("read_at", "is", null);
    if (error) {
      toast.error("Error al eliminar.");
      return;
    }
    setNotifications((prev) => prev.filter((n) => !n.read_at));
    toast.success("Notificaciones leídas eliminadas.");
  };

  const handleAcceptFriend = async (id: string) => {
    const { error } = await acceptFriendRequest(supabase, id);
    if (error) { toast.error(error); return; }
    setFriendRequests((prev) => prev.filter((f) => f.id !== id));
    toast.success("¡Ahora son amigos!");
  };

  const handleRejectFriend = async (id: string) => {
    const { error } = await rejectFriendRequest(supabase, id);
    if (error) { toast.error(error); return; }
    setFriendRequests((prev) => prev.filter((f) => f.id !== id));
  };

  const handleAcceptMatchInvite = async (invId: string, matchId: string) => {
    if (!userId) return;
    const { error } = await respondToMatchInvitation(supabase, invId, "accepted");
    if (error) { toast.error(error); return; }
    await supabase.from("match_participants").insert({ match_id: matchId, user_id: userId, status: "joined" });
    setMatchInvitations((prev) => prev.filter((i) => i.id !== invId));
    toast.success("¡Te uniste al partido!");
  };

  const handleRejectMatchInvite = async (id: string) => {
    const { error } = await respondToMatchInvitation(supabase, id, "rejected");
    if (error) { toast.error(error); return; }
    setMatchInvitations((prev) => prev.filter((i) => i.id !== id));
  };

  return {
    notifications,
    friendRequests,
    matchInvitations,
    loading,
    deletingId,
    markAllRead,
    markOneRead,
    deleteOne,
    deleteAllRead,
    handleAcceptFriend,
    handleRejectFriend,
    handleAcceptMatchInvite,
    handleRejectMatchInvite,
    refresh: load,
  };
}
