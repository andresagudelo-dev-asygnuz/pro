import { Link } from "wouter";
import { PLAYER_POSITIONS, type Profile } from "@/lib/types/db";

const SKILL_DEFS = [
  { key: "skill_pace"      as const, label: "PAC", name: "Velocidad"  },
  { key: "skill_shooting"  as const, label: "TIR", name: "Disparo"    },
  { key: "skill_passing"   as const, label: "PAS", name: "Pase"       },
  { key: "skill_dribbling" as const, label: "REG", name: "Regate"     },
  { key: "skill_defending" as const, label: "DEF", name: "Defensa"    },
  { key: "skill_physical"  as const, label: "FIS", name: "Físico"     },
];

interface ProfileSkillsCardProps {
  profile: Profile | null;
  ovr: number;
}

export function ProfileSkillsCard({ profile, ovr }: ProfileSkillsCardProps) {
  const positionInfo = profile?.position
    ? (PLAYER_POSITIONS.find((p) => p.value === profile.position) ?? null)
    : null;

  return (
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
        <Link href="/perfil/editar">
          <button className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors px-3 py-1.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20">
            Editar
          </button>
        </Link>
      </div>
      <div className="px-5 pb-5 grid grid-cols-2 gap-x-8 gap-y-3.5">
        {SKILL_DEFS.map(({ key, label, name }) => {
          const val = (profile?.[key] as number) ?? 50;
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
      {profile?.bio && (
        <div className="border-t border-border/40 px-5 py-3">
          <p className="text-xs text-muted-foreground leading-relaxed italic">"{profile.bio}"</p>
        </div>
      )}
    </div>
  );
}
