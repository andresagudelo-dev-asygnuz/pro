import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { initialsFromName } from "@/lib/format";
import type { Profile } from "@/lib/types/db";

/* ─── Level styles ──────────────────────────────────────────────────────── */
const CARD_STYLES = {
  principiante: {
    bg:         "from-amber-600 via-orange-700 to-amber-950",
    shimmer:    "from-amber-300/30 via-orange-300/10 to-transparent",
    highlight:  "from-amber-300/20 to-transparent",
    text:       "text-amber-50",
    subtext:    "text-amber-200/80",
    border:     "border-amber-300/30",
    ring:       "ring-amber-300/40",
    divider:    "border-amber-300/20",
    barBg:      "bg-amber-900/40",
    barFill:    "bg-amber-200",
    badge:      "bg-amber-400/20 text-amber-100 border-amber-400/30",
  },
  intermedio: {
    bg:         "from-slate-300 via-slate-400 to-slate-600",
    shimmer:    "from-white/35 via-white/10 to-transparent",
    highlight:  "from-white/25 to-transparent",
    text:       "text-zinc-900",
    subtext:    "text-zinc-700",
    border:     "border-white/50",
    ring:       "ring-white/50",
    divider:    "border-zinc-500/40",
    barBg:      "bg-zinc-500/30",
    barFill:    "bg-zinc-800",
    badge:      "bg-white/20 text-zinc-800 border-white/40",
  },
  avanzado: {
    bg:         "from-yellow-300 via-amber-400 to-yellow-700",
    shimmer:    "from-yellow-100/35 via-yellow-100/10 to-transparent",
    highlight:  "from-yellow-100/25 to-transparent",
    text:       "text-amber-950",
    subtext:    "text-amber-800",
    border:     "border-yellow-100/50",
    ring:       "ring-yellow-200/60",
    divider:    "border-amber-700/30",
    barBg:      "bg-amber-700/30",
    barFill:    "bg-amber-950",
    badge:      "bg-amber-900/15 text-amber-900 border-amber-700/30",
  },
  pro: {
    bg:         "from-violet-400 via-violet-700 to-purple-950",
    shimmer:    "from-violet-200/30 via-violet-300/10 to-transparent",
    highlight:  "from-violet-200/20 to-transparent",
    text:       "text-white",
    subtext:    "text-violet-200/90",
    border:     "border-violet-300/30",
    ring:       "ring-violet-300/40",
    divider:    "border-violet-300/20",
    barBg:      "bg-violet-900/40",
    barFill:    "bg-violet-100",
    badge:      "bg-violet-300/20 text-violet-50 border-violet-300/30",
  },
} as const;

const POSITION_ABBR: Record<string, string> = {
  arquero:       "POR",
  defensa:       "DEF",
  mediocampista: "MED",
  delantero:     "DEL",
};

