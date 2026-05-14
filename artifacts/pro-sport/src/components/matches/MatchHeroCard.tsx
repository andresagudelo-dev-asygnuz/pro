import { Link } from "wouter";
import { Clock, Globe, Lock, Timer, Zap, Crown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatMatchDate, initialsFromName } from "@/lib/format";
import type { Match, Profile, Sport } from "@/lib/types/db";

function getSportGradient(sportName: string | undefined) {
  const n = (sportName ?? "").toLowerCase();
  if (n.includes("fut") || n.includes("soccer"))
    return { gradient: "from-emerald-950 via-emerald-900 to-zinc-950", glow: "shadow-emerald-500/20", accent: "#10b981", chipBg: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30" };
  if (n.includes("pad"))
    return { gradient: "from-amber-950 via-amber-900 to-zinc-950", glow: "shadow-amber-500/20", accent: "#f59e0b", chipBg: "bg-amber-500/20 text-amber-200 border-amber-500/30" };
  if (n.includes("basket") || n.includes("básquet"))
    return { gradient: "from-orange-950 via-orange-900 to-zinc-950", glow: "shadow-orange-500/20", accent: "#f97316", chipBg: "bg-orange-500/20 text-orange-200 border-orange-500/30" };
  if (n.includes("tenis"))
    return { gradient: "from-lime-950 via-lime-900 to-zinc-950", glow: "shadow-lime-500/20", accent: "#84cc16", chipBg: "bg-lime-500/20 text-lime-200 border-lime-500/30" };
  if (n.includes("volei") || n.includes("vólei"))
    return { gradient: "from-blue-950 via-blue-900 to-zinc-950", glow: "shadow-blue-500/20", accent: "#3b82f6", chipBg: "bg-blue-500/20 text-blue-200 border-blue-500/30" };
  return { gradient: "from-violet-950 via-violet-900 to-zinc-950", glow: "shadow-violet-500/20", accent: "#7c3aed", chipBg: "bg-violet-500/20 text-violet-200 border-violet-500/30" };
}

export { getSportGradient };

interface Props {
  match: Match;
  sport: Sport | null;
  organizer: Profile | null;
  joinedCount: number;
  spotsLeft: number;
  occupancyPct: number;
  isOrganizer: boolean;
  isCancelled: boolean;
  isCompleted: boolean;
  showCancelConfirm: boolean;
  cancellingMatch: boolean;
  onEdit: () => void;
  onShowCancelConfirm: () => void;
  onHideCancelConfirm: () => void;
  onCancelMatch: () => void;
}

export function MatchHeroCard({
  match, sport, organizer, joinedCount, spotsLeft, occupancyPct,
  isOrganizer, isCancelled, isCompleted,
  showCancelConfirm, cancellingMatch,
  onEdit, onShowCancelConfirm, onHideCancelConfirm, onCancelMatch,
}: Props) {
  const theme = getSportGradient(sport?.name);

  return (
    <>
      <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-br ${theme.gradient} shadow-2xl ${theme.glow}`}>
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjYSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')]" />
        <div className="absolute top-4 right-4 flex flex-wrap items-center gap-1.5 z-10 justify-end">
          {isCancelled && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/30 text-red-200 border border-red-500/40 uppercase tracking-wide">Cancelado</span>}
          {isCompleted && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 uppercase tracking-wide">Finalizado</span>}
          {match.is_public
            ? <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${theme.chipBg} uppercase tracking-wide`}><Globe className="size-2.5" /> Abierto</span>
            : <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-amber-500/20 text-amber-200 border-amber-500/30 uppercase tracking-wide"><Lock className="size-2.5" /> Privado</span>
          }
          {isOrganizer && match.status === "open" && (
            <>
              <button onClick={onEdit} title="Editar partido" className="w-7 h-7 flex items-center justify-center rounded-full bg-white/15 border border-white/20 text-white/80 hover:bg-white/25 hover:text-white transition-all active:scale-90">
                <Pencil className="size-3.5" />
              </button>
              <button onClick={onShowCancelConfirm} title="Cancelar partido" className="w-7 h-7 flex items-center justify-center rounded-full bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/40 hover:text-red-100 transition-all active:scale-90">
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>

        <div className="px-5 pt-8 pb-6">
          <div className="text-6xl mb-3 drop-shadow-lg">{sport?.icon ?? "🏟️"}</div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-1">
            {sport?.name ?? "Partido"} · {match.city}{match.skill_level && ` · ${match.skill_level}`}
          </p>
          <h1 className="text-2xl font-black text-white leading-tight mb-3">{match.title}</h1>
          {match.description && (
            <p className="text-sm text-white/70 leading-relaxed mb-4 border-l-2 border-white/20 pl-3">{match.description}</p>
          )}
          <div className="flex flex-wrap gap-2 mb-5">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-white/90 text-xs font-medium border border-white/10">
              <Clock className="size-3.5 text-white/60" />{formatMatchDate(match.starts_at)}
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-white/90 text-xs font-medium border border-white/10">
              <Timer className="size-3.5 text-white/60" />{match.duration_minutes} min
            </div>
            {match.skill_level && (
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 text-white/90 text-xs font-medium border border-white/10 capitalize">
                <Zap className="size-3.5 text-white/60" />{match.skill_level}
              </div>
            )}
          </div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-white/60">
            <span className="font-medium">{joinedCount} de {match.max_players} jugadores</span>
            <span className={`font-bold ${occupancyPct >= 0.9 ? "text-red-300" : occupancyPct >= 0.6 ? "text-amber-300" : "text-emerald-300"}`}>
              {spotsLeft > 0 ? `${spotsLeft} cupo${spotsLeft !== 1 ? "s" : ""} libre${spotsLeft !== 1 ? "s" : ""}` : "¡Lleno!"}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(occupancyPct * 100, 100)}%`,
                background: occupancyPct >= 0.9 ? "linear-gradient(90deg,#ef4444,#f87171)" : occupancyPct >= 0.6 ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "linear-gradient(90deg,#10b981,#34d399)",
              }}
            />
          </div>
          {organizer && (
            <div className="mt-4 flex items-center gap-2">
              <Crown className="size-3.5 text-white/40" />
              <Link href={`/profile/${organizer.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar className="size-5 ring-1 ring-white/20">
                  {organizer.avatar_url && <AvatarImage src={organizer.avatar_url} />}
                  <AvatarFallback className="text-[9px] bg-white/20 text-white">{initialsFromName(organizer.full_name)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-white/60">
                  Organiza <span className="text-white/90 font-semibold">{organizer.full_name ?? organizer.username}</span>
                  {isOrganizer && " (vos)"}
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {isOrganizer && showCancelConfirm && (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
          <p className="text-sm font-bold text-red-800 dark:text-red-300 mb-1">¿Cancelar el partido?</p>
          <p className="text-xs text-red-700/80 dark:text-red-400/70 mb-3">Esta acción no se puede deshacer y los jugadores serán notificados.</p>
          <div className="flex gap-2">
            <Button size="sm" disabled={cancellingMatch} className="bg-red-600 hover:bg-red-700 text-white rounded-xl flex-1" onClick={onCancelMatch}>
              {cancellingMatch ? "Cancelando…" : "Sí, cancelar partido"}
            </Button>
            <Button size="sm" variant="outline" disabled={cancellingMatch} onClick={onHideCancelConfirm} className="rounded-xl">
              No, volver
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
