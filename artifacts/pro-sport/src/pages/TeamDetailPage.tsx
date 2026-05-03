import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { getTeamById, joinTeam, leaveTeam, deleteTeam, type TeamWithMembers, type TeamMemberWithProfile } from "@/lib/teams/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { initialsFromName } from "@/lib/format";
import { SPORT_TYPE_LABELS } from "@/lib/types/db";
import { Users, MapPin, Crown, Shield, LogOut, Trash2, Lock, Globe } from "lucide-react";
import { toast } from "sonner";

const SPORT_EMOJIS: Record<string, string> = {
  futbol_5: "⚽", futbol_9: "⚽", futbol_11: "⚽", futbol_sala: "⚽",
  padel: "🎾", tenis: "🎾", basket: "🏀", voleibol: "🏐", otro: "🏟️",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Líder", captain: "Capitán", player: "Jugador",
};

/* ── Card styles per skill level (same palette as PlayerCard) ── */
const CARD_STYLES = {
  principiante: {
    bg: "from-amber-600 via-orange-700 to-amber-950",
    shimmer: "from-amber-300/30 via-orange-300/10 to-transparent",
    highlight: "from-amber-300/20 to-transparent",
    text: "text-amber-50", subtext: "text-amber-200/80",
    border: "border-amber-300/30", ring: "ring-amber-300/40",
    divider: "border-amber-300/20", barBg: "bg-amber-900/40", barFill: "bg-amber-200",
    badge: "bg-amber-400/20 text-amber-100 border-amber-400/30",
  },
  intermedio: {
    bg: "from-slate-300 via-slate-400 to-slate-600",
    shimmer: "from-white/35 via-white/10 to-transparent",
    highlight: "from-white/25 to-transparent",
    text: "text-zinc-900", subtext: "text-zinc-700",
    border: "border-white/50", ring: "ring-white/50",
    divider: "border-zinc-500/40", barBg: "bg-zinc-500/30", barFill: "bg-zinc-800",
    badge: "bg-white/20 text-zinc-800 border-white/40",
  },
  avanzado: {
    bg: "from-yellow-300 via-amber-400 to-yellow-700",
    shimmer: "from-yellow-100/35 via-yellow-100/10 to-transparent",
    highlight: "from-yellow-100/25 to-transparent",
    text: "text-amber-950", subtext: "text-amber-800",
    border: "border-yellow-100/50", ring: "ring-yellow-200/60",
    divider: "border-amber-700/30", barBg: "bg-amber-700/30", barFill: "bg-amber-950",
    badge: "bg-amber-900/15 text-amber-900 border-amber-700/30",
  },
  pro: {
    bg: "from-violet-400 via-violet-700 to-purple-950",
    shimmer: "from-violet-200/30 via-violet-300/10 to-transparent",
    highlight: "from-violet-200/20 to-transparent",
    text: "text-white", subtext: "text-violet-200/90",
    border: "border-violet-300/30", ring: "ring-violet-300/40",
    divider: "border-violet-300/20", barBg: "bg-violet-900/40", barFill: "bg-violet-100",
    badge: "bg-violet-300/20 text-violet-50 border-violet-300/30",
  },
} as const;

const POSITION_ABBR: Record<string, string> = {
  arquero: "POR", defensa: "DEF", mediocampista: "MED", delantero: "DEL",
};

function computeOvr(p: TeamMemberWithProfile["profile"]): number {
  if (!p) return 50;
  const vals = [
    (p as any).skill_pace      ?? 50,
    (p as any).skill_shooting  ?? 50,
    (p as any).skill_passing   ?? 50,
    (p as any).skill_dribbling ?? 50,
    (p as any).skill_defending ?? 50,
    (p as any).skill_physical  ?? 50,
  ];
  return Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
}

