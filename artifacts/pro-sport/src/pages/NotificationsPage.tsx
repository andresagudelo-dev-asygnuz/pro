import { useEffect, useState } from "react";
import { Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Bell, CheckCircle2, MessageSquare, UserPlus, Mail, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import { toast } from "sonner";
import {
  getPendingReceived,
  acceptFriendRequest,
  rejectFriendRequest,
  getPendingMatchInvitations,
  respondToMatchInvitation,
  type FriendWithProfile,
} from "@/lib/friends/api";
import type { MatchInvitation } from "@/lib/types/db";

const supabase = createClient();

type NotificationData = {
  player_name?: string;
  player_id?: string;
  match_id?: string;
  [key: string]: unknown;
};

type Notification = {
  id: string;
  type: string;
  data: NotificationData;
  created_at: string;
  read_at: string | null;
};

type MatchInviteWithMatch = MatchInvitation & {
  matches: { title: string; starts_at: string } | null;
  inviterProfile?: { full_name: string | null; avatar_url: string | null; username: string | null };
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendWithProfile[]>([]);
  const [matchInvitations, setMatchInvitations] = useState<MatchInviteWithMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [notifRes, friendReqRes, matchInvRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        getPendingReceived(supabase, user.id),
        getPendingMatchInvitations(supabase, user.id),
      ]);

      setNotifications(notifRes.data || []);
      setFriendRequests(friendReqRes.data ?? []);

      const rawInvites = (matchInvRes.data ?? []) as MatchInviteWithMatch[];
      if (rawInvites.length > 0) {
        const inviterIds = rawInvites.map((i) => i.inviter_id);
        const { data: inviterProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username")
          .in("id", inviterIds);
        const profileMap = new Map(
          ((inviterProfiles ?? []) as any[]).map((p) => [p.id, p]),
        );
        setMatchInvitations(
          rawInvites.map((inv) => ({
            ...inv,
            inviterProfile: profileMap.get(inv.inviter_id),
          })),
        );
      } else {
        setMatchInvitations([]);
      }

      setLoading(false);
    }
    load();
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })),
    );
  };

  async function handleAcceptFriend(friendshipId: string) {
    const { error } = await acceptFriendRequest(supabase, friendshipId);
    if (error) { toast.error(error); return; }
    setFriendRequests((prev) => prev.filter((f) => f.id !== friendshipId));
    toast.success("¡Ahora son amigos!");
  }

  async function handleRejectFriend(friendshipId: string) {
    const { error } = await rejectFriendRequest(supabase, friendshipId);
    if (error) { toast.error(error); return; }
    setFriendRequests((prev) => prev.filter((f) => f.id !== friendshipId));
  }

  async function handleAcceptMatchInvite(invitationId: string, matchId: string) {
    const { error } = await respondToMatchInvitation(supabase, invitationId, "accepted");
    if (error) { toast.error(error); return; }
    await supabase
      .from("match_participants")
      .insert({ match_id: matchId, user_id: user?.id, status: "joined" });
    setMatchInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    toast.success("¡Te uniste al partido!");
  }

  async function handleRejectMatchInvite(invitationId: string) {
    const { error } = await respondToMatchInvitation(supabase, invitationId, "rejected");
    if (error) { toast.error(error); return; }
    setMatchInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    toast.success("Invitación rechazada.");
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "match_request": return <UserPlus className="size-4 text-blue-500" />;
      case "match_accepted": return <CheckCircle2 className="size-4 text-green-500" />;
      case "match_invite": return <MessageSquare className="size-4 text-purple-500" />;
      default: return <Bell className="size-4 text-muted-foreground" />;
    }
  };

  const getMessage = (n: Notification) => {
    const { player_name } = n.data;
    switch (n.type) {
      case "match_request":
        return <span><strong>{player_name || "Un usuario"}</strong> solicitó unirse a tu partido.</span>;
      case "match_accepted":
        return <span>Tu solicitud para unirte al partido fue <strong>aceptada</strong>.</span>;
      case "match_invite":
        return <span>Has sido <strong>invitado</strong> a un nuevo partido.</span>;
      default:
        return <span>Nueva notificación recibida.</span>;
    }
  };

  const hasActionable = friendRequests.length > 0 || matchInvitations.length > 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Notificaciones</h1>
          <Button variant="ghost" size="sm" onClick={markAllRead}>Marcar todas</Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ─── Friend requests ─── */}
            {friendRequests.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                  <UserPlus className="size-3.5" /> Solicitudes de amistad
                </p>
                <div className="flex flex-col border rounded-xl divide-y overflow-hidden bg-white dark:bg-zinc-900">
                  {friendRequests.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-4 bg-primary/5">
                      <Link href={`/profile/${f.requester_id}`}>
                        <Avatar className="size-10 cursor-pointer shrink-0">
                          {f.profile.avatar_url && <AvatarImage src={f.profile.avatar_url} />}
                          <AvatarFallback>
                            {initialsFromName(f.profile.full_name ?? f.profile.username)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {f.profile.full_name ?? f.profile.username ?? "Usuario"}
                        </p>
                        <p className="text-xs text-muted-foreground">quiere ser tu amigo</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" onClick={() => handleAcceptFriend(f.id)}>
                          <Check className="size-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleRejectFriend(f.id)}>
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ─── Match invitations ─── */}
            {matchInvitations.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Mail className="size-3.5" /> Invitaciones a partidos
                </p>
                <div className="flex flex-col border rounded-xl divide-y overflow-hidden bg-white dark:bg-zinc-900">
                  {matchInvitations.map((inv) => (
                    <div key={inv.id} className="flex items-start gap-3 p-4 bg-primary/5">
                      <Avatar className="size-10 shrink-0 mt-0.5">
                        {inv.inviterProfile?.avatar_url && (
                          <AvatarImage src={inv.inviterProfile.avatar_url} />
                        )}
                        <AvatarFallback>
                          {initialsFromName(
                            inv.inviterProfile?.full_name ?? inv.inviterProfile?.username ?? null,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <strong>
                            {inv.inviterProfile?.full_name ??
                              inv.inviterProfile?.username ??
                              "Un usuario"}
                          </strong>{" "}
                          te invitó a{" "}
                          <Link
                            href={`/matches/${inv.match_id}`}
                            className="font-semibold underline"
                          >
                            {inv.matches?.title ?? "un partido"}
                          </Link>
                        </p>
                        {inv.matches?.starts_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(inv.matches.starts_at).toLocaleString("es-CO", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptMatchInvite(inv.id, inv.match_id)}
                          >
                            <Check className="size-3.5 mr-1" /> Aceptar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectMatchInvite(inv.id)}
                          >
                            <X className="size-3.5 mr-1" /> Rechazar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ─── Regular notifications ─── */}
            {notifications.length === 0 && !hasActionable ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="size-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No tenés notificaciones nuevas.</p>
              </div>
            ) : notifications.length > 0 ? (
              <section>
                {hasActionable && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Bell className="size-3.5" /> Actividad
                  </p>
                )}
                <div className="flex flex-col border rounded-xl divide-y overflow-hidden bg-white dark:bg-zinc-900">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-4 p-4 transition-colors ${
                        !n.read_at
                          ? "bg-primary/5"
                          : "bg-background hover:bg-muted/30"
                      }`}
                    >
                      <div className="mt-1">{getIcon(n.type)}</div>
                      <div className="flex-1 flex flex-col gap-1">
                        <Link
                          href={n.data.match_id ? `/matches/${n.data.match_id}` : "#"}
                          className="text-sm hover:underline"
                        >
                          {getMessage(n)}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleString("es-CO")}
                        </span>
                      </div>
                      {!n.read_at && (
                        <div className="size-2 rounded-full bg-primary mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-14">
            <Link href="/feed" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏠</span><span>Inicio</span>
            </Link>
            <Link href="/tournaments" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏆</span><span>Torneos</span>
            </Link>
            <Link href="/matches/new" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>➕</span><span>Crear</span>
            </Link>
            <Link href="/notificaciones" className="flex flex-col items-center gap-0.5 text-xs font-medium text-brand-primary">
              <span>🔔</span><span>Notif.</span>
            </Link>
            <Link href="/perfil" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>👤</span><span>Perfil</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
