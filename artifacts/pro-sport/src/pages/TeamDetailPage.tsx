import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import {
  getTeamById, joinTeam, leaveTeam, deleteTeam, updateTeamLogo, updateTeamColors,
  getLocalTeamPrefs, setLocalTeamPrefs,
  type TeamWithMembers, type TeamMemberWithProfile,
} from "@/lib/teams/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { initialsFromName } from "@/lib/format";
import { SPORT_TYPE_LABELS } from "@/lib/types/db";
import { Users, MapPin, LogOut, Trash2, Lock, Globe, Camera, Loader2, Palette, Check, X } from "lucide-react";
import { toast } from "sonner";

/* ── Helpers ─────────────────────────────────────────────────────── */
function resizeToDataUrl(file: File, maxPx = 512, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("No se pudo leer la imagen.")); };
    img.src = objectUrl;
  });
}

/** Parse hex → {r,g,b} */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const c = hex.replace("#", "");
  const n = parseInt(c.length === 3 ? c.split("").map(x => x + x).join("") : c, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Generate hero gradient from a single accent color */
function heroGradient(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const dark = `rgba(${Math.round(r * 0.2)},${Math.round(g * 0.2)},${Math.round(b * 0.2)},1)`;
  const mid  = `rgba(${Math.round(r * 0.6)},${Math.round(g * 0.6)},${Math.round(b * 0.6)},1)`;
  return `linear-gradient(160deg, ${dark} 0%, ${mid} 40%, ${hex} 70%, ${dark} 100%)`;
}

const DEFAULT_HEADER = "#7c3aed";
const DEFAULT_JERSEY = "#7c3aed";

/* ── Sport emojis ──────────────────────────────────────────────── */
const SPORT_EMOJIS: Record<string, string> = {
  futbol_5: "⚽", futbol_9: "⚽", futbol_11: "⚽", futbol_sala: "⚽",
  padel: "🎾", tenis: "🎾", basket: "🏀", voleibol: "🏐", otro: "🏟️",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Capitán", captain: "Capitán", player: "Jugador",
};

/* ── Card styles per skill level ─────────────────────────────────── */
const CARD_STYLES = {
  principiante: {
    bg: "from-amber-600 via-orange-700 to-amber-950",
    shimmer: "from-amber-300/30 via-orange-300/10 to-transparent",
    highlight: "from-amber-300/20 to-transparent",
    text: "text-amber-50", subtext: "text-amber-200/80",
    border: "border-amber-300/30", ring: "ring-amber-300/40",
    divider: "border-amber-300/20", barBg: "bg-amber-900/40", barFill: "bg-amber-200",
  },
  intermedio: {
    bg: "from-slate-300 via-slate-400 to-slate-600",
    shimmer: "from-white/35 via-white/10 to-transparent",
    highlight: "from-white/25 to-transparent",
    text: "text-zinc-900", subtext: "text-zinc-700",
    border: "border-white/50", ring: "ring-white/50",
    divider: "border-zinc-500/40", barBg: "bg-zinc-500/30", barFill: "bg-zinc-800",
  },
  avanzado: {
    bg: "from-yellow-300 via-amber-400 to-yellow-700",
    shimmer: "from-yellow-100/35 via-yellow-100/10 to-transparent",
    highlight: "from-yellow-100/25 to-transparent",
    text: "text-amber-950", subtext: "text-amber-800",
    border: "border-yellow-100/50", ring: "ring-yellow-200/60",
    divider: "border-amber-700/30", barBg: "bg-amber-700/30", barFill: "bg-amber-950",
  },
  pro: {
    bg: "from-violet-400 via-violet-700 to-purple-950",
    shimmer: "from-violet-200/30 via-violet-300/10 to-transparent",
    highlight: "from-violet-200/20 to-transparent",
    text: "text-white", subtext: "text-violet-200/90",
    border: "border-violet-300/30", ring: "ring-violet-300/40",
    divider: "border-violet-300/20", barBg: "bg-violet-900/40", barFill: "bg-violet-100",
  },
} as const;

const POSITION_ABBR: Record<string, string> = {
  arquero: "POR", defensa: "DEF", mediocampista: "MED", delantero: "DEL",
};

function computeOvr(p: TeamMemberWithProfile["profile"]): number {
  if (!p) return 50;
  const vals = [
    (p as any).skill_pace ?? 50, (p as any).skill_shooting ?? 50,
    (p as any).skill_passing ?? 50, (p as any).skill_dribbling ?? 50,
    (p as any).skill_defending ?? 50, (p as any).skill_physical ?? 50,
  ];
  return Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length);
}

