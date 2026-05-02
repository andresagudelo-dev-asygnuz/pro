import { useEffect, useState } from "react";
import { Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { formatMatchDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, LogOut, User } from "lucide-react";
import type { Match } from "@/lib/types/db";

export default function FeedPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, full_name")
          .eq("id", user.id)
          .single();
        setUserName(profile?.username || profile?.full_name || user.email || null);
      }

      const { data } = await supabase
        .from("matches")
        .select("*")
        .eq("status", "open")
        .order("starts_at", { ascending: true })
        .limit(20);

      setMatches(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase">
            PRO<span className="text-brand-primary">.</span>
          </Link>
          <div className="flex items-center gap-2">
            {userName && <span className="text-sm text-muted-foreground hidden sm:block">Hola, {userName}</span>}
            <Link href="/perfil">
              <Button variant="ghost" size="icon">
                <User className="size-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Partidos</h1>
          <Link href="/matches/new">
            <Button size="sm">
              <Plus className="size-4 mr-1" /> Crear partido
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hay partidos abiertos aún.</p>
            <Link href="/matches/new">
              <Button>Crear el primero</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`}>
                <div className="flex flex-col gap-3 rounded-xl border bg-white dark:bg-zinc-900 p-4 shadow-sm transition-colors hover:border-foreground/30 cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>⚽</span>
                        <span>Fútbol</span>
                        <span>·</span>
                        <span>{match.city}</span>
                      </div>
                      <h3 className="text-base font-medium leading-tight text-foreground">{match.title}</h3>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {match.skill_level && (
                        <span className="text-xs capitalize text-muted-foreground">{match.skill_level}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatMatchDate(match.starts_at)}</span>
                    <span>{match.max_players} jugadores máx</span>
                  </div>
                  {match.location && (
                    <p className="line-clamp-1 text-sm text-muted-foreground">📍 {match.location}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-14">
            <Link href="/feed" className="flex flex-col items-center gap-0.5 text-xs font-medium text-brand-primary">
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
            <Link href="/perfil" className="flex flex-col items-center gap-0.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <span>👤</span>
              <span>Perfil</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  );
}