/* ── Mini member card ─────────────────────────────────────────── */
function MemberCard({ member }: { member: TeamMemberWithProfile }) {
  const p = member.profile;
  const level = ((p as any)?.primary_skill_level ?? "intermedio") as keyof typeof CARD_STYLES;
  const s = CARD_STYLES[level] ?? CARD_STYLES.intermedio;
  const ovr = computeOvr(p);
  const initials = initialsFromName((p as any)?.full_name ?? (p as any)?.username);
  const pos = POSITION_ABBR[(p as any)?.position ?? ""] ?? "JUG";

  const SKILL_DEFS = [
    ["PAC", (p as any)?.skill_pace      ?? 50],
    ["TIR", (p as any)?.skill_shooting  ?? 50],
    ["PAS", (p as any)?.skill_passing   ?? 50],
    ["REG", (p as any)?.skill_dribbling ?? 50],
    ["DEF", (p as any)?.skill_defending ?? 50],
    ["FIS", (p as any)?.skill_physical  ?? 50],
  ] as [string, number][];

  return (
    <div className={`relative bg-gradient-to-br ${s.bg} rounded-[22px] shadow-xl overflow-hidden select-none`}
      style={{ aspectRatio: "5/7" }}>
      {/* Shimmer */}
      <div className={`absolute inset-0 bg-gradient-to-br ${s.shimmer} pointer-events-none`} />
      <div className={`absolute top-0 left-0 right-0 h-2/5 bg-gradient-to-b ${s.highlight} pointer-events-none`} />
      <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

      {/* Role badge */}
      {member.role !== "player" && (
        <div className="absolute top-2.5 right-2.5 z-20">
          {member.role === "owner"
            ? <Crown className="size-4 text-amber-400 drop-shadow-md" />
            : <Shield className="size-4 text-violet-300 drop-shadow-md" />}
        </div>
      )}

      {/* Inner frame */}
      <div className={`absolute inset-[6px] rounded-[17px] border ${s.border} flex flex-col`}>
        {/* OVR + position */}
        <div className="flex items-start justify-between px-2.5 pt-2.5">
          <div>
            <p className={`text-[38px] font-black leading-none tracking-tight ${s.text}`}>{ovr}</p>
            <p className={`text-[8px] font-black uppercase tracking-[0.25em] -mt-0.5 ${s.subtext}`}>{pos}</p>
          </div>
          <span className="text-[16px] leading-none drop-shadow-md">⚽</span>
        </div>

        {/* Avatar */}
        <div className="flex justify-center flex-1 items-center py-1">
          <Avatar className={`size-16 ring-[3px] ${s.ring} shadow-xl`}>
            {(p as any)?.avatar_url && <AvatarImage src={(p as any).avatar_url} alt={(p as any).full_name ?? ""} className="object-cover" />}
            <AvatarFallback className="bg-black/20 text-lg font-black">
              <span className={s.text}>{initials}</span>
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name */}
        <div className="text-center px-2 -mt-0.5">
          <p className={`text-[11px] font-black uppercase tracking-wide leading-tight truncate ${s.text} drop-shadow-sm`}>
            {(p as any)?.full_name ?? (p as any)?.username ?? "Jugador"}
          </p>
          <p className={`text-[8px] font-semibold mt-0.5 ${s.subtext}`}>{ROLE_LABELS[member.role]}</p>
        </div>

        {/* Divider */}
        <div className={`mx-3 mt-1.5 border-t ${s.divider}`} />

        {/* Skills */}
        <div className="px-2.5 py-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
          {SKILL_DEFS.map(([label, val]) => (
            <div key={label} className="flex items-center gap-0.5">
              <span className={`text-[10px] font-black w-5 leading-none tabular-nums ${s.text}`}>{val}</span>
              <span className={`text-[7px] font-black uppercase tracking-widest w-4 ${s.subtext}`}>{label}</span>
              <div className={`flex-1 h-[2px] rounded-full ${s.barBg}`}>
                <div className={`h-full rounded-full ${s.barFill}`} style={{ width: `${val}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);

  const myMembership = team?.team_members.find((m) => m.user_id === user?.id);
  const isOwner = myMembership?.role === "owner";
  const isMember = !!myMembership;

  useEffect(() => {
    if (!id) return;
    getTeamById(id)
      .then((data) => setTeam(data))
      .catch((err: any) => {
        console.error("[TeamDetailPage] getTeamById error:", err);
        toast.error("Error al cargar equipo: " + (err?.message ?? String(err)));
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleJoin() {
    if (!user || !id) return;
    setActionPending(true);
    try {
      await joinTeam(id, user.id);
      const updated = await getTeamById(id);
      setTeam(updated);
      toast.success("¡Te uniste al equipo!");
    } catch { toast.error("No se pudo unir al equipo."); }
    setActionPending(false);
  }

  async function handleLeave() {
    if (!user || !id || isOwner) return;
    setActionPending(true);
    try {
      await leaveTeam(id, user.id);
      toast.success("Saliste del equipo.");
      setLocation("/equipos");
    } catch { toast.error("No se pudo salir del equipo."); }
    setActionPending(false);
  }

  async function handleDelete() {
    if (!id || !isOwner) return;
    if (!confirm("¿Seguro que querés eliminar este equipo? Esta acción es irreversible.")) return;
    setActionPending(true);
    try {
      await deleteTeam(id);
      toast.success("Equipo eliminado.");
      setLocation("/equipos");
    } catch { toast.error("No se pudo eliminar el equipo."); }
    setActionPending(false);
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 pb-24 flex flex-col">
        <PageHeader title="Equipo" backHref="/equipos" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <BottomNav />
      </div>
    );
  }

  /* ── Not found ── */
  if (!team) {
    return (
      <div className="min-h-screen bg-zinc-950 pb-24 flex flex-col">
        <PageHeader title="Equipo" backHref="/equipos" />
        <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center text-3xl mb-2">🏟️</div>
          <p className="font-semibold text-white">Equipo no encontrado</p>
          <p className="text-sm text-zinc-400">Puede que haya sido eliminado o no tenés acceso.</p>
          <Button variant="outline" size="sm" className="mt-2 rounded-xl" onClick={() => setLocation("/equipos")}>
            Volver a equipos
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const sportEmoji = SPORT_EMOJIS[team.sport_type] ?? "🏟️";
  const sportLabel = (SPORT_TYPE_LABELS as Record<string, string>)[team.sport_type] ?? team.sport_type;
  const spotsLeft = team.max_members - team.team_members.length;
  const isFull = spotsLeft <= 0;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pb-24">

      {/* ══ HERO ════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-b-[36px]"
        style={{ background: "linear-gradient(160deg, #2e1065 0%, #1e1b4b 35%, #312e81 65%, #1a1a2e 100%)" }}
      >
        {/* Back + delete actions */}
        <PageHeader
          title=""
          backHref="/equipos"
          actions={
            isOwner ? (
              <button
                onClick={handleDelete}
                disabled={actionPending}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-500/20 transition-colors text-white/60 hover:text-red-400"
                title="Eliminar equipo"
              >
                <Trash2 className="size-4" />
              </button>
            ) : undefined
          }
        />

        {/* Ambient glow */}
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          <div className="w-72 h-72 rounded-full blur-[100px] opacity-25 bg-violet-500" />
        </div>

        {/* Team logo */}
        <div className="relative z-10 flex flex-col items-center pt-2 pb-6 px-5">
          <div className="w-24 h-24 rounded-[24px] bg-gradient-to-br from-violet-500 to-violet-800 flex items-center justify-center text-5xl shadow-2xl border-2 border-white/15 mb-4">
            {sportEmoji}
          </div>

          <h1 className="text-2xl font-black text-white text-center leading-tight mb-1">{team.name}</h1>

          {/* Sport + visibility badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold bg-white/15 text-white/90 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">
              {sportLabel}
            </span>
            {team.is_public
              ? <span className="flex items-center gap-1 text-xs text-white/50"><Globe className="size-3" /> Público</span>
              : <span className="flex items-center gap-1 text-xs text-white/50"><Lock className="size-3" /> Privado</span>}
          </div>

          {/* Stats bar */}
          <div className="w-full max-w-xs grid grid-cols-3 divide-x divide-white/10 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden mb-4">
            <div className="flex flex-col items-center py-2.5 px-1 gap-0.5">
              <p className="text-lg font-black text-white">{team.team_members.length}</p>
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Jugadores</p>
            </div>
            <div className="flex flex-col items-center py-2.5 px-1 gap-0.5">
              <p className="text-lg font-black text-white">{team.max_members}</p>
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Máx</p>
            </div>
            <div className="flex flex-col items-center py-2.5 px-1 gap-0.5">
              <p className={`text-lg font-black ${isFull ? "text-red-400" : "text-emerald-400"}`}>{spotsLeft}</p>
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Lugares</p>
            </div>
          </div>

          {/* City */}
          <div className="flex items-center gap-1.5 text-white/60 text-xs mb-4">
            <MapPin className="size-3.5" />
            <span>{team.city}</span>
          </div>

          {/* Description */}
          {team.description && (
            <p className="text-sm text-white/70 text-center leading-relaxed max-w-xs mb-4">
              {team.description}
            </p>
          )}

          {/* Action button */}
          {user && (
            isMember ? (
              !isOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                  onClick={handleLeave}
                  disabled={actionPending}
                >
                  <LogOut className="size-3.5" />
                  {actionPending ? "Saliendo…" : "Salir del equipo"}
                </Button>
              )
            ) : (
              !isFull && (
                <Button
                  size="sm"
                  className="rounded-xl gap-2 bg-violet-500 hover:bg-violet-400 text-white shadow-lg shadow-violet-900/50"
                  onClick={handleJoin}
                  disabled={actionPending}
                >
                  <Users className="size-3.5" />
                  {actionPending ? "Uniéndome…" : "Unirme al equipo"}
                </Button>
              )
            )
          )}
        </div>
      </div>

      {/* ══ MEMBERS ═════════════════════════════════════════════════ */}
      <main className="px-4 py-5 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Integrantes · {team.team_members.length}
          </p>
        </div>

        {team.team_members.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm p-8 text-center">
            <Users className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Sin integrantes aún</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {team.team_members.map((member) => (
              <MemberCard key={member.user_id} member={member} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
