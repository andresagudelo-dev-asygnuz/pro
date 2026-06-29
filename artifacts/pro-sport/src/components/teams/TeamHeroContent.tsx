import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Globe, Lock, Users, LogOut } from "lucide-react";
import { type TeamWithMembers } from "@/lib/teams/api";
import { SPORT_TYPE_LABELS } from "@/lib/types/db";

const SPORT_EMOJIS: Record<string, string> = {
  futbol_5: "⚽", futbol_9: "⚽", futbol_11: "⚽", futbol_sala: "⚽",
  padel: "🎾", tenis: "🎾", basket: "🏀", voleibol: "🏐", outro: "🏟️",
};

function JerseyIcon({ color, size = 32 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M11 3L4 8l3 4 2-1v15h14V11l2 1 3-4-7-5c0 2-2 4-5 4s-5-2-5-4z"
        fill={color}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface TeamHeroContentProps {
  team: TeamWithMembers;
  resolvedHeader: string;
  resolvedJersey: string;
  isOwner: boolean;
  isMember: boolean;
  isFull: boolean;
  spotsLeft: number;
  uploadingLogo: boolean;
  actionPending: boolean;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onJoin: () => void;
  onLeave: () => void;
}

export function TeamHeroContent({
  team,
  resolvedHeader,
  resolvedJersey,
  isOwner,
  isMember,
  isFull,
  spotsLeft,
  uploadingLogo,
  actionPending,
  onLogoUpload,
  onJoin,
  onLeave,
}: TeamHeroContentProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sportEmoji = SPORT_EMOJIS[team.sport_type] ?? "🏟️";
  const sportLabel = (SPORT_TYPE_LABELS as Record<string, string>)[team.sport_type] ?? team.sport_type;

  return (
    <>
      {/* Team logo */}
      {isOwner ? (
        <button
          type="button"
          onClick={() => logoInputRef.current?.click()}
          disabled={uploadingLogo}
          className="group relative w-24 h-24 rounded-[24px] shadow-2xl border-2 border-white/15 mb-4 overflow-hidden outline-none"
        >
          {team.logo_url ? (
            <img src={team.logo_url} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl"
              style={{ background: `linear-gradient(135deg, ${resolvedHeader}99, ${resolvedHeader})` }}>
              {sportEmoji}
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-[22px]">
            {uploadingLogo ? <Loader2 className="size-7 text-white animate-spin" /> : <Camera className="size-7 text-white" />}
          </div>
        </button>
      ) : (
        <div className="w-24 h-24 rounded-[24px] shadow-2xl border-2 border-white/15 mb-4 overflow-hidden">
          {team.logo_url ? (
            <img src={team.logo_url} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl"
              style={{ background: `linear-gradient(135deg, ${resolvedHeader}99, ${resolvedHeader})` }}>
              {sportEmoji}
            </div>
          )}
        </div>
      )}
      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />

      <h1 className="text-2xl font-black text-white text-center leading-tight mb-1">{team.name}</h1>

      {/* Sport + visibility + jersey */}
      <div className="flex items-center gap-2 mb-3 flex-wrap justify-center">
        <span className="text-xs font-semibold bg-white/15 text-white/90 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">
          {sportLabel}
        </span>
        {team.is_public
          ? <span className="flex items-center gap-1 text-xs text-white/50"><Globe className="size-3" /> Público</span>
          : <span className="flex items-center gap-1 text-xs text-white/50"><Lock className="size-3" /> Privado</span>}
        <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-2 py-1 border border-white/15">
          <JerseyIcon color={resolvedJersey} size={16} />
          <div className="w-3 h-3 rounded-full border border-white/30" style={{ backgroundColor: resolvedJersey }} />
        </div>
      </div>

      {/* Stats bar */}
      <div className="w-full max-w-xs grid grid-cols-3 divide-x divide-white/10 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden mb-4">
        {[
          { value: team.team_members.length, label: "Jugadores", color: "text-white" },
          { value: team.max_members,          label: "Máx",       color: "text-white" },
          { value: spotsLeft,                 label: "Lugares",   color: isFull ? "text-red-400" : "text-emerald-400" },
        ].map(({ value, label, color }) => (
          <div key={label} className="flex flex-col items-center py-2.5 px-1 gap-0.5">
            <p className={`text-lg font-black ${color}`}>{value}</p>
            <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* City */}
      {team.city && (
        <div className="flex items-center gap-1.5 text-white/60 text-xs mb-4">
          <span>{team.city}</span>
        </div>
      )}

      {/* Description */}
      {team.description && (
        <p className="text-sm text-white/70 text-center leading-relaxed max-w-xs mb-4">{team.description}</p>
      )}

      {/* Action button */}
      {isMember ? (
        !isOwner && (
          <Button variant="outline" size="sm"
            className="rounded-xl gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            onClick={onLeave} disabled={actionPending}>
            <LogOut className="size-3.5" />
            {actionPending ? "Saliendo…" : "Salir del equipo"}
          </Button>
        )
      ) : (
        !isFull && (
          <Button size="sm"
            className="rounded-xl gap-2 text-white shadow-lg"
            style={{ backgroundColor: resolvedHeader, boxShadow: `0 8px 24px ${resolvedHeader}55` }}
            onClick={onJoin} disabled={actionPending}>
            <Users className="size-3.5" />
            {actionPending ? "Uniéndome…" : "Unirme al equipo"}
          </Button>
        )
      )}
    </>
  );
}
