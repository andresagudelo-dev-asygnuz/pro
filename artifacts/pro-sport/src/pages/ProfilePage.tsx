import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { initialsFromName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings } from "lucide-react";
import type { Profile } from "@/lib/types/db";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLocation("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setLocation("/");
  };

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
            <Button variant="ghost" size="icon">
              <Settings className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-6 shadow-sm mb-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-primary/20 flex items-center justify-center text-xl font-black text-brand-primary shrink-0">
              {initials}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
                {profile?.full_name || "Sin nombre"}
              </h1>
              {profile?.username && (
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              )}
              {profile?.city && (
                <p className="text-sm text-muted-foreground mt-1">📍 {profile.city}</p>
              )}
              {profile?.bio && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{profile.bio}</p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-black text-zinc-900 dark:text-white">{profile?.matches_played ?? 0}</p>
              <p className="text-xs text-muted-foreground">Partidos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-zinc-900 dark:text-white">{profile?.rating_avg?.toFixed(1) ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-zinc-900 dark:text-white">{profile?.tournament_goals ?? 0}</p>
              <p className="text-xs text-muted-foreground">Goles</p>
            </div>
          </div>
        </div>

        {!profile?.username && (
          <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-brand-primary mb-2">Completá tu perfil</p>
            <p className="text-xs text-muted-foreground mb-3">Añade tu username y datos deportivos para empezar.</p>
            <Link href="/onboarding">
              <Button size="sm">Completar perfil</Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/matches/new">
            <Button variant="outline" className="w-full">Crear partido</Button>
          </Link>
          <Link href="/tournaments">
            <Button variant="outline" className="w-full">Ver torneos</Button>
          </Link>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-14">
            <Link href="/feed" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏠</span>
              <span>Inicio</span>
            </Link>
            <Link href="/tournaments" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🏆</span>
              <span>Torneos</span>
            </Link>
            <Link href="/matches/new" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>➕</span>
              <span>Crear</span>
            </Link>
            <Link href="/notificaciones" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>🔔</span>
              <span>Notif.</span>
            </Link>
            <Link href="/perfil" className="flex flex-col items-center gap-0.5 text-xs font-medium text-brand-primary">
              <span>👤</span>
              <span>Perfil</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
