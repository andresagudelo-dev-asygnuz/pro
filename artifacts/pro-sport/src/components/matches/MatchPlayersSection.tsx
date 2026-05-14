import { Link } from "wouter";
import { Users, UserPlus, Check, X, Crown, CheckCircle2, Clock, ListOrdered, Mail, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFromName } from "@/lib/format";
import type { Match, MatchParticipant, Profile, MatchWaitlist } from "@/lib/types/db";
import type { FriendWithProfile } from "@/lib/friends/api";

type WaitlistEntry = MatchWaitlist & { profile?: Pick<Profile, "full_name" | "username" | "avatar_url"> | null };

interface Props {
  match: Match;
  joinedParts: MatchParticipant[];
  waitlist: WaitlistEntry[];
  profilesById: Map<string, Profile>;
  userId: string | undefined;
  canInvite: boolean;
  isFull: boolean;
  spotsLeft: number;
  isOrganizer: boolean;
  matchPassed: boolean;
  canJoinWaitlist: boolean;
  isOnWaitlist: boolean;
  myWaitPosition: number | null;
  joiningWaitlist: boolean;
  showInvitePanel: boolean;
  friends: FriendWithProfile[];
  friendsLoaded: boolean;
  selectedFriendIds: Set<string>;
  sendingInvites: boolean;
  onOpenInvitePanel: () => void;
  onCloseInvitePanel: () => void;
  onToggleFriend: (id: string) => void;
  onSendInvites: () => void;
  onJoinWaitlist: () => void;
}

