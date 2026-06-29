import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { getMyTeams, getPublicTeams, type TeamWithCount } from "@/lib/teams/api";
import { Button } from "@/components/ui/button";
import { Plus, Users, MapPin, Shield, Globe, Lock } from "lucide-react";
import { SPORT_TYPE_LABELS } from "@/lib/types/db";

const SPORT_EMOJIS: Record<string, string> = {
  futbol_5: "⚽", futbol_9: "⚽", futbol_11: "⚽", futbol_sala: "⚽",
  padel: "🎾", tenis: "🎾", basket: "🏀", voleibol: "🏐", otro: "🏟️",
};

function TeamCard({ team, mine = false }: { team: TeamWithCount; mine?: boolean }) {
  return (
    <Link href={`/equipos/${team.id}`}>
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-4 flex items-center gap-3 hover:border-violet-300 dark:hover:border-violet-700 transition-colors cursor-pointer">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-2xl shrink-0 shadow-sm">
          {SPORT_EMOJIS[team.sport_type] ?? "🏟️"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{team.name}</p>
            {mine && (
              <span className="shrink-0 text-[10px] font-semibold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded-full">
                Miembro
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3" /> {team.city}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="size-3" /> {team.member_count}
            </span>
            {!team.is_public && <Lock className="size-3 text-muted-foreground" />}
          </div>
        </div>
        <div className="text-xs text-muted-foreground shrink-0">
          {(SPORT_TYPE_LABELS as Record<string, string>)[team.sport_type] ?? team.sport_type}
        </div>
      </div>
    </Link>
  );
}

export default function TeamsPage() {
  const { user, profile } = useAuth();
  const [myTeams, setMyTeams] = useState<TeamWithCount[]>([]);
  const [publicTeams, setPublicTeams] = useState<TeamWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamsSupported, setTeamsSupported] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [mine, pub] = await Promise.all([
          getMyTeams(user.id),
          getPublicTeams(profile?.city ?? undefined),
        ]);
        setMyTeams(mine);
        setPublicTeams(pub.filter((t) => !mine.some((m) => m.id === t.id)));
      } catch {
        setTeamsSupported(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, profile?.city]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 pt-4 pb-1 max-w-2xl flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Equipos</h1>
        <Link href="/equipos/nuevo">
          <Button size="sm" className="gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-700">
            <Plus className="size-3.5" /> Crear
          </Button>
        </Link>
      </div>

      <main className="container mx-auto px-4 pt-2 pb-24 max-w-2xl space-y-4">
        {!teamsSupported ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-5 text-center">
            <Shield className="size-8 text-amber-500 mx-auto mb-2" />
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              Función en configuración
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              Ejecutá la migración 003 en tu panel de Supabase para habilitar equipos.
            </p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Mis equipos */}
            {myTeams.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Mis equipos
                </p>
                <div className="space-y-2">
                  {myTeams.map((t) => <TeamCard key={t.id} team={t} mine />)}
                </div>
              </section>
            )}

            {/* Descubrir */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {profile?.city ? `Equipos en ${profile.city}` : "Equipos públicos"}
              </p>
              {publicTeams.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm p-8 text-center">
                  <Globe className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-semibold text-sm text-zinc-900 dark:text-white">No hay equipos cerca</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ¡Sé el primero en crear un equipo en tu ciudad!
                  </p>
                  <Link href="/equipos/nuevo">
                    <Button size="sm" className="mt-4 rounded-xl gap-1.5">
                      <Plus className="size-3.5" /> Crear equipo
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {publicTeams.map((t) => <TeamCard key={t.id} team={t} />)}
                </div>
              )}
            </section>
          </>
        )}
      </main>

    </div>
  );
}
