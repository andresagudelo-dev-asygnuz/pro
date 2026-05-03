import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { initialsFromName } from "@/lib/format";
import type { Profile } from "@/lib/types/db";

const CARD_STYLES: Record<string, { bg: string; text: string; subtext: string; border: string; shimmer: string }> = {
  principiante: {
    bg: "from-amber-700 via-amber-800 to-amber-950",
    text: "text-amber-100",
    subtext: "text-amber-300/80",
    border: "border-amber-500/40",
    shimmer: "from-amber-400/20 to-transparent",
  },
  intermedio: {
    bg: "from-slate-400 via-slate-500 to-slate-700",
    text: "text-slate-50",
    subtext: "text-slate-200/80",
    border: "border-slate-300/40",
    shimmer: "from-white/20 to-transparent",
  },
  avanzado: {
    bg: "from-yellow-400 via-amber-500 to-amber-700",
    text: "text-amber-950",
    subtext: "text-amber-900/70",
    border: "border-yellow-300/60",
    shimmer: "from-yellow-200/30 to-transparent",
  },
  pro: {
    bg: "from-violet-500 via-violet-700 to-violet-950",
    text: "text-violet-50",
    subtext: "text-violet-200/80",
    border: "border-violet-400/40",
    shimmer: "from-violet-300/20 to-transparent",
  },
};

const POSITION_ABBR: Record<string, string> = {
  arquero: "POR",
  defensa: "DEF",
  mediocampista: "MED",
  delantero: "DEL",
};

const SKILL_COLORS: Record<string, { high: string; mid: string; low: string }> = {
  principiante: { high: "bg-amber-300", mid: "bg-amber-400/60", low: "bg-amber-800/60" },
  intermedio: { high: "bg-slate-100", mid: "bg-slate-300/60", low: "bg-slate-600/60" },
  avanzado: { high: "bg-amber-900", mid: "bg-amber-800/70", low: "bg-amber-700/50" },
  pro: { high: "bg-violet-100", mid: "bg-violet-300/60", low: "bg-violet-800/60" },
};

function computeOvr(profile: Profile | null): number {
  const s = profile;
  if (!s) return 50;
  const vals = [
    s.skill_pace ?? 50,
    s.skill_shooting ?? 50,
    s.skill_passing ?? 50,
    s.skill_dribbling ?? 50,
    s.skill_defending ?? 50,
    s.skill_physical ?? 50,
  ];
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function SkillRow({
  label,
  value,
  style,
}: {
  label: string;
  value: number;
  style: ReturnType<typeof getCardStyle>;
}) {
  const barColor =
    value >= 75
      ? style.skillColors.high
      : value >= 55
      ? style.skillColors.mid
      : style.skillColors.low;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[11px] font-black w-8 ${style.text}`}>{value}</span>
      <span className={`text-[10px] font-bold uppercase tracking-widest w-7 ${style.subtext}`}>{label}</span>
      <div className="flex-1 h-1 rounded-full bg-black/20">
        <div className={`h-1 rounded-full ${barColor}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function getCardStyle(level: string) {
  const s = CARD_STYLES[level] ?? CARD_STYLES.principiante;
  return { ...s, skillColors: SKILL_COLORS[level] ?? SKILL_COLORS.principiante };
}

interface PlayerCardProps {
  profile: Profile | null;
  onPhotoClick?: () => void;
  uploading?: boolean;
  editable?: boolean;
}

export function PlayerCard({ profile, onPhotoClick, uploading = false, editable = false }: PlayerCardProps) {
  const level = profile?.primary_skill_level ?? "principiante";
  const style = getCardStyle(level);
  const ovr = computeOvr(profile);
  const initials = initialsFromName(profile?.full_name ?? profile?.username);
  const position = POSITION_ABBR[profile?.position ?? "mediocampista"] ?? "MED";

  return (
    <div
      className={`relative w-full max-w-[260px] mx-auto bg-gradient-to-br ${style.bg} rounded-3xl shadow-2xl overflow-hidden`}
      style={{ aspectRatio: "3/4" }}
    >
      {/* Shimmer overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${style.shimmer} pointer-events-none`} />

      {/* Inner frame */}
      <div className={`absolute inset-[6px] rounded-2xl border ${style.border} flex flex-col`}>

        {/* Top row: OVR + Position | Sport icon */}
        <div className="flex items-start justify-between px-3 pt-2.5">
          <div>
            <p className={`text-5xl font-black leading-none ${style.text}`}>{ovr}</p>
            <p className={`text-[11px] font-black uppercase tracking-[0.2em] mt-0.5 ${style.subtext}`}>{position}</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 pt-1">
            <span className="text-xl">⚽</span>
            <span className={`text-[9px] font-bold uppercase ${style.subtext}`}>PRO.</span>
          </div>
        </div>

        {/* Photo */}
        <div className="flex justify-center mt-1 flex-1 items-center">
          {editable ? (
            <button
              type="button"
              onClick={onPhotoClick}
              disabled={uploading}
              className="relative group"
              title="Cambiar foto"
            >
              <Avatar className={`size-28 ring-2 ${style.border} shadow-xl`}>
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt="Avatar" className="object-cover" />
                )}
                <AvatarFallback className="bg-white/20 text-white text-3xl font-black">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {uploading ? (
                  <Loader2 className="size-7 text-white animate-spin" />
                ) : (
                  <Camera className="size-7 text-white" />
                )}
              </div>
            </button>
          ) : (
            <Avatar className={`size-28 ring-2 ${style.border} shadow-xl`}>
              {profile?.avatar_url && (
                <AvatarImage src={profile.avatar_url} alt="Avatar" className="object-cover" />
              )}
              <AvatarFallback className="bg-white/20 text-white text-3xl font-black">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Name + City */}
        <div className="text-center px-2 mt-1">
          <p className={`text-base font-black uppercase tracking-wider leading-tight truncate ${style.text}`}>
            {profile?.full_name ?? "Jugador"}
          </p>
          {profile?.city && (
            <p className={`text-[10px] font-semibold mt-0.5 ${style.subtext}`}>{profile.city}</p>
          )}
        </div>

        {/* Divider */}
        <div className={`mx-3 mt-2 border-t ${style.border}`} />

        {/* Skills */}
        <div className="px-3 py-2 space-y-[3px]">
          <div className="grid grid-cols-2 gap-x-2">
            <SkillRow label="PAC" value={profile?.skill_pace ?? 50} style={style} />
            <SkillRow label="TIR" value={profile?.skill_shooting ?? 50} style={style} />
            <SkillRow label="PAS" value={profile?.skill_passing ?? 50} style={style} />
            <SkillRow label="REG" value={profile?.skill_dribbling ?? 50} style={style} />
            <SkillRow label="DEF" value={profile?.skill_defending ?? 50} style={style} />
            <SkillRow label="FIS" value={profile?.skill_physical ?? 50} style={style} />
          </div>
        </div>

      </div>
    </div>
  );
}
