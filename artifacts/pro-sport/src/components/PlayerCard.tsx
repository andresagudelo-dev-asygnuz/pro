import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, User } from "lucide-react";
import { initialsFromName } from "@/lib/format";
import type { Profile } from "@/lib/types/db";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

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
    bg:         "from-[#0df59d] via-[#16a085] to-[#8e44ad]",
    shimmer:    "from-[#a29bfe]/40 via-white/20 to-transparent",
    highlight:  "from-white/30 to-transparent",
    text:       "text-white",
    subtext:    "text-emerald-50",
    border:     "border-[#0df59d]/50",
    ring:       "ring-[#0df59d]/60",
    divider:    "border-white/20",
    barBg:      "bg-black/30",
    barFill:    "bg-white",
    badge:      "bg-white/20 text-white border-white/30",
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
    <div className={`flex items-center justify-between ${text}`}>
      <div className="flex items-baseline gap-1">
        <span className="font-black text-[14px] leading-none drop-shadow-sm">{value}</span>
        <span className={`font-bold text-[10px] leading-none ${subtext}`}>{label}</span>
      </div>
      <div className={`flex-1 h-[4px] rounded-full ml-2 ${barBg}`}>
        <div className={`h-full rounded-full ${barFill}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

interface CardStyleConfig {
  src: string;
  text: string;
  subtext: string;
  barBg: string;
  barFill: string;
  avatarRing: string;
  layout: {
    topPadding: string;
    avatarMargin: string;
    avatarSize: string;
    bottomPadding: string;
    ovrSize: string;
    posSize: string;
  };
  bgFilter?: string;
}

function getCardConfig(ovr: number): CardStyleConfig {
  const commonLayout = {
    topPadding: "px-[16%] pt-[22%]",
    avatarMargin: "-mt-[6%]",
    avatarSize: "w-[45%]",
    bottomPadding: "pb-[16%]",
    ovrSize: "text-[56px]",
    posSize: "text-[12px]",
  };

  if (ovr < 50) {
    return {
      src: "/images/image-3.png",
      bgFilter: "brightness-[0.7] contrast-125 saturate-[1.2] hue-rotate-[-15deg] sepia-[0.3]",
      text: "text-orange-50",
      subtext: "text-orange-100/80",
      barBg: "bg-orange-950/40",
      barFill: "bg-orange-200",
      avatarRing: "ring-orange-300/40",
      layout: commonLayout
    };
  } else if (ovr < 85) {
    return {
      src: "/images/image-3.png",
      bgFilter: "grayscale brightness-[1.15] contrast-110",
      text: "text-zinc-900",
      subtext: "text-zinc-900/80",
      barBg: "bg-zinc-900/20",
      barFill: "bg-zinc-900",
      avatarRing: "ring-zinc-400/50",
      layout: commonLayout
    };
  } else {
    // 85+ Gold Card
    return {
      src: "/images/image-3.png",
      bgFilter: "",
      text: "text-[#3f2a05]",
      subtext: "text-[#3f2a05]/80",
      barBg: "bg-[#3f2a05]/20",
      barFill: "bg-[#3f2a05]",
      avatarRing: "ring-[#3f2a05]/30",
      layout: commonLayout
    };
  }
}

interface PlayerCardProps {
  profile:     Profile | null;
  onPhotoClick?: () => void;
  uploading?:  boolean;
  editable?:   boolean;
  showSkills?: boolean;
}

export function PlayerCard({ profile, onPhotoClick, uploading = false, editable = false, showSkills = true }: PlayerCardProps) {
  const ovr     = computeOvr(profile);
  const initials = initialsFromName(profile?.full_name ?? profile?.username);
  const position = POSITION_ABBR[profile?.position ?? "mediocampista"] ?? "MED";
  const cfg = getCardConfig(ovr);

  /* ─── 3D Interaction Hooks ────────────────────────────────────────────── */
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for 3D tilt
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), { stiffness: 300, damping: 30 });

  // Glare effect movement
  const glareX = useSpring(useTransform(x, [-0.5, 0.5], [100, -100]), { stiffness: 300, damping: 30 });
  const glareY = useSpring(useTransform(y, [-0.5, 0.5], [100, -100]), { stiffness: 300, damping: 30 });
  const glareOpacity = useSpring(useTransform(y, [-0.5, 0.5], [0, 0.6]), { stiffness: 300, damping: 30 });

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = (mouseX / width) - 0.5;
    const yPct = (mouseY / height) - 0.5;
    x.set(xPct);
    y.set(yPct);
  }

  function handlePointerLeave() {
    x.set(0);
    y.set(0);
  }


  return (
    <>
      <div 
        className="relative w-full max-w-[340px] mx-auto select-none"
      style={{ perspective: "1000px" }}
    >
      <motion.div
        ref={ref}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          aspectRatio: "5/7",
        }}
        className="relative w-full cursor-pointer transition-transform duration-75"
      >
        {/* ── BACKGROUND IMAGE ── */}
        <img 
          src={cfg.src} 
          alt="Card Background" 
          className={`absolute inset-0 w-full h-full object-fill pointer-events-none drop-shadow-2xl z-0 ${cfg.bgFilter || ""}`} 
        />

        {/* ── GLARE REFLECTION ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            WebkitMaskImage: `url(${cfg.src})`,
            WebkitMaskSize: "100% 100%",
            maskImage: `url(${cfg.src})`,
            maskSize: "100% 100%",
            transform: "translateZ(1px)",
            zIndex: 1,
          }}
        >
          <motion.div
            className="absolute w-[200%] h-[200%] -left-[50%] -top-[50%]"
            style={{
              opacity: glareOpacity,
              x: glareX,
              y: glareY,
              background: "radial-gradient(circle at center, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 50%)",
              mixBlendMode: "overlay"
            }}
          />
        </div>

        {/* 3D Content Layers */}
        <div 
          className="absolute inset-0 flex flex-col z-10"
          style={{ transform: "translateZ(40px)" }} // Pushes content out in 3D
        >
          {/* ── Top row (Rating & Position) ── */}
          <div className={`flex items-start justify-between ${cfg.layout.topPadding} relative z-10 pointer-events-none`}>
            <div>
              <p className={`${cfg.layout.ovrSize} font-black leading-[0.8] tracking-tighter ${cfg.text} drop-shadow-sm`}>{ovr}</p>
              <p className={`${cfg.layout.posSize} font-black uppercase tracking-[0.4em] mt-1 ${cfg.subtext}`}>{position}</p>
            </div>
            <div className="flex flex-col items-center pt-1 gap-1">
              <span className="text-[24px] leading-none drop-shadow-sm">⚽</span>
              <span className={`text-[8px] font-black uppercase tracking-widest ${cfg.subtext}`}>PRO.</span>
            </div>
          </div>

          {/* ── Avatar (3D Pop) ── */}
          <div 
            className={`flex justify-center ${cfg.layout.avatarMargin} relative z-0 pointer-events-auto`}
            style={{ transform: "translateZ(50px)" }} // Pops the avatar even further!
          >
            {editable ? (
              <button
                type="button"
                onClick={onPhotoClick}
                disabled={uploading}
                className="relative group outline-none"
                aria-label="Cambiar foto"
              >
                <div className={`${cfg.layout.avatarSize} h-auto aspect-square mx-auto relative overflow-hidden rounded-2xl`}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover object-bottom" />
                  ) : (
                    <div className="w-full h-full bg-black/10 flex items-center justify-center">
                       <User className={`w-1/2 h-1/2 ${cfg.text} opacity-20`} />
                    </div>
                  )}
                </div>
                <div className={`absolute inset-0 rounded-2xl bg-black/55 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity ${cfg.layout.avatarSize} mx-auto`}>
                  {uploading
                    ? <Loader2 className="size-10 text-white animate-spin" />
                    : <Camera className="size-10 text-white drop-shadow-md" />}
                </div>
              </button>
            ) : (
              <div className={`${cfg.layout.avatarSize} h-auto aspect-square mx-auto relative overflow-hidden rounded-2xl`}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover object-bottom" />
                ) : (
                  <div className="w-full h-full bg-black/10 flex items-center justify-center">
                     <User className={`w-1/2 h-1/2 ${cfg.text} opacity-20`} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Name & City ── */}
          <div className="text-center px-[12%] mt-[6%] relative z-10 w-full overflow-hidden">
            <p className={`text-[20px] font-black uppercase tracking-widest leading-tight truncate ${cfg.text} drop-shadow-sm`}>
              {profile?.full_name ?? "Jugador"}
            </p>
          </div>

          {/* ── Skills grid ── */}
          {showSkills && (
            <div className={`px-[15%] py-[1%] mt-[2%] grid grid-cols-2 gap-x-[5%] gap-y-[2%] ${cfg.layout.bottomPadding} relative z-10`}>
              {[
                ["PAC", profile?.skill_pace      ?? 50],
                ["TIR", profile?.skill_shooting  ?? 50],
                ["PAS", profile?.skill_passing   ?? 50],
                ["REG", profile?.skill_dribbling ?? 50],
                ["DEF", profile?.skill_defending ?? 50],
                ["FIS", profile?.skill_physical  ?? 50],
              ].map(([label, val]) => (
                <SkillRow
                  key={label}
                  label={label}
                  value={val}
                  barBg={cfg.barBg}
                  barFill={cfg.barFill}
                  text={cfg.text}
                  subtext={cfg.subtext}
                />
              ))}
            </div>
          )}

        </div>
      </motion.div>
    </div>
    </>
  );
}
