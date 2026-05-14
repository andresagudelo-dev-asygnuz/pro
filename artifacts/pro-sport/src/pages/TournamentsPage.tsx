import { supabase } from "@/lib/supabase";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getTournaments } from "@/lib/tournaments/api";
import { Plus, Users, Calendar, MapPin, Loader2 } from "lucide-react";
import { TournamentCardSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";

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

  const {
    data,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["tournaments"],
    queryFn: ({ pageParam }) =>
      getTournaments(supabase, { cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const tournaments = data?.pages.flatMap((p) => p.data ?? []) ?? [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader
        title="Torneos"
        actions={<>
          {roles?.is_promoter && (
            <Link href="/tournaments/mine">
              <Button variant="outline" size="sm" className="rounded-xl text-xs">Mis torneos</Button>
            </Link>
          )}
          {roles?.is_promoter && (
            <Link href="/tournaments/new">
              <Button size="sm" className="rounded-xl gap-1.5 bg-violet-600 hover:bg-violet-700">
                <Plus className="size-3.5" /> Crear
              </Button>
            </Link>
          )}
        </>}
      />

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <TournamentCardSkeleton key={i} />
            ))}
          </div>
        ) : tournaments.length === 0 && roles?.is_promoter ? (
          <EmptyState
            title="No hay torneos disponibles"
            cta={{ label: "Crear torneo", href: "/tournaments/new" }}
          />
        ) : tournaments.length === 0 ? (
          <EmptyState
            title="No hay torneos disponibles"
            description="Aún no hay torneos creados en tu zona"
          />
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

            <InfiniteScrollSentinel
              enabled={hasNextPage && !isFetchingNextPage}
              onIntersect={fetchNextPage}
            />
            {isFetchingNextPage && (
              <div className="py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
