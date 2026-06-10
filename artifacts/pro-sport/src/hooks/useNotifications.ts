import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
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
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  deleteReadNotifications,
} from "@/lib/notifications/api";
import { getProfilesByIds } from "@/lib/profiles/api";
import { joinMatchDirect } from "@/lib/matches/api";
import type { Notification, MatchInvitation, Profile } from "@/lib/types/db";

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
        getNotifications(supabase, userId),
        getPendingReceived(supabase, userId),
        getPendingMatchInvitations(supabase, userId),
      ]);

      setNotifications(notifRes.data ?? []);
      setFriendRequests(friendReqRes.data ?? []);

      const rawInvites = (matchInvRes.data ?? []) as MatchInviteWithMatch[];
      if (rawInvites.length > 0) {
        const { data: profiles } = await getProfilesByIds(supabase, rawInvites.map((i) => i.inviter_id));
        const map = new Map(
          ((profiles ?? []) as Profile[]).map((p) => [p.id, p])
        );
        setMatchInvitations(rawInvites.map((inv) => ({ ...inv, inviterProfile: map.get(inv.inviter_id) })));
      } else {
        setMatchInvitations([]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      console.error("Error loading notifications:", err);
      toast.error(msg);
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
    const channel = supabase
      .channel(`notif-page-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: { new: Notification }) => {
          setNotifications((prev) => [payload.new, ...prev]);
          // Omitir toast inicial si se cargan de a muchas (Realtime solo trae inserts de a 1)
          toast("Nueva notificación", {
            description: "Tienes una nueva actualización en tu campana.",
            icon: "🔔",
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: { new: Notification }) =>
          setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? payload.new : n)))
      )
      .subscribe((_status: string, err?: Error) => {
        if (err) console.error("[notifications realtime]", err);
      });
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAllRead = async () => {
    if (!userId) return;
    const { error } = await markAllNotificationsRead(supabase, userId);
    if (error) {
      toast.error("Error al marcar como leídas");
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    clearCount();
  };

  const markOneRead = async (id: string) => {
    const { error } = await markNotificationRead(supabase, id);
    if (error) {
      toast.error("Error al marcar como leída");
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const deleteOne = async (id: string) => {
    setDeletingId(id);
    const { error } = await deleteNotification(supabase, id);
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
    const { error } = await deleteReadNotifications(supabase, userId);
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
    const { error: invErr } = await respondToMatchInvitation(supabase, invId, "accepted");
    if (invErr) { toast.error(invErr); return; }
    const { error: joinErr } = await joinMatchDirect(supabase, matchId, userId);
    if (joinErr) { toast.error(joinErr); return; }
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
