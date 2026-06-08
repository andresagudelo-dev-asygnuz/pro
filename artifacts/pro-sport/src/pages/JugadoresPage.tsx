import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { searchPlayers, type PlayerSearchFilters } from "@/lib/profiles/api";
import { PlayerCard } from "@/components/PlayerCard";
import { PageHeader } from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SKILL_LEVELS, PLAYER_POSITIONS, ENABLED_CITIES } from "@/lib/types/db";
import { Users } from "lucide-react";

const LIMIT = 20;

export default function JugadoresPage() {
  const [filterCity,  setFilterCity]  = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterPos,   setFilterPos]   = useState("");

  const filters: PlayerSearchFilters = useMemo(
    () => ({
      city:        filterCity  || undefined,
      skill_level: filterLevel || undefined,
      position:    filterPos   || undefined,
    }),
    [filterCity, filterLevel, filterPos]
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey:         ["players", filters],
    queryFn:          ({ pageParam }) =>
      searchPlayers(supabase, filters, { cursor: pageParam as string | undefined, limit: LIMIT }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const players = useMemo(
    () => data?.pages.flatMap((p) => p.data ?? []) ?? [],
    [data]
  );

  const hasFilters = !!(filterCity || filterLevel || filterPos);

  function clearFilters() {
    setFilterCity("");
    setFilterLevel("");
    setFilterPos("");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader title="Jugadores" backHref="/feed" />

      {/* Filter bar */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 max-w-2xl mx-auto overflow-x-auto scrollbar-none">
          <Select value={filterCity} onValueChange={(v) => setFilterCity(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs rounded-full min-w-[100px] shrink-0">
              <SelectValue placeholder="Ciudad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {ENABLED_CITIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs rounded-full min-w-[110px] shrink-0">
              <SelectValue placeholder="Nivel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los niveles</SelectItem>
              {SKILL_LEVELS.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterPos} onValueChange={(v) => setFilterPos(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs rounded-full min-w-[120px] shrink-0">
              <SelectValue placeholder="Posición" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las posiciones</SelectItem>
              {PLAYER_POSITIONS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-auto"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <main className="container mx-auto px-4 py-5 max-w-2xl">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-3xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" style={{ aspectRatio: "5/7" }} />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16 text-sm text-muted-foreground">
            Error al cargar jugadores. Intenta de nuevo.
          </div>
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Users className="size-7 text-muted-foreground/40" />
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">No se encontraron jugadores</p>
              <p className="text-sm text-muted-foreground">
                {hasFilters ? "Probá con otros filtros." : "Aún no hay jugadores registrados."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-4">
              {players.length} jugador{players.length !== 1 ? "es" : ""}
              {hasFilters ? " encontrados" : ""}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {players.map((player) => (
                <Link key={player.id} href={player.username ? `/u/${player.username}` : `/perfil`}>
                  <div className="cursor-pointer hover:scale-[1.02] transition-transform duration-200">
                    <PlayerCard profile={player} />
                  </div>
                </Link>
              ))}
            </div>

            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-xl"
                >
                  {isFetchingNextPage ? "Cargando..." : "Cargar más"}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