function computeOvr(p: Profile | null): number {
  if (!p) return 50;
  const vals = [
    p.skill_pace      ?? 50,
    p.skill_shooting  ?? 50,
    p.skill_passing   ?? 50,
    p.skill_dribbling ?? 50,
    p.skill_defending ?? 50,
    p.skill_physical  ?? 50,
  ];
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function SkillRow({
  label, value, barBg, barFill, text, subtext,
}: {
  label: string; value: number;
  barBg: string; barFill: string; text: string; subtext: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className={`text-[13px] font-black w-7 leading-none tabular-nums ${text}`}>{value}</span>
      <span className={`text-[9px] font-black uppercase tracking-widest w-6 ${subtext}`}>{label}</span>
      <div className={`flex-1 h-[3px] rounded-full ${barBg}`}>
        <div className={`h-full rounded-full ${barFill}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/* ─── Props ─────────────────────────────────────────────────────────────── */
interface PlayerCardProps {
  profile:     Profile | null;
  onPhotoClick?: () => void;
  uploading?:  boolean;
  editable?:   boolean;
}

export function PlayerCard({ profile, onPhotoClick, uploading = false, editable = false }: PlayerCardProps) {
  const level   = (profile?.primary_skill_level ?? "principiante") as keyof typeof CARD_STYLES;
  const s       = CARD_STYLES[level] ?? CARD_STYLES.principiante;
  const ovr     = computeOvr(profile);
  const initials = initialsFromName(profile?.full_name ?? profile?.username);
  const position = POSITION_ABBR[profile?.position ?? "mediocampista"] ?? "MED";

  return (
    <div
      className={`relative w-full max-w-[272px] mx-auto bg-gradient-to-br ${s.bg} rounded-[28px] shadow-2xl overflow-hidden select-none`}
      style={{ aspectRatio: "5/7" }}
    >
      {/* Shimmer — top-left diagonal */}
      <div className={`absolute inset-0 bg-gradient-to-br ${s.shimmer} pointer-events-none`} />
      {/* Top highlight */}
      <div className={`absolute top-0 left-0 right-0 h-2/5 bg-gradient-to-b ${s.highlight} pointer-events-none`} />
      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

      {/* Inner frame */}
      <div className={`absolute inset-[7px] rounded-[22px] border ${s.border} flex flex-col`}>

        {/* ── Top row ── */}
        <div className="flex items-start justify-between px-3.5 pt-3">
          <div>
            <p className={`text-[56px] font-black leading-none tracking-tight ${s.text}`}>{ovr}</p>
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] -mt-0.5 ${s.subtext}`}>{position}</p>
          </div>
          <div className="flex flex-col items-center pt-1 gap-0.5">
            <span className="text-[22px] leading-none drop-shadow-md">⚽</span>
            <span className={`text-[8px] font-black uppercase tracking-widest ${s.subtext}`}>PRO.</span>
          </div>
        </div>

        {/* ── Avatar ── */}
        <div className="flex justify-center mt-1 flex-1 items-center">
          {editable ? (
            <button
              type="button"
              onClick={onPhotoClick}
              disabled={uploading}
              className="relative group outline-none"
              aria-label="Cambiar foto"
            >
              <Avatar className={`size-[120px] ring-[3px] ${s.ring} shadow-xl`}>
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt="Avatar" className="object-cover" />
                )}
                <AvatarFallback className="bg-black/20 text-3xl font-black" style={{ color: "inherit" }}>
                  <span className={s.text}>{initials}</span>
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {uploading
                  ? <Loader2 className="size-8 text-white animate-spin" />
                  : <Camera className="size-8 text-white drop-shadow-md" />}
              </div>
            </button>
          ) : (
            <Avatar className={`size-[120px] ring-[3px] ${s.ring} shadow-xl`}>
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt="Avatar" className="object-cover" />
              )}
              <AvatarFallback className="bg-black/20 text-3xl font-black">
                <span className={s.text}>{initials}</span>
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* ── Name & City ── */}
        <div className="text-center px-3 mt-1">
          <p className={`text-[16px] font-black uppercase tracking-wider leading-tight truncate ${s.text} drop-shadow-sm`}>
            {profile?.full_name ?? "Jugador"}
          </p>
          {profile?.city && (
            <p className={`text-[10px] font-semibold mt-0.5 truncate ${s.subtext}`}>{profile.city}</p>
          )}
        </div>

        {/* ── Divider ── */}
        <div className={`mx-4 mt-2.5 border-t ${s.divider}`} />

        {/* ── Skills grid ── */}
        <div className="px-3.5 py-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {[
            ["PAC", profile?.skill_pace      ?? 50],
            ["TIR", profile?.skill_shooting  ?? 50],
            ["PAS", profile?.skill_passing   ?? 50],
            ["REG", profile?.skill_dribbling ?? 50],
            ["DEF", profile?.skill_defending ?? 50],
            ["FIS", profile?.skill_physical  ?? 50],
          ].map(([label, val]) => (
            <SkillRow
              key={label as string}
              label={label as string}
              value={val as number}
              barBg={s.barBg}
              barFill={s.barFill}
              text={s.text}
              subtext={s.subtext}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
