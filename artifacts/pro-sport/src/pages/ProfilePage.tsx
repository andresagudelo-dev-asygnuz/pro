import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { initialsFromName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { createClient } from "@/lib/supabase/client";
import {
  LogOut,
  Pencil,
  Shield,
  Trophy,
  Zap,
  Building2,
  Bell,
  Users,
  Calendar,
  Bookmark,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

const supabase = createClient();

export default function ProfilePage() {
  const { user, profile, roles, loading, signOut, refreshRoles } = useAuth();
  const [, setLocation] = useLocation();
  const [upgradingPromoter, setUpgradingPromoter] = useState(false);
  const [upgradingCancha, setUpgradingCancha] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  async function handleEnablePromoter() {
    if (!user) return;
    setUpgradingPromoter(true);
    const { error } = await supabase
      .from("user_roles")
      .update({ is_promoter: true })
      .eq("user_id", user.id);
    if (error) {
      toast.error("No se pudo activar el rol. Intentá de nuevo.");
    } else {
      toast.success("¡Rol de Promotor activado!");
      await refreshRoles();
    }
    setUpgradingPromoter(false);
  }

  async function handleEnableCancha() {
    if (!user) return;
    setUpgradingCancha(true);
    const { error } = await supabase
      .from("user_roles")
      .update({ is_cancha: true })
      .eq("user_id", user.id);
    if (error) {
      toast.error("No se pudo activar el rol. Intentá de nuevo.");
    } else {
      toast.success("¡Rol de Cancha activado!");
      await refreshRoles();
    }
    setUpgradingCancha(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = initialsFromName(profile?.full_name || profile?.username);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
            Mi Perfil
          </h1>
          <div className="flex items-center gap-1">
            <Link href="/perfil/editar">
              <button
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
                title="Editar perfil"
              >
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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-5 max-w-2xl space-y-4">
        {/* User card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 overflow-hidden shadow-sm">
          {/* Purple gradient top bar */}
          <div className="h-16 bg-gradient-to-br from-violet-600 to-violet-800" />
          <div className="px-5 pb-5 -mt-8">
            <div className="flex items-end gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/50 border-4 border-white dark:border-zinc-900 flex items-center justify-center text-xl font-black text-violet-700 dark:text-violet-300 shrink-0 shadow-sm">
                {initials}
              </div>
              <div className="pb-1 min-w-0">
                <h1 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight truncate">
                  {profile?.full_name || "Sin nombre"}
                </h1>
                {profile?.username && (
                  <p className="text-sm text-muted-foreground">
                    @{profile.username}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {profile?.city && (
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  📍 {profile.city}
                </span>
              )}
              {profile?.primary_skill_level && (
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full capitalize">
                  {profile.primary_skill_level}
                </span>
              )}
              {roles?.is_player && (
                <span className="text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                  Jugador
                </span>
              )}
              {roles?.is_promoter && (
                <span className="text-xs font-medium bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-2.5 py-1 rounded-full border border-violet-100 dark:border-violet-800">
                  Promotor
                </span>
              )}
              {roles?.is_cancha && (
                <span className="text-xs font-medium bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2.5 py-1 rounded-full border border-orange-100 dark:border-orange-800">
                  🏟️ Cancha
                </span>
              )}
            </div>

            {profile?.bio && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                {profile.bio}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/60">
              <div className="text-center">
                <p className="text-2xl font-black text-zinc-900 dark:text-white">
                  {profile?.matches_played ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Partidos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-zinc-900 dark:text-white">
                  {profile?.rating_avg
                    ? profile.rating_avg.toFixed(1)
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-zinc-900 dark:text-white">
                  {profile?.tournament_goals ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Goles</p>
              </div>
            </div>
          </div>
        </div>

        {/* Complete profile banner */}
        {!profile?.username && (
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4">
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 mb-1">
              Completá tu perfil
            </p>
            <p className="text-xs text-violet-600 dark:text-violet-400 mb-3">
              Añadí tu username y datos deportivos para empezar.
            </p>
            <Link href="/onboarding">
              <Button size="sm" className="rounded-xl">
                Completar perfil
              </Button>
            </Link>
          </div>
        )}

        {/* Quick actions — activity */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mi actividad
          </p>
          <nav className="divide-y divide-border/50">
            <Link href="/mis-partidos">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Zap className="size-4 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-sm font-medium flex-1">
                  Mis partidos
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            <Link href="/mis-reservas">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Bookmark className="size-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium flex-1">
                  Mis reservas
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            <Link href="/notificaciones">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Bell className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm font-medium flex-1">
                  Notificaciones
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            <Link href="/amigos">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium flex-1">Amigos</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          </nav>
        </div>

        {/* Quick actions — explore */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <p className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Explorar
          </p>
          <nav className="divide-y divide-border/50">
            <Link href="/matches/new">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Zap className="size-4 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-sm font-medium flex-1">
                  Crear partido
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            <Link href="/tournaments">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Trophy className="size-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm font-medium flex-1">Torneos</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
            {roles?.is_promoter && (
              <Link href="/tournaments/mine">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Calendar className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-sm font-medium flex-1">
                    Mis torneos
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            )}
            {roles?.is_cancha && (
              <Link href="/mis-canchas">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Building2 className="size-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm font-medium flex-1">
                    Mis canchas
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            )}
            <Link href="/verificacion">
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Shield className="size-4 text-zinc-600 dark:text-zinc-400" />
                </div>
                <span className="text-sm font-medium flex-1">
                  Verificación de edad
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </Link>
          </nav>
        </div>

        {/* Role activation banners */}
        {roles && !roles.is_promoter && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              ¿Querés organizar torneos?
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
              Activá el rol de Promotor para crear y gestionar torneos.
            </p>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={handleEnablePromoter}
              disabled={upgradingPromoter}
            >
              {upgradingPromoter ? "Activando…" : "Activar rol de Promotor"}
            </Button>
          </div>
        )}

        {roles && !roles.is_cancha && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-2xl p-4">
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-1">
              🏟️ ¿Administrás una cancha?
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-400 mb-3">
              Registrá tus canchas, configurá horarios y recibí reservas
              online.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50"
              onClick={handleEnableCancha}
              disabled={upgradingCancha}
            >
              {upgradingCancha ? "Activando…" : "Activar rol de Cancha"}
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
