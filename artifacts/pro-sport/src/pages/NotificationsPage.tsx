import { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNotifCount } from "@/context/NotifContext";
import {
  Bell, CheckCircle2, MessageSquare, UserPlus, Mail,
  Check, X, Trash2, Eye, CalendarCheck, Building2, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { initialsFromName } from "@/lib/format";
import { toast } from "sonner";
import {
  getPendingReceived, acceptFriendRequest, rejectFriendRequest,
  getPendingMatchInvitations, respondToMatchInvitation, type FriendWithProfile,
} from "@/lib/friends/api";
import type { MatchInvitation, Notification, NotificationData } from "@/lib/types/db";
import { useNotifications, type MatchInviteWithMatch } from "@/hooks/useNotifications";

const supabase = createClient();

// Move logic to hook

type Filter = "all" | "unread" | "reservas" | "partidos" | "torneos";

const FILTER_LABELS: Record<Filter, string> = {
  all: "Todas", unread: "No leídas", reservas: "Reservas", partidos: "Partidos", torneos: "Torneos",
};

function isBookingType(t: string) {
  return ["booking_new_request","booking_confirmed","booking_cancelled","booking_cancelled_owner","booking_created"].includes(t);
}
function isMatchType(t: string) {
  return ["match_request","match_accepted","match_invite","match_updated"].includes(t);
}
function isTournamentType(t: string) {
  return ["tournament_registered","tournament_accepted","tournament_rejected",
          "tournament_match_scheduled","tournament_result","tournament_cancelled"].includes(t);
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { clearCount } = useNotifCount();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<Filter>("all");

  const {
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
  } = useNotifications(user?.id);

  const navigateTo = (n: Notification) => {
    if (!n.read_at) markOneRead(n.id);
    const href = getNotifLink(n);
    if (href !== "#") setLocation(href);
  };

  const getIcon = (type: string) => {
    if (type === "match_request")            return <UserPlus className="size-4 text-blue-500" />;
    if (type === "match_accepted")           return <CheckCircle2 className="size-4 text-green-500" />;
    if (type === "match_invite")             return <MessageSquare className="size-4 text-violet-500" />;
    if (type === "match_updated")            return <Bell className="size-4 text-amber-500" />;
    if (type === "booking_new_request")      return <Building2 className="size-4 text-amber-500" />;
    if (type === "booking_confirmed")        return <CalendarCheck className="size-4 text-emerald-500" />;
    if (type === "booking_cancelled" || type === "booking_cancelled_owner") return <X className="size-4 text-red-500" />;
    if (type === "booking_created")          return <CalendarCheck className="size-4 text-emerald-500" />;
    if (type === "tournament_registered")    return <Trophy className="size-4 text-violet-500" />;
    if (type === "tournament_accepted")      return <Trophy className="size-4 text-emerald-500" />;
    if (type === "tournament_rejected")      return <Trophy className="size-4 text-red-500" />;
    if (type === "tournament_match_scheduled") return <Trophy className="size-4 text-blue-500" />;
    if (type === "tournament_result")        return <Trophy className="size-4 text-amber-500" />;
    if (type === "tournament_cancelled")     return <Trophy className="size-4 text-red-400" />;
    return <Bell className="size-4 text-muted-foreground" />;
  };

  const getMessage = (n: Notification) => {
    const d = n.data as Record<string, unknown>;
    const { player_name, match_title, changes, needs_reconfirm,
            cancha_name, booking_date, start_time, booker_name,
            tournament_name, tournament_id: _tid, round, opponent, result } = d;

    const dateStr = (booking_date as string | undefined)
      ? new Date(`${booking_date as string}T12:00:00`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })
      : null;
    const timeStr = (start_time as string | undefined) ? (start_time as string).substring(0, 5) + "h" : null;

    switch (n.type) {
      case "match_request":
        return <span><strong>{(player_name as string) || "Un usuario"}</strong> solicitó unirse a tu partido.</span>;
      case "match_accepted":
        return <span>Tu solicitud para unirse al partido fue <strong>aceptada</strong>.</span>;
      case "match_invite":
        return <span>Fuiste <strong>invitado</strong> a un partido.</span>;
      case "match_updated":
        return <span>El partido <strong>{(match_title as string) || ""}</strong> fue actualizado{changes ? ` (${changes as string})` : ""}.{needs_reconfirm ? <strong> Reconfirmá tu asistencia.</strong> : ""}</span>;
      case "booking_new_request":
        return <span>🏟️ <strong>{(booker_name as string) || "Un usuario"}</strong> solicitó turno en <strong>{(cancha_name as string) || "tu cancha"}</strong>{dateStr ? <> el {dateStr}</> : ""}{timeStr ? <> a las {timeStr}</> : ""}.</span>;
      case "booking_confirmed":
        return <span>✅ Tu reserva en <strong>{(cancha_name as string) || "la cancha"}</strong>{dateStr ? <> del {dateStr}</> : ""}{timeStr ? <> a las {timeStr}</> : ""} fue <strong>confirmada</strong>.</span>;
      case "booking_cancelled_owner":
      case "booking_cancelled":
        return <span>❌ Tu reserva en <strong>{(cancha_name as string) || "la cancha"}</strong>{dateStr ? <> del {dateStr}</> : ""}{timeStr ? <> a las {timeStr}</> : ""} fue <strong>cancelada</strong>.</span>;
      case "booking_created":
        return <span>🏟️ Nueva reserva en <strong>{(cancha_name as string) || "tu cancha"}</strong>{dateStr ? <> para el {dateStr}</> : ""}{timeStr ? <> a las {timeStr}</> : ""}.</span>;
      case "tournament_registered":
        return <span>🏆 Te inscribiste en <strong>{(tournament_name as string) || "el torneo"}</strong>. Tu inscripción está <strong>pendiente de aprobación</strong>.</span>;
      case "tournament_accepted":
        return <span>🏆 ¡Tu inscripción en <strong>{(tournament_name as string) || "el torneo"}</strong> fue <strong>aceptada</strong>! Ya sos parte del torneo.</span>;
      case "tournament_rejected":
        return <span>🏆 Tu inscripción en <strong>{(tournament_name as string) || "el torneo"}</strong> fue <strong>rechazada</strong>.</span>;
      case "tournament_match_scheduled":
        return <span>🏆 Tenés un partido programado en <strong>{(tournament_name as string) || "el torneo"}</strong>{round ? <> — {round as string}</> : ""}{opponent ? <> vs <strong>{opponent as string}</strong></> : ""}.</span>;
      case "tournament_result":
        return <span>🏆 Resultado cargado en <strong>{(tournament_name as string) || "el torneo"}</strong>{result ? <> — {result as string}</> : ""}.</span>;
      case "tournament_cancelled":
        return <span>🏆 El torneo <strong>{(tournament_name as string) || ""}</strong> fue <strong>cancelado</strong>.</span>;
      default:
        return <span>Nueva notificación.</span>;
    }
  };

  const getNotifLink = (n: Notification): string => {
    const d = n.data as Record<string, unknown>;
    if (d.tournament_id) return `/tournaments/${d.tournament_id as string}`;
    if (d.match_id)      return `/matches/${d.match_id as string}`;
    
    if (d.cancha_id) {
      // Notificaciones para el DUEÑO (ir a Agenda)
      if (n.type === "booking_new_request" || n.type === "booking_created") {
        return `/canchas/${d.cancha_id as string}/agenda`;
      }
      // Notificaciones para el JUGADOR (ir a Mis Reservas)
      if (n.type === "booking_confirmed" || n.type === "booking_cancelled" || n.type === "booking_cancelled_owner") {
        return `/mis-reservas`;
      }
      // Default para canchas
      return `/canchas/${d.cancha_id as string}`;
    }
    return "#";
  };

  const countFor = (f: Filter) => {
    if (f === "unread")    return notifications.filter((n) => !n.read_at).length;
    if (f === "reservas")  return notifications.filter((n) => isBookingType(n.type)).length;
    if (f === "partidos")  return notifications.filter((n) => isMatchType(n.type)).length;
    if (f === "torneos")   return notifications.filter((n) => isTournamentType(n.type)).length;
    return notifications.length;
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread")   return !n.read_at;
    if (filter === "reservas") return isBookingType(n.type);
    if (filter === "partidos") return isMatchType(n.type);
    if (filter === "torneos")  return isTournamentType(n.type);
    return true;
  });

  const unreadCount  = notifications.filter((n) => !n.read_at).length;
  const hasRead      = notifications.some((n) => !!n.read_at);
  const hasActionable = friendRequests.length > 0 || matchInvitations.length > 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader
        title={
          <>
            Notificaciones
            {unreadCount > 0 && (
              <span className="ml-2 text-xs font-semibold bg-violet-600 text-white px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </>
        }
        actions={
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}
                className="text-xs text-muted-foreground rounded-xl gap-1">
                <Eye className="size-3" /> Todas leídas
              </Button>
            )}
            {hasRead && (
              <Button variant="ghost" size="sm" onClick={deleteAllRead}
                className="text-xs text-destructive/70 hover:text-destructive rounded-xl gap-1">
                <Trash2 className="size-3" /> Borrar leídas
              </Button>
            )}
          </div>
        }
      />

      <main className="container mx-auto px-4 py-4 max-w-2xl space-y-4">
        {/* Filtros */}
        {notifications.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => {
              const count = countFor(f);
              if (f !== "all" && f !== "unread" && count === 0) return null;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    filter === f
                      ? "bg-violet-600 text-white border-violet-600"
                      : "border-border/60 hover:border-violet-400 hover:text-violet-600 bg-white dark:bg-zinc-900"
                  }`}
                >
                  {FILTER_LABELS[f]}{count > 0 ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Solicitudes de amistad */}
            {friendRequests.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <UserPlus className="size-3.5" /> Solicitudes de amistad
                </p>
                <div className="flex flex-col border border-border/60 rounded-2xl divide-y divide-border/50 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                  {friendRequests.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-4 bg-violet-50/50 dark:bg-violet-900/10">
                      <Link href={`/profile/${f.requester_id}`}>
                        <Avatar className="size-10 cursor-pointer shrink-0">
                          {f.profile.avatar_url && <AvatarImage src={f.profile.avatar_url} />}
                          <AvatarFallback className="text-xs">{initialsFromName(f.profile.full_name ?? f.profile.username)}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{f.profile.full_name ?? f.profile.username ?? "Usuario"}</p>
                        <p className="text-xs text-muted-foreground">quiere ser tu amigo</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" className="rounded-xl w-8 h-8 p-0 bg-violet-600 hover:bg-violet-700" onClick={() => handleAcceptFriend(f.id)}>
                          <Check className="size-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-xl w-8 h-8 p-0" onClick={() => handleRejectFriend(f.id)}>
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Invitaciones a partidos */}
            {matchInvitations.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Mail className="size-3.5" /> Invitaciones a partidos
                </p>
                <div className="flex flex-col border border-border/60 rounded-2xl divide-y divide-border/50 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                  {matchInvitations.map((inv) => (
                    <div key={inv.id} className="flex items-start gap-3 p-4 bg-violet-50/50 dark:bg-violet-900/10">
                      <Avatar className="size-10 shrink-0 mt-0.5">
                        {inv.inviterProfile?.avatar_url && <AvatarImage src={inv.inviterProfile.avatar_url} />}
                        <AvatarFallback className="text-xs">{initialsFromName(inv.inviterProfile?.full_name ?? inv.inviterProfile?.username ?? null)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <strong>{inv.inviterProfile?.full_name ?? inv.inviterProfile?.username ?? "Un usuario"}</strong>{" "}
                          te invitó a{" "}
                          <Link href={`/matches/${inv.match_id}`} className="font-semibold text-violet-600 dark:text-violet-400 hover:underline">
                            {inv.matches?.title ?? "un partido"}
                          </Link>
                        </p>
                        {inv.matches?.starts_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(inv.matches.starts_at).toLocaleString("es-CO", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2.5">
                          <Button size="sm" className="rounded-xl gap-1 bg-violet-600 hover:bg-violet-700" onClick={() => handleAcceptMatchInvite(inv.id, inv.match_id)}>
                            <Check className="size-3.5" /> Aceptar
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => handleRejectMatchInvite(inv.id)}>
                            <X className="size-3.5" /> Rechazar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Lista principal */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                  <Bell className="size-7 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">
                    {filter === "all" && !hasActionable ? "Sin notificaciones" : `Sin notificaciones en "${FILTER_LABELS[filter]}"`}
                  </p>
                  <p className="text-sm text-muted-foreground">Acá aparecerán tus actividades recientes.</p>
                </div>
              </div>
            ) : (
              <section>
                {hasActionable && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Bell className="size-3.5" /> Actividad reciente
                  </p>
                )}
                <div className="flex flex-col border border-border/60 rounded-2xl divide-y divide-border/50 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
                  {filtered.map((n) => {
                    const link = getNotifLink(n);
                    const isClickable = link !== "#";
                    return (
                      <div
                        key={n.id}
                        className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                          !n.read_at ? "bg-violet-50/60 dark:bg-violet-900/10" : "bg-background"
                        } ${isClickable ? "cursor-pointer hover:bg-muted/40" : ""}`}
                        onClick={() => isClickable && navigateTo(n)}
                      >
                        {/* Indicador no-leído */}
                        <div className="shrink-0 flex items-center justify-center">
                          {!n.read_at
                            ? <div className="size-2 rounded-full bg-violet-600" />
                            : <div className="size-2" />
                          }
                        </div>

                        {/* Icono */}
                        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          {getIcon(n.type)}
                        </div>

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">{getMessage(n)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {new Date(n.created_at).toLocaleString("es-CO", {
                                weekday: "short", day: "numeric", month: "short",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                            {isClickable && (
                              <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                                Ver detalle →
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Acciones en fila */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!n.read_at && (
                            <button
                              onClick={() => markOneRead(n.id)}
                              title="Marcar como leída"
                              className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                            >
                              <Check className="size-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteOne(n.id)}
                            disabled={deletingId === n.id}
                            title="Eliminar"
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
