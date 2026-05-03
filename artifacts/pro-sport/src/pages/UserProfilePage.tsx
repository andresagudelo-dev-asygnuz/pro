import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { formatMatchDate, initialsFromName } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import {
  UserPlus, UserCheck, Clock, X, Check, ArrowLeft,
  Star, Trophy, MapPin, Zap, Shield, Users, Activity,
} from "lucide-react";
import { toast } from "sonner";
import type { Match, Profile, Sport, Team } from "@/lib/types/db";
import type { Friendship } from "@/lib/types/db";
import {
  getFriendshipBetween,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from "@/lib/friends/api";

const supabase = createClient();

type RecentMatch = Match & { participantStatus?: string };

const SKILL_LABELS: { key: keyof Profile; label: string; color: string }[] = [
  { key: "skill_pace",       label: "Velocidad",   color: "bg-amber-500"   },
  { key: "skill_shooting",   label: "Remate",      color: "bg-red-500"     },
  { key: "skill_passing",    label: "Pase",        color: "bg-blue-500"    },
  { key: "skill_dribbling",  label: "Regate",      color: "bg-emerald-500" },
  { key: "skill_defending",  label: "Defensa",     color: "bg-violet-500"  },
  { key: "skill_physical",   label: "Físico",      color: "bg-orange-500"  },
];

const SKILL_LEVEL_MAP: Record<string, string> = {
  principiante: "Principiante", intermedio: "Intermedio", avanzado: "Avanzado", pro: "Pro",
};

export default function UserProfilePage() {
  const { user } = useAuth();
  const { id }   = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const [profile, setProfile]     = useState<Profile | null>(null);
  const [sport, setSport]         = useState<Sport | null>(null);
  const [teams, setTeams]         = useState<Team[]>([]);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [friendship, setFriendship] = useState<Friendship | null | undefined>(undefined);
  const [friendPending, setFriendPending] = useState(false);

  const isMe = user?.id === id;

  useEffect(() => {
    (async () => {
      const { data: profileRaw } = await supabase
        .from("profiles").select("*").eq("id", id).maybeSingle();
      if (!profileRaw) { setError("Perfil no encontrado"); setLoading(false); return; }
      const p = profileRaw as Profile;
      setProfile(p);

      const [sportRes, teamsRes, matchPartsRes] = await Promise.all([
        p.primary_sport_id
          ? supabase.from("sports").select("*").eq("id", p.primary_sport_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("team_members").select("team_id").eq("user_id", p.id),
        supabase
          .from("match_participants")
          .select("match_id, status, joined_at")
          .eq("user_id", p.id)
          .in("status", ["joined", "attended"])
          .order("joined_at", { ascending: false })
          .limit(10),
      ]);

      setSport(sportRes.data as Sport | null);

      // Load teams
      const teamIds = (teamsRes.data ?? []).map((r: { team_id: string }) => r.team_id);
      if (teamIds.length > 0) {
        const { data: teamsData } = await supabase.from("teams").select("*").in("id", teamIds);
        setTeams((teamsData ?? []) as Team[]);
      }

      // Load recent matches
      const matchIds = (matchPartsRes.data ?? []).map((r: { match_id: string }) => r.match_id);
      if (matchIds.length > 0) {
        const { data: matchesData } = await supabase
          .from("matches").select("*").in("id", matchIds).order("starts_at", { ascending: false });
        setRecentMatches((matchesData ?? []) as RecentMatch[]);
      }

      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (!user || !id || isMe) return;
    getFriendshipBetween(supabase, user.id, id).then(({ data }) => setFriendship(data));
  }, [user, id, isMe]);

  if (loading) return (
    <AppLayout>
      <div className="flex flex-col gap-3 max-w-2xl mx-auto">
        <div className="h-10 w-32 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="h-36 rounded-3xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        <div className="h-40 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
      </div>
    </AppLayout>
  );

  if (error || !profile) return (
    <AppLayout>
      <div className="p-6 bg-destructive/15 text-destructive rounded-xl">{error ?? "Perfil no encontrado"}</div>
    </AppLayout>
  );

  const amIRequester  = friendship?.requester_id === user?.id;
  const amIAddressee  = friendship?.addressee_id === user?.id;
  const hasSkills     = SKILL_LABELS.some((s) => (profile[s.key] as number) > 0);

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
        className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4">
        <UserPlus className="size-3.5 mr-1.5" /> Agregar amigo
      </Button>
    );
    if (friendship.status === "accepted") return (
      <Button size="sm" variant="outline" onClick={handleRemove} disabled={friendPending}
        className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 hover:text-red-600 transition-colors">
        <UserCheck className="size-3.5 mr-1.5" /> Amigos
      </Button>
    );
    if (friendship.status === "pending" && amIRequester) return (
      <Button size="sm" variant="outline" disabled className="rounded-xl text-muted-foreground">
        <Clock className="size-3.5 mr-1.5" /> Pendiente
      </Button>
    );
    if (friendship.status === "pending" && amIAddressee) return (
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAccept} disabled={friendPending} className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white">
          <Check className="size-3.5 mr-1" /> Aceptar
        </Button>
        <Button size="sm" variant="outline" onClick={handleReject} disabled={friendPending} className="rounded-xl">
          <X className="size-3.5" />
        </Button>
      </div>
    );
    return null;
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-3 max-w-2xl mx-auto">

        {/* ── Back ─────────────────────────────────────────────────────── */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors self-start px-1 py-1 -ml-1 rounded-lg hover:bg-muted"
        >
          <ArrowLeft className="size-4" /> Volver
        </button>

        {/* ── Hero / Player card ────────────────────────────────────────── */}
        <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-violet-950 via-violet-900 to-zinc-950 shadow-2xl shadow-violet-500/20">
          <div className="px-6 pt-8 pb-6">
            {/* Avatar + name + friend button */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="size-20 ring-2 ring-white/20 ring-offset-2 ring-offset-violet-900">
                    {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
                    <AvatarFallback className="text-2xl font-black bg-white/10 text-white">
                      {initialsFromName(profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <h1 className="text-xl font-black text-white leading-tight">
                    {profile.full_name ?? profile.username ?? "—"}
                  </h1>
                  {profile.username && (
                    <p className="text-xs text-white/50 mt-0.5">@{profile.username}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {sport && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-white/80">
                        {sport.icon} {sport.name}
                      </span>
                    )}
                    {profile.primary_skill_level && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-400/20 text-violet-200 capitalize">
                        <Zap className="size-2.5" /> {SKILL_LEVEL_MAP[profile.primary_skill_level] ?? profile.primary_skill_level}
                      </span>
                    )}
                    {profile.city && (
                      <span className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full text-white/40">
                        <MapPin className="size-2.5" /> {profile.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!isMe && (
                <div className="shrink-0 pt-1"><FriendButton /></div>
              )}
            </div>

            {/* Stats row */}
            <div className="flex gap-3">
              <div className="flex-1 bg-white/8 backdrop-blur-sm rounded-2xl border border-white/10 px-4 py-3 text-center">
                <p className="text-2xl font-black text-white">{profile.matches_played ?? 0}</p>
                <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mt-0.5">Partidos</p>
              </div>
              <div className="flex-1 bg-white/8 backdrop-blur-sm rounded-2xl border border-white/10 px-4 py-3 text-center">
                <p className="text-2xl font-black text-white">
                  {profile.rating_count > 0 ? (profile.rating_avg as number).toFixed(1) : "—"}
                </p>
                <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mt-0.5">
                  Rating ({profile.rating_count})
                </p>
              </div>
              {profile.tournament_goals != null && profile.tournament_goals > 0 && (
                <div className="flex-1 bg-white/8 backdrop-blur-sm rounded-2xl border border-white/10 px-4 py-3 text-center">
                  <p className="text-2xl font-black text-white">{profile.tournament_goals}</p>
                  <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wide mt-0.5">Goles</p>
                </div>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mt-4 text-sm text-white/60 leading-relaxed border-l-2 border-white/20 pl-3">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* ── Skills ────────────────────────────────────────────────────── */}
        {hasSkills && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
              <Star className="size-4 text-amber-500" />
              <h2 className="text-sm font-bold">Habilidades</h2>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {SKILL_LABELS.map(({ key, label, color }) => {
                const val = (profile[key] as number) ?? 0;
                if (val === 0) return null;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                      <span className="text-xs font-black text-foreground">{val}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color} transition-all duration-700`}
                        style={{ width: `${Math.min((val / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Teams ─────────────────────────────────────────────────────── */}
        {teams.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
              <Shield className="size-4 text-violet-500" />
              <h2 className="text-sm font-bold">Equipos</h2>
              <span className="ml-auto text-xs text-muted-foreground">{teams.length}</span>
            </div>
            <ul className="divide-y divide-border/40">
              {teams.map((team) => (
                <li key={team.id}>
                  <Link href={`/teams/${team.slug}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                      style={{ background: team.header_color ?? "#7c3aed" }}
                    >
                      {initialsFromName(team.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{team.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{team.city} · {team.sport_type}</p>
                    </div>
                    <Users className="size-4 text-muted-foreground/40 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Recent matches ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
            <Activity className="size-4 text-emerald-500" />
            <h2 className="text-sm font-bold">Últimas actividades</h2>
          </div>
          {recentMatches.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-muted-foreground">
              Sin partidos recientes.
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {recentMatches.map((m) => {
                const isPast = new Date(m.starts_at) < new Date();
                return (
                  <li key={m.id}>
                    <Link
                      href={`/matches/${m.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isPast ? "bg-zinc-300 dark:bg-zinc-600" : "bg-emerald-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{formatMatchDate(m.starts_at)} · {m.city}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        m.status === "completed" ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                          : m.status === "cancelled" ? "bg-red-100 text-red-500 dark:bg-red-950/30 dark:text-red-400"
                          : m.status === "open" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {m.status === "completed" ? "Finalizado" : m.status === "cancelled" ? "Cancelado" : m.status === "open" ? "Abierto" : m.status}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
