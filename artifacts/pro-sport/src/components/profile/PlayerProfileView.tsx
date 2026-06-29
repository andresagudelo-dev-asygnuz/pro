import { useRef } from "react";
import { Link } from "wouter";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/db";
import { PLAYER_POSITIONS } from "@/lib/types/db";
import type { UserRoles } from "@/context/AuthContext";
import type { TeamWithCount } from "@/lib/teams/api";
import { PageHeader } from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { PlayerCard } from "@/components/PlayerCard";
import { Button } from "@/components/ui/button";
import { canViewBlock, type ViewerContext } from "@/lib/profiles/visibility";
import { NotificationPermissionCard } from "@/components/NotificationPermissionCard";
import {
  LogOut, Pencil, Shield, Trophy, Zap, Building2, Bell, Users,
  Calendar, Bookmark, ChevronRight, Star, MapPin, Target, Flame,
  Ruler, Weight, Activity,
} from "lucide-react";

/* ─── Level config ───────────────────────────────────────────────────────── */
const LEVEL_CONFIG: Record<string, { label: string; glow: string; badge: string }> = {
  principiante: { label: "Principiante", glow: "bg-amber-500",  badge: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  intermedio:   { label: "Intermedio",   glow: "bg-slate-300",  badge: "bg-white/10 text-slate-200 border-white/20" },
  avanzado:     { label: "Avanzado",     glow: "bg-yellow-400", badge: "bg-yellow-400/15 text-yellow-300 border-yellow-400/30" },
  pro:          { label: "Pro",          glow: "bg-violet-500", badge: "bg-violet-500/20 text-violet-200 border-violet-400/30" },
};

const SKILL_DEFS = [
  { key: "skill_pace"      as const, label: "PAC", name: "Velocidad"  },
  { key: "skill_shooting"  as const, label: "TIR", name: "Disparo"    },
  { key: "skill_passing"   as const, label: "PAS", name: "Pase"       },
  { key: "skill_dribbling" as const, label: "REG", name: "Regate"     },
  { key: "skill_defending" as const, label: "DEF", name: "Defensa"    },
  { key: "skill_physical"  as const, label: "FIS", name: "Físico"     },
];

export interface PlayerProfileViewProps {
  profile: Profile | null;
  user: User;
  roles: UserRoles;
  teams: TeamWithCount[];
  teamsLoaded: boolean;
  blocks: {
    morpho: import("@/lib/types/db").ProfileMorpho | null;
    conditional: import("@/lib/types/db").ProfileConditional | null;
    technical: import("@/lib/types/db").ProfileTechnicalFootball | null;
  } | null | undefined;
  uploadingAvatar: boolean;
  upgradingPromoter: boolean;
  upgradingCancha: boolean;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSignOut: () => void;
  onEnablePromoter: () => void;
  onEnableCancha: () => void;
}

export function PlayerProfileView({
  profile,
  user,
  roles,
  teams,
  teamsLoaded,
  blocks,
  uploadingAvatar,
  upgradingPromoter,
  upgradingCancha,
  onAvatarChange,
  onSignOut,
  onEnablePromoter,
  onEnableCancha,
}: PlayerProfileViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const level = profile?.primary_skill_level ?? "intermedio";
  const lvlCfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.intermedio;

  const ovr = profile
    ? Math.round(
        ((profile.skill_pace ?? 50) +
          (profile.skill_shooting ?? 50) +
          (profile.skill_passing ?? 50) +
          (profile.skill_dribbling ?? 50) +
          (profile.skill_defending ?? 50) +
          (profile.skill_physical ?? 50)) /
          6,
      )
    : 50;

  const positionInfo = profile?.position
    ? (PLAYER_POSITIONS.find((p) => p.value === profile.position) ?? null)
    : null;

  const viewerContext: ViewerContext = {
    viewerId: user.id,
    isPromoter: roles?.is_promoter ?? false,
    isOwner: true,
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 pb-24">
      <PageHeader
        title="Mi Perfil"
        actions={
          <>
            <Link href="/perfil/editar">
              <button
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                title="Editar"
              >
                <Pencil className="size-4" />
              </button>
            </Link>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              onClick={onSignOut}
              title="Salir"
            >
              <LogOut className="size-4" />
            </button>
          </>
        }
      />

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-b-[36px] pb-8"
        style={{
          background:
            "linear-gradient(160deg, #c79a2e 0%, #a67b1e 35%, #e8c35a 65%, #8f6511 100%)",
        }}
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          <div className={`w-96 h-96 rounded-full blur-[120px] opacity-30 ${lvlCfg.glow}`} />
        </div>

        {/* ── Player card ── */}
        <div className="relative z-10 pt-6">
          <PlayerCard
            profile={profile}
            onPhotoClick={() => fileInputRef.current?.click()}
            uploading={uploadingAvatar}
            editable
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarChange}
          />
        </div>


      </div>

      {/* ══ CONTENT ═════════════════════════════════════════════════════════ */}
      <main className="px-4 py-4 max-w-2xl mx-auto space-y-3 mt-2">

        {/* ── UBICACIÓN ── */}
        {profile?.city && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden px-5 py-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
              <MapPin className="size-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Ubicación
              </p>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">
                {profile.city}
              </p>
            </div>
          </div>
        )}

        {/* ── HABILIDADES ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Habilidades
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-black text-zinc-900 dark:text-white">
                  OVR <span className="text-violet-600">{ovr}</span>
                </p>
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
                      <span className="text-base font-black text-zinc-900 dark:text-white tabular-nums">
                        {val}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        {label}
                      </span>
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
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                "{profile.bio}"
              </p>
            </div>
          )}
        </div>

        {/* ── PERFIL DEPORTIVO (blocks) ── */}
        {blocks && (
          <>
            {canViewBlock(blocks.morpho?.visibility ?? "privado", viewerContext) &&
              blocks.morpho && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
                  <p className="px-5 pt-5 pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Morfología
                  </p>
                  <div className="px-5 pb-5 grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <Ruler className="size-4 text-violet-500" />
                      <span className="text-base font-black text-zinc-900 dark:text-white">
                        {blocks.morpho.height_m != null ? `${blocks.morpho.height_m}m` : "-"}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Altura
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Weight className="size-4 text-violet-500" />
                      <span className="text-base font-black text-zinc-900 dark:text-white">
                        {blocks.morpho.weight_kg != null ? `${blocks.morpho.weight_kg}kg` : "-"}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Peso
                      </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Activity className="size-4 text-violet-500" />
                      <span className="text-base font-black text-zinc-900 dark:text-white">
                        {blocks.morpho.wingspan_m != null ? `${blocks.morpho.wingspan_m}m` : "-"}
                      </span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Envergadura
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-border/40 px-5 py-3 flex gap-3">
                    <span className="text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full capitalize">
                      {blocks.morpho.laterality || "Sin especificar"}
                    </span>
                    <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded-full capitalize">
                      {blocks.morpho.somatotype || "Sin especificar"}
                    </span>
                  </div>
                </div>
              )}

            {canViewBlock(blocks.conditional?.visibility ?? "privado", viewerContext) &&
              blocks.conditional && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
                  <p className="px-5 pt-5 pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Condición física
                  </p>
                  <div className="px-5 pb-5 flex flex-col gap-4">
                    {(
                      [
                        {
                          label: "Fuerza",
                          tags: blocks.conditional.strength_tags,
                          notes: blocks.conditional.strength_notes,
                        },
                        {
                          label: "Velocidad",
                          tags: blocks.conditional.speed_tags,
                          notes: blocks.conditional.speed_notes,
                        },
                        {
                          label: "Resistencia",
                          tags: blocks.conditional.endurance_tags,
                          notes: blocks.conditional.endurance_notes,
                        },
                        {
                          label: "Flexibilidad",
                          tags: blocks.conditional.flexibility_tags,
                          notes: blocks.conditional.flexibility_notes,
                        },
                      ] as const
                    )
                      .map(({ label, tags, notes }) => (
                        <div key={label}>
                          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            {label}
                          </p>
                          {tags && tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 mb-1">
                              {tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/40"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic mb-1">Sin información</p>
                          )}
                          {notes && (
                            <p className="text-xs text-muted-foreground italic">"{notes}"</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {canViewBlock(blocks.technical?.visibility ?? "privado", viewerContext) &&
              blocks.technical && (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
                  <p className="px-5 pt-5 pb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Técnica
                  </p>
                  <div className="px-5 pb-5 flex flex-col gap-2">
                    <p className="text-sm text-zinc-800 dark:text-zinc-200">
                      <span className="text-muted-foreground mr-1">Posición:</span>
                      <span className="capitalize font-medium">{blocks.technical.position || "-"}</span>
                    </p>
                    <p className="text-sm text-zinc-800 dark:text-zinc-200">
                      <span className="text-muted-foreground mr-1">Pie dominante:</span>
                      <span className="capitalize font-medium">
                        {blocks.technical.dominant_foot || "-"}
                      </span>
                    </p>
                    {blocks.technical.performance_notes ? (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        "{blocks.technical.performance_notes}"
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        Sin notas de rendimiento.
                      </p>
                    )}
                  </div>
                </div>
              )}
          </>
        )}

        {/* ── MIS EQUIPOS ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Mis equipos
            </p>
            <Link href="/equipos">
              <button className="text-xs font-semibold text-violet-600 hover:text-violet-700 px-3 py-1.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                Ver todos
              </button>
            </Link>
          </div>

          {!teamsLoaded ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : teams.length === 0 ? (
            <div className="px-5 pb-5 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3">
                <Users className="size-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">Sin equipos aún</p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Unite a un equipo o creá el tuyo
              </p>
              <Link href="/equipos/nuevo">
                <Button
                  size="sm"
                  className="rounded-2xl h-9 px-5 bg-violet-600 hover:bg-violet-700 gap-1.5 text-xs"
                >
                  + Crear equipo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="px-3 pb-4 space-y-1">
              {teams.slice(0, 3).map((team) => (
                <Link key={team.id} href={`/equipos/${team.id}`}>
                  <div className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-xl shrink-0 shadow-sm">
                      ⚽
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                        {team.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3" />
                        {team.city} · <Users className="size-3" />
                        {team.member_count}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
              <div className="px-3 pt-1">
                <Link href="/equipos/nuevo">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-2xl h-8 text-xs gap-1"
                  >
                    + Crear nuevo equipo
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── ACTIVIDAD ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
          <p className="px-5 pt-5 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Actividad
          </p>
          <nav className="pb-2">
            {[
              { href: "/mis-partidos",   icon: <Zap className="size-4" />,      bg: "bg-violet-100 dark:bg-violet-900/30",  color: "text-violet-600",  label: "Mis partidos"   },
              { href: "/mis-reservas",   icon: <Bookmark className="size-4" />,  bg: "bg-emerald-100 dark:bg-emerald-900/30", color: "text-emerald-600", label: "Mis reservas"   },
              { href: "/ranking",        icon: <Trophy className="size-4" />,    bg: "bg-orange-100 dark:bg-orange-900/30",  color: "text-orange-600",  label: "Ranking Local" },
              { href: "/notificaciones", icon: <Bell className="size-4" />,      bg: "bg-amber-100 dark:bg-amber-900/30",    color: "text-amber-600",   label: "Notificaciones" },
              { href: "/amigos",         icon: <Users className="size-4" />,     bg: "bg-blue-100 dark:bg-blue-900/30",      color: "text-blue-600",    label: "Amigos"         },
              { href: "/equipos",        icon: <Shield className="size-4" />,    bg: "bg-violet-100 dark:bg-violet-900/30",  color: "text-violet-600",  label: "Equipos"        },
            ].map(({ href, icon, bg, color, label }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                  <div
                    className={`w-9 h-9 rounded-xl ${bg} ${color} flex items-center justify-center shrink-0`}
                  >
                    {icon}
                  </div>
                  <span className="text-sm font-medium flex-1 text-zinc-800 dark:text-zinc-200">
                    {label}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </nav>
          <div className="px-3 pb-3">
            <NotificationPermissionCard />
          </div>
        </div>

        {/* ── GESTIÓN (promoter / cancha) ── */}
        {(roles?.is_promoter || roles?.is_cancha) && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
            <p className="px-5 pt-5 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gestión
            </p>
            <nav className="pb-2">
              {roles?.is_promoter && (
                <Link href="/tournaments/mine">
                  <div className="flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
                      <Calendar className="size-4" />
                    </div>
                    <span className="text-sm font-medium flex-1">Mis torneos</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              )}
              {roles?.is_cancha && (
                <Link href="/mis-canchas">
                  <div className="flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center shrink-0">
                      <Building2 className="size-4" />
                    </div>
                    <span className="text-sm font-medium flex-1">Mis canchas</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              )}
            </nav>
          </div>
        )}

        {/* ── CONFIGURACIÓN ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-border/40 shadow-sm overflow-hidden">
          <p className="px-5 pt-5 pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Configuración
          </p>
          <nav className="pb-2">
            <Link href="/perfil/editar">
              <div className="flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                  <Pencil className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Editar perfil
                  </p>
                  <p className="text-[11px] text-muted-foreground">Datos, habilidades y posición</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>

            <Link href="/verificacion">
              <div className="flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center shrink-0">
                  <Shield className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Verificación de edad
                  </p>
                  <p className="text-[11px] text-muted-foreground">Subí tu documento</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>

            {roles && !roles.is_promoter && (
              <button
                onClick={onEnablePromoter}
                disabled={upgradingPromoter}
                className="w-full flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                style={{ width: "calc(100% - 24px)" }}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
                  {upgradingPromoter ? (
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trophy className="size-4" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Activar rol Promotor
                  </p>
                  <p className="text-[11px] text-muted-foreground">Organizá torneos y eventos</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            )}

            {roles && !roles.is_cancha && (
              <button
                onClick={onEnableCancha}
                disabled={upgradingCancha}
                className="w-full flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                style={{ width: "calc(100% - 24px)" }}
              >
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center shrink-0">
                  {upgradingCancha ? (
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Building2 className="size-4" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Registrar mi cancha
                  </p>
                  <p className="text-[11px] text-muted-foreground">Recibí reservas online</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            )}

            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 mx-3 px-3 py-3 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              style={{ width: "calc(100% - 24px)" }}
            >
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center shrink-0">
                <LogOut className="size-4" />
              </div>
              <span className="text-sm font-medium text-red-600 flex-1 text-left">
                Cerrar sesión
              </span>
            </button>
          </nav>
        </div>

        {profile?.username && (
          <p className="text-center text-[11px] text-muted-foreground/50 pb-2">
            @{profile.username}
            {profile.city ? ` · ${profile.city}` : ""}
          </p>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
