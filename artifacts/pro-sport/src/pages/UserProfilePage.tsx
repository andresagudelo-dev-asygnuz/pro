import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { formatMatchDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { PlayerCard } from "@/components/PlayerCard";
import {
  UserPlus, UserCheck, Clock, X, Check, ArrowLeft,
  Star, Zap, Target, Flame, MapPin, Users, ChevronRight, Activity,
} from "lucide-react";
import { toast } from "sonner";
import type { Match, Profile, Sport, Team } from "@/lib/types/db";
import { PLAYER_POSITIONS } from "@/lib/types/db";
import type { Friendship } from "@/lib/types/db";
import {
  getFriendshipBetween,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "@/lib/friends/api";

const supabase = createClient();

const LEVEL_CONFIG: Record<string, { label: string; glow: string; badge: string }> = {
  principiante: { label: "Principiante", glow: "bg-amber-500",  badge: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  intermedio:   { label: "Intermedio",   glow: "bg-slate-300",  badge: "bg-white/10 text-slate-200 border-white/20" },
  avanzado:     { label: "Avanzado",     glow: "bg-yellow-400", badge: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30" },
  pro:          { label: "Pro",          glow: "bg-violet-500", badge: "bg-violet-500/20 text-violet-200 border-violet-400/30" },
};

const SKILL_DEFS = [
  { key: "skill_pace"      as const, label: "PAC", name: "Velocidad" },
  { key: "skill_shooting"  as const, label: "TIR", name: "Disparo"   },
  { key: "skill_passing"   as const, label: "PAS", name: "Pase"      },
  { key: "skill_dribbling" as const, label: "REG", name: "Regate"    },
  { key: "skill_defending" as const, label: "DEF", name: "Defensa"   },
  { key: "skill_physical"  as const, label: "FIS", name: "Físico"    },
];

export default function UserProfilePage() {
  const { user }  = useAuth();
  const { id }    = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [profile, setProfile]         = useState<Profile | null>(null);
  const [sport, setSport]             = useState<Sport | null>(null);
  const [teams, setTeams]             = useState<Team[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [friendship, setFriendship]   = useState<Friendship | null | undefined>(undefined);
  const [friendPending, setFriendPending] = useState(false);

  const isMe = user?.id === id;

  useEffect(() => {
    (async () => {
      const { data: raw } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (!raw) { setError("Perfil no encontrado"); setLoading(false); return; }
      const p = raw as Profile;
      setProfile(p);

      const [sportRes, teamMembersRes, matchPartsRes] = await Promise.all([
        p.primary_sport_id
          ? supabase.from("sports").select("*").eq("id", p.primary_sport_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("team_members").select("team_id").eq("user_id", p.id),
        supabase
          .from("match_participants")
          .select("match_id")
          .eq("user_id", p.id)
          .in("status", ["joined", "attended"])
          .order("joined_at", { ascending: false })
          .limit(8),
      ]);

      setSport(sportRes.data as Sport | null);

      const teamIds = (teamMembersRes.data ?? []).map((r: { team_id: string }) => r.team_id);
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase.from("teams").select("*").in("id", teamIds);
        setTeams((teamsData ?? []) as Team[]);
      }

      const matchIds = (matchPartsRes.data ?? []).map((r: { match_id: string }) => r.match_id);
      if (matchIds.length > 0) {
        const { data: matchesData } = await supabase
          .from("matches").select("*").in("id", matchIds).order("starts_at", { ascending: false });
        setRecentMatches((matchesData ?? []) as Match[]);
      }

      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!user || !id || isMe) return;
    getFriendshipBetween(supabase, user.id, id).then(({ data }) => setFriendship(data));
  }, [user, id, isMe]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <p className="text-muted-foreground">{error ?? "Perfil no encontrado"}</p>
    </div>
  );

  const amIRequester = friendship?.requester_id === user?.id;
  const amIAddressee = friendship?.addressee_id === user?.id;
  const level   = profile.primary_skill_level ?? "intermedio";
  const lvlCfg  = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.intermedio;
  const ovr     = Math.round(
    ((profile.skill_pace ?? 50) + (profile.skill_shooting ?? 50) + (profile.skill_passing ?? 50) +
     (profile.skill_dribbling ?? 50) + (profile.skill_defending ?? 50) + (profile.skill_physical ?? 50)) / 6
  );
  const positionInfo = profile.position
    ? (PLAYER_POSITIONS.find(p => p.value === profile.position) ?? null)
    : null;

  async function handleSendRequest() {
    if (!user) return;
    setFriendPending(true);
    const { data, error: e } = await sendFriendRequest(supabase, user.id, profile!.id);
    if (e) toast.error(e); else { setFriendship(data); toast.success("Solicitud enviada."); }
    setFriendPending(false);
  }
  async function handleAccept() {
    if (!friendship) return;
    setFriendPending(true);
    const { data, error: e } = await acceptFriendRequest(supabase, friendship.id);
    if (e) toast.error(e); else { setFriendship(data); toast.success("¡Ahora son amigos!"); }
    setFriendPending(false);
  }
  async function handleReject() {
    if (!friendship) return;
    setFriendPending(true);
    const { error: e } = await rejectFriendRequest(supabase, friendship.id);
    if (e) toast.error(e); else setFriendship(null);
    setFriendPending(false);
  }
  async function handleRemove() {
    if (!friendship) return;
    setFriendPending(true);
    const { error: e } = await removeFriend(supabase, friendship.id);
    if (e) toast.error(e); else { setFriendship(null); toast.success("Amigo eliminado."); }
    setFriendPending(false);
  }

  function FriendButton() {
    if (isMe || friendship === undefined) return null;
    if (!friendship) return (
      <Button size="sm" onClick={handleSendRequest} disabled={friendPending}
        className="rounded-2xl h-9 px-5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs gap-1.5">
        <UserPlus className="size-3.5" /> Agregar amigo
      </Button>
    );
    if (friendship.status === "accepted") return (
      <Button size="sm" variant="outline" onClick={handleRemove} disabled={friendPending}
        className="rounded-2xl h-9 px-5 text-xs gap-1.5 border-white/20 text-white/80 hover:bg-red-900/30 hover:border-red-400/30 hover:text-red-300 transition-colors bg-white/10">
        <UserCheck className="size-3.5" /> Amigos
      </Button>
    );
    if (friendship.status === "pending" && amIRequester) return (
      <Button size="sm" variant="outline" disabled
        className="rounded-2xl h-9 px-5 text-xs gap-1.5 border-white/20 text-white/50 bg-white/5">
        <Clock className="size-3.5" /> Pendiente
      </Button>
    );
    if (friendship.status === "pending" && amIAddressee) return (
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAccept} disabled={friendPending}
          className="rounded-2xl h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
          <Check className="size-3.5" /> Aceptar
        </Button>
        <Button size="sm" variant="outline" onClick={handleReject} disabled={friendPending}
          className="rounded-2xl h-9 w-9 border-white/20 bg-white/10 text-white/70 p-0">
          <X className="size-3.5" />
        </Button>
      </div>
    );
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pb-24">

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-b-[36px] pb-8"
        style={{ background: "linear-gradient(160deg, #2e1065 0%, #1e1b4b 35%, #312e81 65%, #1a1a2e 100%)" }}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          <div className={`w-96 h-96 rounded-full blur-[120px] opacity-30 ${lvlCfg.glow}`} />
        </div>

        {/* ── Back + Friend button row ── */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-1">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors rounded-xl px-2 py-1.5 hover:bg-white/10"
          >
            <ArrowLeft className="size-4" /> Volver
          </button>
          {!isMe && <FriendButton />}
        </div>

        {/* ── Stats row (glassmorphism) ── */}
        <div className="relative z-10 px-4 pt-3 pb-4">
          <div className="grid grid-cols-4 divide-x divide-white/10 bg-white/15 rounded-2xl border border-white/15 overflow-hidden">
            {[
              { value: ovr,                                             label: "OVR",      icon: <Star className="size-3" />,   color: "text-violet-200" },
              { value: profile.matches_played ?? 0,                     label: "Partidos", icon: <Zap className="size-3" />,   color: "text-white" },
              { value: profile.rating_count > 0 ? (profile.rating_avg as number).toFixed(1) : "—", label: "Rating", icon: <Flame className="size-3" />, color: "text-amber-300" },
              { value: profile.tournament_goals ?? 0,                   label: "Goles",    icon: <Target className="size-3" />,color: "text-emerald-300" },
            ].map(({ value, label, icon, color }) => (
              <div key={label} className="flex flex-col items-center py-3 px-1 gap-0.5">
                <p className={`text-xl font-black tabular-nums ${color}`}>{value}</p>
                <div className={`${color} opacity-60`}>{icon}</div>
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Player card (FIFA style, read-only) ── */}
        <div className="relative z-10">
          <PlayerCard profile={profile} editable={false} />
        </div>

        {/* ── Level + Position badges ── */}
        <div className="flex justify-center gap-2 mt-5 z-10 relative flex-wrap px-4">
          <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest ${lvlCfg.badge}`}>
            <span className="size-1.5 rounded-full bg-current opacity-70" />
            {lvlCfg.label}
          </span>
          {positionInfo && (
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 text-white text-xs font-bold uppercase tracking-widest">
              <span className="text-white/50 text-[10px] font-black">{positionInfo.abbr}</span>
              {positionInfo.label}
            </span>
          )}
        </div>
      </div>

      {/* ══ CONTENT ═══════════════════════════════════════════════════════ */}
      <main className="px-4 py-4 max-w-2xl mx-auto space-y-3 mt-2">

        {/* ── HABILIDADES ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Habilidades</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-black text-zinc-900 dark:text-white">OVR <span className="text-violet-600">{ovr}</span></p>
                {positionInfo && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-600 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-full border border-violet-200 dark:border-violet-700/40">
                    {positionInfo.abbr} · {positionInfo.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="px-5 pb-5 grid grid-cols-2 gap-x-8 gap-y-3.5">
            {SKILL_DEFS.map(({ key, label, name }) => {
              const val = (profile[key] as number) ?? 50;
              return (
                <div key={key}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-black text-zinc-900 dark:text-white tabular-nums">{val}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60">{name}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-700"
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {profile.bio && (
            <div className="border-t border-border/40 px-5 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed italic">"{profile.bio}"</p>
            </div>
          )}
        </div>

        {/* ── EQUIPOS ── */}
        {teams.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Equipos</p>
              <span className="text-xs text-muted-foreground">{teams.length}</span>
            </div>
            <div className="px-3 pb-4 space-y-1">
              {teams.map((team) => (
                <Link key={team.id} href={`/equipos/${team.id}`}>
                  <div className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm"
                      style={{ background: team.header_color ?? "linear-gradient(135deg,#7c3aed,#5b21b6)" }}
                    >
                      {(team.name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{team.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3" />{team.city} · <Users className="size-3" />{team.sport_type}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── ÚLTIMAS ACTIVIDADES ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 pt-5 pb-3">
            <Activity className="size-4 text-emerald-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Últimas actividades</p>
          </div>
          {recentMatches.length === 0 ? (
            <div className="px-5 pb-6 text-center">
              <p className="text-sm text-muted-foreground">Sin partidos recientes.</p>
            </div>
          ) : (
            <div className="pb-3">
              {recentMatches.map((m) => {
                const isPast = new Date(m.starts_at) < new Date();
                return (
                  <Link key={m.id} href={`/matches/${m.id}`}>
                    <div className="flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isPast ? "bg-zinc-300 dark:bg-zinc-600" : "bg-emerald-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{formatMatchDate(m.starts_at)} · {m.city}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        m.status === "completed" ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                          : m.status === "cancelled" ? "bg-red-100 text-red-500 dark:bg-red-950/30 dark:text-red-400"
                          : m.status === "open" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {m.status === "completed" ? "Finalizado"
                          : m.status === "cancelled" ? "Cancelado"
                          : m.status === "open" ? "Abierto"
                          : m.status}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
