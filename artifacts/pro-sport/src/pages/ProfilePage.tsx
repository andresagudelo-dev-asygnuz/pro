import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { initialsFromName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Pencil, Shield, Trophy, Zap, Building2 } from "lucide-react";
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
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const initials = initialsFromName(profile?.full_name || profile?.username);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/feed" className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase">
            PRO<span className="text-brand-primary">.</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/perfil/editar">
              <Button variant="ghost" size="icon" title="Editar perfil">
                <Pencil className="size-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Cerrar sesión">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* User card */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-6 shadow-sm mb-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center text-xl font-black text-brand-primary shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {profile?.full_name || "Sin nombre"}
              </h1>
              {profile?.username && (
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              )}
              {profile?.city && (
                <p className="text-sm text-muted-foreground mt-1">📍 {profile.city}</p>
              )}
              {profile?.primary_skill_level && (
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  Nivel: {profile.primary_skill_level}
                </p>
              )}
              {profile?.bio && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{profile.bio}</p>
              )}
              {roles && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {roles.is_player && (
                    <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      Jugador
                    </span>
                  )}
                  {roles.is_promoter && (
                    <span className="text-xs font-medium bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded-full">
                      Promotor
                    </span>
                  )}
                  {roles.is_cancha && (
                    <span className="text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">
                      🏟️ Cancha
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-black text-zinc-900 dark:text-white">{profile?.matches_played ?? 0}</p>
              <p className="text-xs text-muted-foreground">Partidos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {profile?.rating_avg ? profile.rating_avg.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-zinc-900 dark:text-white">{profile?.tournament_goals ?? 0}</p>
              <p className="text-xs text-muted-foreground">Goles</p>
            </div>
          </div>
        </div>

        {/* Complete profile banner */}
        {!profile?.username && (
          <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-xl p-4 mb-5">
            <p className="text-sm font-medium text-brand-primary mb-1">Completá tu perfil</p>
            <p className="text-xs text-muted-foreground mb-3">Añadí tu username y datos deportivos para empezar.</p>
            <Link href="/onboarding">
              <Button size="sm">Completar perfil</Button>
            </Link>
          </div>
        )}

        {/* Activate promoter banner */}
        {roles && !roles.is_promoter && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
              ¿Querés organizar torneos?
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
              Activá el rol de Promotor para crear y gestionar torneos.
            </p>
            <Button size="sm" onClick={handleEnablePromoter} disabled={upgradingPromoter}>
              {upgradingPromoter ? "Activando…" : "Activar rol de Promotor"}
            </Button>
          </div>
        )}

        {/* Activate cancha banner */}
        {roles && !roles.is_cancha && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl p-4 mb-5">
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-1">
              🏟️ ¿Administrás una cancha?
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-400 mb-3">
              Registrá tus canchas, configurá horarios y recibí reservas online.
            </p>
            <Button size="sm" variant="outline" onClick={handleEnableCancha} disabled={upgradingCancha}
              className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50">
              {upgradingCancha ? "Activando…" : "Activar rol de Cancha"}
            </Button>
          </div>
        )}

        {/* Action grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Link href="/matches/new">
            <Button variant="outline" className="w-full gap-2">
              <Zap className="size-4" /> Crear partido
            </Button>
          </Link>
          <Link href="/tournaments">
            <Button variant="outline" className="w-full gap-2">
              <Trophy className="size-4" /> Torneos
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Link href="/tournaments/mine">
            <Button variant="outline" className="w-full gap-2">
              <Trophy className="size-4" /> Mis torneos
            </Button>
          </Link>
          <Link href="/canchas">
            <Button variant="outline" className="w-full gap-2">
              <Building2 className="size-4" /> Canchas
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {roles?.is_cancha && (
            <Link href="/mis-canchas">
              <Button variant="outline" className="w-full gap-2">
                <Building2 className="size-4" /> Mis canchas
              </Button>
            </Link>
          )}
          <Link href="/verificacion">
            <Button variant="outline" className="w-full gap-2">
              <Shield className="size-4" /> Verificación
            </Button>
          </Link>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-14">
            <Link href="/feed" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏠</span><span>Inicio</span>
            </Link>
            <Link href="/tournaments" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏆</span><span>Torneos</span>
            </Link>
            <Link href="/canchas" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏟️</span><span>Canchas</span>
            </Link>
            <Link href="/notificaciones" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🔔</span><span>Notif.</span>
            </Link>
            <Link href="/perfil" className="flex flex-col items-center gap-0.5 text-xs font-medium text-brand-primary">
              <span>👤</span><span>Perfil</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