/* ── Jersey SVG icon ─────────────────────────────────────────────── */
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

/* ── Mini member card ────────────────────────────────────────────── */
function MemberCard({ member }: { member: TeamMemberWithProfile }) {
  const p = member.profile;
  const level = ((p as any)?.primary_skill_level ?? "intermedio") as keyof typeof CARD_STYLES;
  const s = CARD_STYLES[level] ?? CARD_STYLES.intermedio;
  const ovr = computeOvr(p);
  const initials = initialsFromName((p as any)?.full_name ?? (p as any)?.username);
  const pos = POSITION_ABBR[(p as any)?.position ?? ""] ?? "JUG";
  const isOwner = member.role === "owner";
  const isCaptain = member.role === "captain";

  const SKILL_DEFS: [string, number][] = [
    ["PAC", (p as any)?.skill_pace ?? 50], ["TIR", (p as any)?.skill_shooting ?? 50],
    ["PAS", (p as any)?.skill_passing ?? 50], ["REG", (p as any)?.skill_dribbling ?? 50],
    ["DEF", (p as any)?.skill_defending ?? 50], ["FIS", (p as any)?.skill_physical ?? 50],
  ];

  return (
    <div className={`relative bg-gradient-to-br ${s.bg} rounded-[22px] shadow-xl overflow-hidden select-none`}
      style={{ aspectRatio: "5/7" }}>
      <div className={`absolute inset-0 bg-gradient-to-br ${s.shimmer} pointer-events-none`} />
      <div className={`absolute top-0 left-0 right-0 h-2/5 bg-gradient-to-b ${s.highlight} pointer-events-none`} />
      <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-black/25 to-transparent pointer-events-none" />

      <div className={`absolute inset-[6px] rounded-[17px] border ${s.border} flex flex-col`}>
        <div className="flex items-start justify-between px-2.5 pt-2.5">
          <div>
            <p className={`text-[38px] font-black leading-none tracking-tight ${s.text}`}>{ovr}</p>
            <p className={`text-[8px] font-black uppercase tracking-[0.25em] -mt-0.5 ${s.subtext}`}>{pos}</p>
          </div>
          <span className="text-[16px] leading-none drop-shadow-md">⚽</span>
        </div>

        <div className="flex justify-center flex-1 items-center py-1">
          <div className="relative inline-block">
            <Avatar className={`size-16 ring-[3px] ${s.ring} shadow-xl`}>
              {(p as any)?.avatar_url && <AvatarImage src={(p as any).avatar_url} alt={(p as any).full_name ?? ""} className="object-cover" />}
              <AvatarFallback className="bg-black/20 text-lg font-black">
                <span className={s.text}>{initials}</span>
              </AvatarFallback>
            </Avatar>
            {(isOwner || isCaptain) && (
              <span className={`absolute -top-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black border shadow-md
                ${isOwner ? "bg-amber-400 text-amber-950 border-amber-200" : "bg-violet-500 text-white border-violet-300"}`}>
                C
              </span>
            )}
          </div>
        </div>

        <div className="text-center px-2 -mt-0.5">
          <p className={`text-[11px] font-black uppercase tracking-wide leading-tight truncate ${s.text} drop-shadow-sm`}>
            {(p as any)?.full_name ?? (p as any)?.username ?? "Jugador"}
          </p>
          <p className={`text-[8px] font-semibold mt-0.5 ${s.subtext}`}>{ROLE_LABELS[member.role]}</p>
        </div>

        <div className={`mx-3 mt-1.5 border-t ${s.divider}`} />

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

/* ═══════════════════════════════════════════════════════════════════ */
export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  /* ── Color personalization state ── */
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [draftHeader, setDraftHeader] = useState(DEFAULT_HEADER);
  const [draftJersey, setDraftJersey] = useState(DEFAULT_JERSEY);
  const [savingColors, setSavingColors] = useState(false);

  /* ── Resolved colors (DB → localStorage → default) ── */
  const resolvedHeader = team?.header_color ?? (id ? getLocalTeamPrefs(id)?.header_color : null) ?? DEFAULT_HEADER;
  const resolvedJersey = team?.jersey_color ?? (id ? getLocalTeamPrefs(id)?.jersey_color : null) ?? DEFAULT_JERSEY;

  const myMembership = team?.team_members.find((m) => m.user_id === user?.id);
  const isOwner = myMembership?.role === "owner";
  const isMember = !!myMembership;

  useEffect(() => {
    if (!id) return;
    getTeamById(id)
      .then((data) => {
        setTeam(data);
        if (data) {
          const local = getLocalTeamPrefs(id);
          setDraftHeader(data.header_color ?? local?.header_color ?? DEFAULT_HEADER);
          setDraftJersey(data.jersey_color ?? local?.jersey_color ?? DEFAULT_JERSEY);
        }
      })
      .catch((err: any) => {
        console.error("[TeamDetailPage] getTeamById error:", err);
        toast.error("Error al cargar equipo: " + (err?.message ?? String(err)));
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id || !team) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("La imagen no puede superar 10 MB."); return; }
    setUploadingLogo(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 512, 0.88);
      setTeam((prev) => prev ? { ...prev, logo_url: dataUrl } : prev);
      await updateTeamLogo(id, dataUrl);
      toast.success("¡Logo actualizado!");
    } catch (err: unknown) {
      toast.error("Error al guardar el logo: " + (err instanceof Error ? err.message : "Error desconocido"));
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  }

  async function handleSaveColors() {
    if (!id) return;
    setSavingColors(true);
    // Always save to localStorage immediately
    setLocalTeamPrefs(id, { header_color: draftHeader, jersey_color: draftJersey });
    // Optimistically update UI
    setTeam((prev) => prev ? { ...prev, header_color: draftHeader, jersey_color: draftJersey } : prev);
    // Try to persist to DB (will fail gracefully if columns don't exist yet)
    try {
      await updateTeamColors(id, draftHeader, draftJersey);
      toast.success("¡Colores guardados!");
    } catch {
      toast.success("¡Colores guardados localmente!");
    }
    setShowColorPanel(false);
    setSavingColors(false);
  }

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

      {/* ══ HERO ════════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-b-[36px] transition-all duration-500"
        style={{ background: heroGradient(resolvedHeader) }}
      >
        {/* Top bar: back + owner actions */}
        <PageHeader
          title=""
          backHref="/equipos"
          actions={
            isOwner ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setShowColorPanel((v) => !v); setDraftHeader(resolvedHeader); setDraftJersey(resolvedJersey); }}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors
                    ${showColorPanel ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/60 hover:text-white"}`}
                  title="Personalizar colores"
                >
                  <Palette className="size-4" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionPending}
                  className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-500/20 transition-colors text-white/60 hover:text-red-400"
                  title="Eliminar equipo"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ) : undefined
          }
        />

        {/* Ambient glow */}
        <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
          <div className="w-72 h-72 rounded-full blur-[100px] opacity-20" style={{ backgroundColor: resolvedHeader }} />
        </div>

        <div className="relative z-10 flex flex-col items-center pt-2 pb-6 px-5">

          {/* ── Color picker panel ── */}
          {showColorPanel && isOwner && (
            <div className="w-full max-w-xs mb-5 bg-black/30 backdrop-blur-md rounded-2xl border border-white/15 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3 text-center">Personalizar equipo</p>

              <div className="space-y-3">
                {/* Header color */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border border-white/20 overflow-hidden cursor-pointer shadow-md relative">
                      <input
                        type="color"
                        value={draftHeader}
                        onChange={(e) => setDraftHeader(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-full h-full rounded-lg" style={{ backgroundColor: draftHeader }} />
                    </div>
                    <span className="text-xs font-semibold text-white/80">Color del header</span>
                  </div>
                  <span className="text-[10px] font-mono text-white/40">{draftHeader}</span>
                </div>

                {/* Jersey color */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border border-white/20 overflow-hidden cursor-pointer shadow-md relative">
                      <input
                        type="color"
                        value={draftJersey}
                        onChange={(e) => setDraftJersey(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-full h-full rounded-lg" style={{ backgroundColor: draftJersey }} />
                    </div>
                    <span className="text-xs font-semibold text-white/80">Color de camiseta</span>
                  </div>
                  <JerseyIcon color={draftJersey} size={28} />
                </div>

                {/* Preview hint */}
                <div className="rounded-lg overflow-hidden h-3" style={{ background: heroGradient(draftHeader) }} />
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowColorPanel(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/10 text-white/70 text-xs font-semibold hover:bg-white/15 transition-colors"
                >
                  <X className="size-3.5" /> Cancelar
                </button>
                <button
                  onClick={handleSaveColors}
                  disabled={savingColors}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition-colors"
                >
                  {savingColors ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Guardar
                </button>
              </div>
            </div>
          )}

          {/* ── Team logo ── */}
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
          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

          <h1 className="text-2xl font-black text-white text-center leading-tight mb-1">{team.name}</h1>

          {/* Sport + visibility + jersey */}
          <div className="flex items-center gap-2 mb-3 flex-wrap justify-center">
            <span className="text-xs font-semibold bg-white/15 text-white/90 px-3 py-1 rounded-full border border-white/20 backdrop-blur-sm">
              {sportLabel}
            </span>
            {team.is_public
              ? <span className="flex items-center gap-1 text-xs text-white/50"><Globe className="size-3" /> Público</span>
              : <span className="flex items-center gap-1 text-xs text-white/50"><Lock className="size-3" /> Privado</span>}
            {/* Jersey color swatch */}
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
          <div className="flex items-center gap-1.5 text-white/60 text-xs mb-4">
            <MapPin className="size-3.5" />
            <span>{team.city}</span>
          </div>

          {/* Description */}
          {team.description && (
            <p className="text-sm text-white/70 text-center leading-relaxed max-w-xs mb-4">{team.description}</p>
          )}

          {/* Action button */}
          {user && (
            isMember ? (
              !isOwner && (
                <Button variant="outline" size="sm"
                  className="rounded-xl gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                  onClick={handleLeave} disabled={actionPending}>
                  <LogOut className="size-3.5" />
                  {actionPending ? "Saliendo…" : "Salir del equipo"}
                </Button>
              )
            ) : (
              !isFull && (
                <Button size="sm"
                  className="rounded-xl gap-2 text-white shadow-lg"
                  style={{ backgroundColor: resolvedHeader, boxShadow: `0 8px 24px ${resolvedHeader}55` }}
                  onClick={handleJoin} disabled={actionPending}>
                  <Users className="size-3.5" />
                  {actionPending ? "Uniéndome…" : "Unirme al equipo"}
                </Button>
              )
            )
          )}
        </div>
      </div>

      {/* ══ MEMBERS ══════════════════════════════════════════════════════ */}
      <main className="px-4 py-5 max-w-2xl mx-auto">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Integrantes · {team.team_members.length}
        </p>
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
