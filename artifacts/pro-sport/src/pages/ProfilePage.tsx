import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { initialsFromName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { PlayerCard } from "@/components/PlayerCard";
import { getMyTeams, type TeamWithCount } from "@/lib/teams/api";
import {
  LogOut, Pencil, Shield, Trophy, Zap, Building2, Bell, Users,
  Calendar, Bookmark, ChevronRight, Settings, Star, Target, MapPin,
} from "lucide-react";
import { toast } from "sonner";

const supabase = createClient();

const SKILL_DEFS = [
  { key: "skill_pace" as const,      label: "PAC", name: "Velocidad",  color: "bg-blue-500",    icon: "⚡" },
  { key: "skill_shooting" as const,  label: "TIR", name: "Disparo",    color: "bg-red-500",     icon: "🎯" },
  { key: "skill_passing" as const,   label: "PAS", name: "Pase",       color: "bg-green-500",   icon: "🔄" },
  { key: "skill_dribbling" as const, label: "REG", name: "Regate",     color: "bg-amber-500",   icon: "🏃" },
  { key: "skill_defending" as const, label: "DEF", name: "Defensa",    color: "bg-violet-500",  icon: "🛡️" },
  { key: "skill_physical" as const,  label: "FIS", name: "Físico",     color: "bg-orange-500",  icon: "💪" },
];

const LEVEL_LABELS: Record<string, string> = {
  principiante: "🥉 Principiante",
  intermedio:   "🥈 Intermedio",
  avanzado:     "🥇 Avanzado",
  pro:          "👑 Pro",
};

export default function ProfilePage() {
  const { user, profile, roles, loading, signOut, refreshRoles, refreshProfile } = useAuth();
  const [, setLocation] = useLocation();
  const [upgradingPromoter, setUpgradingPromoter] = useState(false);
  const [upgradingCancha, setUpgradingCancha] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [myTeams, setMyTeams] = useState<TeamWithCount[]>([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    getMyTeams(user.id)
      .then(setMyTeams)
      .catch(() => {})
      .finally(() => setTeamsLoaded(true));
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  async function handleEnablePromoter() {
    if (!user) return;
    setUpgradingPromoter(true);
    const { error } = await supabase.from("user_roles").update({ is_promoter: true }).eq("user_id", user.id);
    if (error) toast.error("No se pudo activar el rol.");
    else { toast.success("¡Rol de Promotor activado!"); await refreshRoles(); }
    setUpgradingPromoter(false);
  }

  async function handleEnableCancha() {
    if (!user) return;
    setUpgradingCancha(true);
    const { error } = await supabase.from("user_roles").update({ is_cancha: true }).eq("user_id", user.id);
    if (error) toast.error("No se pudo activar el rol.");
    else { toast.success("¡Rol de Cancha activado!"); await refreshRoles(); }
    setUpgradingCancha(false);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("La imagen no puede superar 5 MB."); return; }
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes."); return; }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;

    await supabase.storage.createBucket("avatars", { public: true }).catch(() => {});

    const { error: uploadErr } = await supabase.storage
      .from("avatars").upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) {
      toast.error("No se pudo subir la foto: " + uploadErr.message);
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const cacheBusted = `${publicUrl}?t=${Date.now()}`;

    const { error: updateErr } = await supabase
      .from("profiles").update({ avatar_url: cacheBusted, updated_at: new Date().toISOString() }).eq("id", user.id);

    if (updateErr) toast.error("Error actualizando perfil.");
    else { await refreshProfile(); toast.success("Foto actualizada."); }

    setUploadingAvatar(false);
    e.target.value = "";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ovr = profile
    ? Math.round(
        ((profile.skill_pace ?? 50) + (profile.skill_shooting ?? 50) + (profile.skill_passing ?? 50) +
         (profile.skill_dribbling ?? 50) + (profile.skill_defending ?? 50) + (profile.skill_physical ?? 50)) / 6
      )
    : 50;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader
        title="Mi Perfil"
        actions={
          <>
            <Link href="/perfil/editar">
              <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors" title="Editar perfil">
                <Pencil className="size-4" />
              </button>
            </Link>
            <button
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground"
              onClick={handleSignOut}
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </>
        }
      />

      {/* ── Dark hero section ── */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 pt-6 pb-10 px-4">
        {/* Complete profile banner */}
        {!profile?.username && (
          <div className="bg-amber-500/20 border border-amber-500/40 rounded-2xl p-3 mb-4 max-w-sm mx-auto text-center">
            <p className="text-sm font-semibold text-amber-300 mb-1">Completá tu perfil</p>
            <p className="text-xs text-amber-400/80 mb-2">Añadí tu username para desbloquear todas las funciones.</p>
            <Link href="/onboarding">
              <Button size="sm" className="rounded-xl h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white">
                Completar
              </Button>
            </Link>
          </div>
        )}

        {/* FIFA Card */}
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
          onChange={handleAvatarUpload}
        />

        {/* Level badge + tap hint */}
        <div className="text-center mt-3 space-y-1">
          {profile?.primary_skill_level && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-semibold">
              {LEVEL_LABELS[profile.primary_skill_level]}
            </span>
          )}
          <p className="text-white/40 text-[10px]">Tocá la foto para cambiarla</p>
        </div>
      </div>

      {/* ── Stats bar (floats over dark/light boundary) ── */}
      <div className="px-4 -mt-5">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-lg p-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "OVR", value: ovr, highlight: true },
              { label: "Partidos", value: profile?.matches_played ?? 0 },
              { label: "Rating", value: profile?.rating_avg ? profile.rating_avg.toFixed(1) : "—" },
              { label: "Goles", value: profile?.tournament_goals ?? 0 },
            ].map(({ label, value, highlight }) => (
              <div key={label}>
                <p className={`text-2xl font-black ${highlight ? "text-violet-600" : "text-zinc-900 dark:text-white"}`}>
                  {value}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-4 max-w-2xl space-y-4 mt-2">

        {/* ── Habilidades ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Habilidades</p>
            <Link href="/perfil/editar">
              <button className="text-xs text-violet-600 font-semibold hover:underline">Editar</button>
            </Link>
          </div>
          <div className="px-4 pb-4 grid grid-cols-2 gap-x-6 gap-y-3">
            {SKILL_DEFS.map(({ key, label, name, color }) => {
              const val = (profile?.[key] as number) ?? 50;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-zinc-900 dark:text-white w-7">{val}</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground/70">{name}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {profile?.bio && (
            <div className="border-t border-border/50 px-4 py-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{profile.bio}</p>
            </div>
          )}
        </div>

        {/* ── Mis Equipos ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mis equipos</p>
            <Link href="/equipos">
              <button className="text-xs text-violet-600 font-semibold hover:underline">Ver todos</button>
            </Link>
          </div>

          {!teamsLoaded ? (
            <div className="px-4 pb-4 flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : myTeams.length === 0 ? (
            <div className="px-4 pb-4 text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-2">
                <Users className="size-5 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">Sin equipos aún</p>
              <Link href="/equipos/nuevo">
                <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1">
                  Crear equipo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-2">
              {myTeams.slice(0, 3).map((team) => (
                <Link key={team.id} href={`/equipos/${team.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-xl shrink-0">
                      ⚽
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{team.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="size-3" /> {team.city} · <Users className="size-3" /> {team.member_count}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
              <Link href="/equipos/nuevo">
                <Button size="sm" variant="outline" className="w-full rounded-xl text-xs mt-1 gap-1">
                  <span>+</span> Crear nuevo equipo
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* ── Mi actividad ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mi actividad</p>
          <nav className="divide-y divide-border/50">
            {[
              { href: "/mis-partidos", icon: <Zap className="size-4 text-violet-600 dark:text-violet-400" />, bg: "bg-violet-100 dark:bg-violet-900/30", label: "Mis partidos" },
              { href: "/mis-reservas", icon: <Bookmark className="size-4 text-green-600 dark:text-green-400" />, bg: "bg-green-100 dark:bg-green-900/30", label: "Mis reservas" },
              { href: "/notificaciones", icon: <Bell className="size-4 text-amber-600 dark:text-amber-400" />, bg: "bg-amber-100 dark:bg-amber-900/30", label: "Notificaciones" },
              { href: "/amigos", icon: <Users className="size-4 text-blue-600 dark:text-blue-400" />, bg: "bg-blue-100 dark:bg-blue-900/30", label: "Amigos" },
              { href: "/equipos", icon: <Shield className="size-4 text-violet-600 dark:text-violet-400" />, bg: "bg-violet-100 dark:bg-violet-900/30", label: "Equipos" },
            ].map(({ href, icon, bg, label }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
                  <span className="text-sm font-medium flex-1">{label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Explorar ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explorar</p>
          <nav className="divide-y divide-border/50">
            <Link href="/matches/new">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Zap className="size-4 text-violet-600" />
                </div>
                <span className="text-sm font-medium flex-1">Crear partido</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            <Link href="/tournaments">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Trophy className="size-4 text-amber-600" />
                </div>
                <span className="text-sm font-medium flex-1">Torneos</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            {roles?.is_promoter && (
              <Link href="/tournaments/mine">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Calendar className="size-4 text-amber-600" />
                  </div>
                  <span className="text-sm font-medium flex-1">Mis torneos</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            )}
            {roles?.is_cancha && (
              <Link href="/mis-canchas">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Building2 className="size-4 text-orange-600" />
                  </div>
                  <span className="text-sm font-medium flex-1">Mis canchas</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            )}
          </nav>
        </div>

        {/* ── Configuración ── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuración</p>
          <nav className="divide-y divide-border/50">
            <Link href="/perfil/editar">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Pencil className="size-4 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Editar perfil</p>
                  <p className="text-xs text-muted-foreground">Datos, habilidades y posición</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            <Link href="/verificacion">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Shield className="size-4 text-zinc-600 dark:text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Verificación de edad</p>
                  <p className="text-xs text-muted-foreground">Subí tu documento de identidad</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>

            {/* Role activations */}
            {roles && !roles.is_promoter && (
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                onClick={handleEnablePromoter}
                disabled={upgradingPromoter}
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Trophy className="size-4 text-amber-600" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium">Activar rol de Promotor</p>
                  <p className="text-xs text-muted-foreground">Organizá torneos y eventos</p>
                </div>
                {upgradingPromoter ? (
                  <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>
            )}
            {roles && !roles.is_cancha && (
              <button
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                onClick={handleEnableCancha}
                disabled={upgradingCancha}
              >
                <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Building2 className="size-4 text-orange-600" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium">Registrar mi cancha</p>
                  <p className="text-xs text-muted-foreground">Recibí reservas online</p>
                </div>
                {upgradingCancha ? (
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>
            )}

            {/* Sign out */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
              onClick={handleSignOut}
            >
              <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <LogOut className="size-4 text-red-600" />
              </div>
              <span className="text-sm font-medium text-red-600 flex-1 text-left">Cerrar sesión</span>
            </button>
          </nav>
        </div>

        {/* Account info footer */}
        {profile?.username && (
          <p className="text-center text-xs text-muted-foreground/60 pb-2">
            @{profile.username} · {profile.city}
          </p>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
