import { useEffect, useState } from "react";
import { Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BottomNav } from "@/components/BottomNav";
import { Plus, Trophy, Users, Calendar, MapPin } from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  format: string;
  slots: number;
  slots_filled: number;
  location: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  abierto_inscripciones: "Inscripciones abiertas",
  cerrado_inscripciones: "Cerrado",
  cancelado: "Cancelado",
  finalizado: "Finalizado",
};

const STATUS_STYLES: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground border-border",
  abierto_inscripciones:
    "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
  cerrado_inscripciones: "bg-muted text-muted-foreground border-border",
  cancelado:
    "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-700",
  finalizado: "bg-muted text-muted-foreground border-border",
};

const FORMAT_LABELS: Record<string, string> = {
  liga: "Liga",
  copa: "Copa",
  grupos: "Grupos + Eliminación",
  eliminacion_directa: "Eliminación directa",
};

export default function TournamentsPage() {
  const { roles } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }: { data: Tournament[] | null }) => {
        setTournaments(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <header className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
              Torneos
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {roles?.is_promoter && (
              <Link href="/tournaments/mine">
                <Button variant="outline" size="sm" className="rounded-xl text-xs">
                  Mis torneos
                </Button>
              </Link>
            )}
            {roles?.is_promoter && (
              <Link href="/tournaments/new">
                <Button size="sm" className="rounded-xl gap-1.5 bg-violet-600 hover:bg-violet-700">
                  <Plus className="size-3.5" /> Crear
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tournaments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Trophy className="size-7 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">
                No hay torneos disponibles
              </p>
              <p className="text-sm text-muted-foreground">
                {roles?.is_promoter
                  ? "Creá el primero."
                  : "Pronto habrá torneos disponibles."}
              </p>
            </div>
            {roles?.is_promoter && (
              <Link href="/tournaments/new">
                <Button size="sm" className="rounded-xl">
                  Crear torneo
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tournaments.map((t) => {
              const filled = t.slots_filled ?? 0;
              const pct = Math.min(100, Math.round((filled / t.slots) * 100));
              return (
                <Link key={t.id} href={`/tournaments/${t.id}`}>
                  <div className="group bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-200 cursor-pointer overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-zinc-900 dark:text-white group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors leading-tight truncate">
                            {t.name}
                          </h3>
                          {t.format && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {FORMAT_LABELS[t.format] ?? t.format}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[t.status] ?? "bg-muted text-muted-foreground border-border"}`}
                        >
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" /> {t.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(t.start_date).toLocaleDateString("es-CO", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          –{" "}
                          {new Date(t.end_date).toLocaleDateString("es-CO", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>

                      {/* Slots progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Users className="size-3" />
                            {filled}/{t.slots} cupos
                          </span>
                          <span className="text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
