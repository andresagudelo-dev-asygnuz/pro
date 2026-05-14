import { Mail, Send, Users, Check, X, UserPlus, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import { initialsFromName } from "@/lib/format";
import type { Match, MatchParticipant, Profile, MatchInvitation } from "@/lib/types/db";

type PendingInvite = MatchInvitation & { profile?: Profile | null };

interface Props {
  match: Match;
  isOrganizer: boolean;
  isJoined: boolean;
  isConfirmed: boolean;
  isFull: boolean;
  isCancelled: boolean;
  spotsLeft: number;
  myInvitation: MatchInvitation | null;
  pendingInvitations: PendingInvite[];
  requestedParts: MatchParticipant[];
  profilesById: Map<string, Profile>;
  acceptingRequest: string | null;
  respondingInvite: boolean;
  requesting: boolean;
  confirming: boolean;
  onCancelRequest: () => void;
  onConfirm: () => void;
  onRequestJoin: () => void;
  onRespondInvitation: (status: "accepted" | "rejected") => void;
  onAcceptRequest: (uid: string) => void;
  onRejectRequest: (uid: string) => void;
}

export function MatchActionsPanel({
  match, isOrganizer, isJoined, isConfirmed, isFull, isCancelled, spotsLeft,
  myInvitation, pendingInvitations, requestedParts, profilesById,
  acceptingRequest, respondingInvite, requesting, confirming,
  onCancelRequest, onConfirm, onRequestJoin, onRespondInvitation,
  onAcceptRequest, onRejectRequest,
}: Props) {
  return (
    <>
      {/* Invitation banner */}
      {myInvitation?.status === "pending" && !isJoined && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-700 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Mail className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">Te invitaron a este partido</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={respondingInvite} onClick={() => onRespondInvitation("accepted")} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl flex-1">Aceptar e ingresar</Button>
            <Button size="sm" variant="outline" disabled={respondingInvite} onClick={() => onRespondInvitation("rejected")} className="border-violet-300 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-xl">Rechazar</Button>
          </div>
        </div>
      )}
      {myInvitation?.status === "rejected" && !isJoined && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground text-center">
          Rechazaste la invitación a este partido.
        </div>
      )}

      {/* CTA */}
      {match.status === "open" && !isCancelled && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
          {!isOrganizer && isJoined && (
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">¡Estás dentro!</p>
                  <p className="text-xs text-muted-foreground">{isConfirmed ? "Asistencia confirmada ✓" : "Confirmá tu asistencia antes del partido"}</p>
                </div>
              </div>
              {!isConfirmed && (
                <Button size="sm" onClick={onConfirm} disabled={confirming} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white mb-2">
                  <CheckCircle2 className="size-4 mr-2" />{confirming ? "Confirmando…" : "Confirmar asistencia"}
                </Button>
              )}
              <button onClick={onCancelRequest} disabled={requesting} className="w-full text-xs text-muted-foreground hover:text-red-500 transition-colors text-center py-1">
                {requesting ? "…" : "Salir del partido"}
              </button>
            </div>
          )}
          {!isOrganizer && !isJoined && !isFull && (
            <div className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20">
              <p className="font-bold text-violet-900 dark:text-violet-200 text-sm mb-0.5">¿Querés jugar?</p>
              <p className="text-xs text-violet-700/70 dark:text-violet-400/70 mb-3">Quedan {spotsLeft} cupo{spotsLeft !== 1 ? "s" : ""} · Enviá tu solicitud al organizador</p>
              <Button onClick={onRequestJoin} disabled={requesting} className="w-full rounded-xl font-bold bg-violet-600 hover:bg-violet-700 text-white h-11">
                <Send className="size-4 mr-2" />{requesting ? "Enviando solicitud…" : "Enviar solicitud para unirme"}
              </Button>
            </div>
          )}
          {!isOrganizer && !isJoined && isFull && (
            <div className="p-5 flex items-center gap-3 text-muted-foreground bg-muted/30">
              <Users className="size-5 shrink-0" />
              <div><p className="font-semibold text-sm">Partido lleno</p><p className="text-xs">Ya no hay cupos disponibles.</p></div>
            </div>
          )}
          {isOrganizer && isJoined && !isConfirmed && (
            <div className="p-5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Panel del organizador</p>
              <Button size="sm" onClick={onConfirm} disabled={confirming} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="size-4 mr-2" />{confirming ? "Confirmando…" : "Confirmar mi asistencia"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Pending invitations sent by organizer */}
      {isOrganizer && pendingInvitations.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
            <Mail className="size-4 text-violet-500" />
            <h2 className="text-sm font-bold">Invitaciones enviadas</h2>
            <span className="ml-auto text-xs text-muted-foreground">{pendingInvitations.filter((i) => i.status === "pending").length} pendientes</span>
          </div>
          <ul className="divide-y divide-border/40">
            {pendingInvitations.map((inv) => {
              const pp = inv.profile;
              return (
                <li key={inv.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-7">
                      {pp?.avatar_url && <AvatarImage src={pp.avatar_url} />}
                      <AvatarFallback className="text-xs">{initialsFromName(pp?.full_name ?? null)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{pp?.full_name ?? pp?.username ?? "Usuario"}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${inv.status === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : inv.status === "accepted" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {inv.status === "pending" ? "Pendiente" : inv.status === "accepted" ? "Aceptó" : "Rechazó"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Join requests (organizer) */}
      {isOrganizer && requestedParts.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-violet-200 dark:border-violet-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-violet-200/60 dark:border-violet-800/40 flex items-center gap-2 bg-violet-50/60 dark:bg-violet-950/20">
            <UserPlus className="size-4 text-violet-600 dark:text-violet-400" />
            <h2 className="text-sm font-bold text-violet-900 dark:text-violet-200">Solicitudes de ingreso</h2>
            <span className="ml-auto flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 animate-pulse">
              {requestedParts.length} pendiente{requestedParts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ul className="divide-y divide-border/40">
            {requestedParts.map((p) => {
              const pp = profilesById.get(p.user_id);
              const isAccepting = acceptingRequest === p.user_id;
              return (
                <li key={p.user_id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar className="size-9 shrink-0">
                    {pp?.avatar_url && <AvatarImage src={pp.avatar_url} />}
                    <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700">{initialsFromName(pp?.full_name ?? null)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{pp?.full_name ?? pp?.username ?? "Jugador"}</p>
                    {(pp?.rating_count ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        <Star className="size-2.5 inline fill-amber-400 text-amber-400 mr-0.5" />
                        {pp?.rating_avg?.toFixed(1)} ({pp?.rating_count})
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button size="sm" disabled={isAccepting || isFull} onClick={() => onAcceptRequest(p.user_id)} className="h-7 rounded-lg text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Check className="size-3 mr-1" />{isAccepting ? "…" : isFull ? "Lleno" : "Aceptar"}
                    </Button>
                    <Button size="sm" variant="outline" disabled={isAccepting} onClick={() => onRejectRequest(p.user_id)} className="h-7 rounded-lg text-xs px-2.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400">
                      <X className="size-3" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
          {isFull && (
            <div className="px-5 py-3 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200/60 dark:border-amber-800/40">
              <p className="text-xs text-amber-700 dark:text-amber-400">El partido está lleno. Liberá un cupo antes de aceptar nuevas solicitudes.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