export function MatchPlayersSection({
  match, joinedParts, waitlist, profilesById, userId,
  canInvite, isFull, spotsLeft, isOrganizer, matchPassed, canJoinWaitlist,
  isOnWaitlist, myWaitPosition, joiningWaitlist,
  showInvitePanel, friends, friendsLoaded, selectedFriendIds, sendingInvites,
  onOpenInvitePanel, onCloseInvitePanel, onToggleFriend, onSendInvites, onJoinWaitlist,
}: Props) {
  return (
    <>
      {/* Players list */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-bold">Jugadores</h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{joinedParts.length}/{match.max_players}</span>
          {canInvite && (
            <button onClick={onOpenInvitePanel} className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors">
              <UserPlus className="size-3.5" /> Invitar amigos
            </button>
          )}
        </div>

        {showInvitePanel && (
          <div className="border-b border-border/40 bg-violet-50/50 dark:bg-violet-950/20 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">Invitar amigos</p>
              <button onClick={onCloseInvitePanel} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            {!friendsLoaded ? (
              <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : friends.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No hay amigos disponibles para invitar.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {friends.map((f) => {
                  const selected = selectedFriendIds.has(f.profile.id);
                  return (
                    <button key={f.profile.id} onClick={() => onToggleFriend(f.profile.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors text-left ${selected ? "bg-violet-100 dark:bg-violet-900/40" : "hover:bg-muted"}`}>
                      <Avatar className="size-8 shrink-0">
                        {f.profile.avatar_url && <AvatarImage src={f.profile.avatar_url} />}
                        <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700">{initialsFromName(f.profile.full_name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium flex-1">{f.profile.full_name ?? f.profile.username ?? "—"}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selected ? "bg-violet-600 border-violet-600" : "border-zinc-300 dark:border-zinc-600"}`}>
                        {selected && <Check className="size-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedFriendIds.size > 0 && (
              <Button size="sm" className="w-full mt-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white" disabled={sendingInvites} onClick={onSendInvites}>
                <Mail className="size-3.5 mr-1.5" />
                {sendingInvites ? "Enviando…" : `Invitar a ${selectedFriendIds.size} jugador${selectedFriendIds.size !== 1 ? "es" : ""}`}
              </Button>
            )}
          </div>
        )}

        {joinedParts.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Nadie se unió todavía. ¡Sé el primero!</div>
        ) : (
          <ul className="divide-y divide-border/40">
            {joinedParts.map((p) => {
              const pp = profilesById.get(p.user_id);
              if (!pp) return null;
              const isOrgRow = p.user_id === match.organizer_id;
              return (
                <li key={p.user_id} className="flex items-center justify-between px-5 py-3">
                  <Link href={`/profile/${pp.id}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
                    <div className="relative">
                      <Avatar className="size-10">
                        {pp.avatar_url && <AvatarImage src={pp.avatar_url} />}
                        <AvatarFallback className="text-xs font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">{initialsFromName(pp.full_name)}</AvatarFallback>
                      </Avatar>
                      {isOrgRow && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center"><Crown className="size-2.5 text-white" /></span>}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{pp.full_name ?? pp.username ?? "—"}{isOrgRow && <span className="ml-1.5 text-[10px] text-violet-500 font-bold">ORGANIZA</span>}</p>
                      {pp.rating_count > 0 && (
                        <p className="text-xs text-muted-foreground">
                          <Star className="size-2.5 inline fill-amber-400 text-amber-400 mr-0.5" />
                          {pp.rating_avg?.toFixed ? pp.rating_avg.toFixed(1) : pp.rating_avg} ({pp.rating_count})
                        </p>
                      )}
                    </div>
                  </Link>
                  {p.confirmed_at
                    ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full"><CheckCircle2 className="size-3" /> Confirmado</span>
                    : <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"><Clock className="size-3" /> Pendiente</span>
                  }
                </li>
              );
            })}
          </ul>
        )}

        {spotsLeft > 0 && (
          <div className="px-5 py-3 border-t border-border/40 flex items-center gap-2 flex-wrap">
            {Array.from({ length: Math.min(spotsLeft, 6) }).map((_, i) => (
              <div key={i} className="w-10 h-10 rounded-full border-2 border-dashed border-border flex items-center justify-center text-muted-foreground/40 text-sm font-light">+</div>
            ))}
            {spotsLeft > 6 && <span className="text-xs text-muted-foreground">+{spotsLeft - 6} cupos</span>}
          </div>
        )}
      </div>

      {/* Waitlist */}
      {!matchPassed && match.status === "open" && (isFull || waitlist.length > 0) && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
            <ListOrdered className="size-4 text-amber-500" />
            <h2 className="text-sm font-bold">Lista de espera</h2>
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{waitlist.length} en espera</span>
          </div>
          {waitlist.length === 0 ? (
            <div className="px-5 py-4 text-sm text-muted-foreground">Nadie en lista de espera todavía.</div>
          ) : (
            <ul className="divide-y divide-border/40">
              {waitlist.map((entry, idx) => {
                const pp = entry.profile ?? profilesById.get(entry.user_id);
                const isMe = entry.user_id === userId;
                return (
                  <li key={entry.id} className={`flex items-center gap-3 px-5 py-3 ${isMe ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}`}>
                    <span className="text-xs font-black text-amber-500 w-5 text-right shrink-0">#{idx + 1}</span>
                    <Avatar className="size-8">
                      {pp?.avatar_url && <AvatarImage src={pp.avatar_url} />}
                      <AvatarFallback className="text-xs">{initialsFromName(pp?.full_name ?? null)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium flex-1">{pp?.full_name ?? pp?.username ?? "Jugador"}{isMe && <span className="ml-1.5 text-[10px] text-amber-600 font-bold">TÚ</span>}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(entry.joined_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {canJoinWaitlist && !isOrganizer && (
            <div className="px-5 py-4 border-t border-border/40">
              {isOnWaitlist ? (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Estás en la lista · Posición #{myWaitPosition}</p>
                    <p className="text-xs text-muted-foreground">Te avisaremos si se libera un cupo.</p>
                  </div>
                  <button onClick={onJoinWaitlist} disabled={joiningWaitlist} className="text-xs text-muted-foreground hover:text-red-500 transition-colors shrink-0">
                    {joiningWaitlist ? "…" : "Salir"}
                  </button>
                </div>
              ) : (
                <Button size="sm" onClick={onJoinWaitlist} disabled={joiningWaitlist} variant="outline" className="w-full rounded-xl border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                  <ListOrdered className="size-4 mr-2" />{joiningWaitlist ? "Uniéndote…" : "Unirme a la lista de espera"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
