import { useEffect, useState } from "react";
import { Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNotifCount } from "@/context/NotifContext";
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  Mail,
  Check,
  X,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
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
  inviterProfile?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { clearCount } = useNotifCount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendWithProfile[]>(
    [],
  );
  const [matchInvitations, setMatchInvitations] = useState<
    MatchInviteWithMatch[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [notifRes, friendReqRes, matchInvRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(50),
        getPendingReceived(supabase, user!.id),
        getPendingMatchInvitations(supabase, user!.id),
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
          ((inviterProfiles ?? []) as { id: string; full_name: string | null; avatar_url: string | null; username: string | null }[]).map((p) => [p.id, p]),
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
      prev.map((n) => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
      })),
    );
    clearCount();
  };

  async function handleAcceptFriend(friendshipId: string) {
    const { error } = await acceptFriendRequest(supabase, friendshipId);
    if (error) {
      toast.error(error);
      return;
    }
    setFriendRequests((prev) => prev.filter((f) => f.id !== friendshipId));
    toast.success("¡Ahora son amigos!");
  }

  async function handleRejectFriend(friendshipId: string) {
    const { error } = await rejectFriendRequest(supabase, friendshipId);
    if (error) {
      toast.error(error);
      return;
    }
    setFriendRequests((prev) => prev.filter((f) => f.id !== friendshipId));
  }

  async function handleAcceptMatchInvite(
    invitationId: string,
    matchId: string,
  ) {
    const { error } = await respondToMatchInvitation(
      supabase,
      invitationId,
      "accepted",
    );
    if (error) {
      toast.error(error);
      return;
    }
    await supabase
      .from("match_participants")
      .insert({ match_id: matchId, user_id: user?.id, status: "joined" });
    setMatchInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    toast.success("¡Te uniste al partido!");
  }

  async function handleRejectMatchInvite(invitationId: string) {
    const { error } = await respondToMatchInvitation(
      supabase,
      invitationId,
      "rejected",
    );
    if (error) {
      toast.error(error);
      return;
    }
    setMatchInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    toast.success("Invitación rechazada.");
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "match_request":
        return <UserPlus className="size-4 text-blue-500" />;
      case "match_accepted":
        return <CheckCircle2 className="size-4 text-green-500" />;
      case "match_invite":
        return <MessageSquare className="size-4 text-violet-500" />;
      default:
        return <Bell className="size-4 text-muted-foreground" />;
    }
  };

  const getMessage = (n: Notification) => {
    const { player_name } = n.data;
    switch (n.type) {
      case "match_request":
        return (
          <span>
            <strong>{player_name || "Un usuario"}</strong> solicitó unirse a tu
            partido.
          </span>
        );
      case "match_accepted":
        return (
          <span>
            Tu solicitud para unirte al partido fue <strong>aceptada</strong>.
          </span>
        );
      case "match_invite":
        return (
          <span>
            Has sido <strong>invitado</strong> a un nuevo partido.
          </span>
        );
      default:
        return <span>Nueva notificación recibida.</span>;
    }
  };

  const hasActionable =
    friendRequests.length > 0 || matchInvitations.length > 0;
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader
        title={<>
          Notificaciones
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-semibold bg-violet-600 text-white px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </>}
        actions={unreadCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-muted-foreground rounded-xl">
            Marcar leídas
          </Button>
        ) : undefined}
      />

      <main className="container mx-auto px-4 py-4 max-w-2xl space-y-5">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Friend requests */}
            {friendRequests.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <UserPlus className="size-3.5" /> Solicitudes de amistad
                </p>
                <div className="flex flex-col border border-border/60 rounded-2xl divide-y divide-border/50 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                  {friendRequests.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-4 bg-violet-50/50 dark:bg-violet-900/10"
                    >
                      <Link href={`/profile/${f.requester_id}`}>
                        <Avatar className="size-10 cursor-pointer shrink-0">
                          {f.profile.avatar_url && (
                            <AvatarImage src={f.profile.avatar_url} />
                          )}
                          <AvatarFallback className="text-xs">
                            {initialsFromName(
                              f.profile.full_name ?? f.profile.username,
                            )}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {f.profile.full_name ?? f.profile.username ?? "Usuario"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          quiere ser tu amigo
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="rounded-xl w-8 h-8 p-0 bg-violet-600 hover:bg-violet-700"
                          onClick={() => handleAcceptFriend(f.id)}
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl w-8 h-8 p-0"
                          onClick={() => handleRejectFriend(f.id)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Match invitations */}
            {matchInvitations.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Mail className="size-3.5" /> Invitaciones a partidos
                </p>
                <div className="flex flex-col border border-border/60 rounded-2xl divide-y divide-border/50 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                  {matchInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-start gap-3 p-4 bg-violet-50/50 dark:bg-violet-900/10"
                    >
                      <Avatar className="size-10 shrink-0 mt-0.5">
                        {inv.inviterProfile?.avatar_url && (
                          <AvatarImage src={inv.inviterProfile.avatar_url} />
                        )}
                        <AvatarFallback className="text-xs">
                          {initialsFromName(
                            inv.inviterProfile?.full_name ??
                              inv.inviterProfile?.username ??
                              null,
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
                            className="font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                          >
                            {inv.matches?.title ?? "un partido"}
                          </Link>
                        </p>
                        {inv.matches?.starts_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(inv.matches.starts_at).toLocaleString(
                              "es-CO",
                              {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2.5">
                          <Button
                            size="sm"
                            className="rounded-xl gap-1 bg-violet-600 hover:bg-violet-700"
                            onClick={() =>
                              handleAcceptMatchInvite(inv.id, inv.match_id)
                            }
                          >
                            <Check className="size-3.5" /> Aceptar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl gap-1"
                            onClick={() => handleRejectMatchInvite(inv.id)}
                          >
                            <X className="size-3.5" /> Rechazar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Regular notifications */}
            {notifications.length === 0 && !hasActionable ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                  <Bell className="size-7 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    Sin notificaciones
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Acá aparecerán tus actividades recientes.
                  </p>
                </div>
              </div>
            ) : notifications.length > 0 ? (
              <section>
                {hasActionable && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <Bell className="size-3.5" /> Actividad reciente
                  </p>
                )}
                <div className="flex flex-col border border-border/60 rounded-2xl divide-y divide-border/50 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-4 p-4 transition-colors ${
                        !n.read_at
                          ? "bg-violet-50/50 dark:bg-violet-900/10"
                          : "bg-background hover:bg-muted/30"
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <Link
                          href={
                            n.data.match_id
                              ? `/matches/${n.data.match_id}`
                              : "#"
                          }
                          className="text-sm hover:underline"
                        >
                          {getMessage(n)}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.created_at).toLocaleString("es-CO")}
                        </span>
                      </div>
                      {!n.read_at && (
                        <div className="size-2 rounded-full bg-violet-600 mt-2 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
