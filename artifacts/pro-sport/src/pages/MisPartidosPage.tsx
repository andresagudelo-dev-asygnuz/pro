import { useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { formatMatchDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { InfiniteScrollSentinel } from "@/components/ui/InfiniteScrollSentinel";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getOrganizedMatches, getParticipatingMatches } from "@/lib/feed/api";
import { Plus, Calendar, Users, Loader2 } from "lucide-react";
import type { FeedMatch } from "@/lib/feed/api";
import { MatchCardSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { KEYS } from "@/lib/queryKeys";


type Tab = "organizados" | "participando" | "historial";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  full: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  in_progress:
    "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  completed: "bg-muted text-muted-foreground",
  cancelled:
    "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 line-through",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  full: "Lleno",
  in_progress: "En juego",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

function MatchCard({ match }: { match: FeedMatch }) {
  return (
    <Link href={`/matches/${match.id}`}>
      <div className="group bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-4 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-200 cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-2xl shrink-0">
              {match.sport?.name ? "⚽" : "⚽"}
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
                {match.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {match.sport?.name ?? "Deporte"} · {match.city}
              </p>
            </div>
          </div>
          <span
            className={`text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0 ${STATUS_COLORS[match.status] ?? "bg-muted text-muted-foreground"}`}
          >
            {STATUS_LABELS[match.status] ?? match.status}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="size-3" />
            {formatMatchDate(match.starts_at)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-3" />
            {match.max_players} jug.
          </span>
        </div>
        {match.location && (
          <p className="text-xs text-muted-foreground mt-1.5 truncate">
            📍 {match.location}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function MisPartidosPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("organizados");

  const organizedQuery = useInfiniteQuery({
    queryKey: KEYS.myMatches(user?.id ?? "", "organized"),
    queryFn: ({ pageParam }) =>
      getOrganizedMatches(supabase, user!.id, { cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!user,
  });

  const participatingQuery = useInfiniteQuery({
    queryKey: KEYS.myMatches(user?.id ?? "", "participating"),
    queryFn: ({ pageParam }) =>
      getParticipatingMatches(supabase, user!.id, { cursor: pageParam, limit: 20 }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!user,
  });

  const organized = organizedQuery.data?.pages.flatMap((p) => p.data ?? []) ?? [];
  const participating = participatingQuery.data?.pages.flatMap((p) => p.data ?? []) ?? [];

  const isOrganizedTab = tab === "organizados";
  const activeQuery = isOrganizedTab ? organizedQuery : participatingQuery;
  const list: FeedMatch[] = isOrganizedTab ? organized : participating;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 pt-5 pb-2 max-w-2xl flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Mis Partidos</h1>
        <Link href="/matches/new">
          <Button size="sm" className="gap-1.5 rounded-xl">
            <Plus className="size-3.5" /> Crear
          </Button>
        </Link>
      </div>

      <div className="sticky top-14 z-40 bg-white dark:bg-zinc-900 border-b border-border/50 px-4 pb-3 pt-2 flex gap-2">
        <button
          onClick={() => setTab("organizados")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            tab === "organizados"
              ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Organizo ({organized.length})
        </button>
        <button
          onClick={() => setTab("participando")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
            tab === "participando"
              ? "bg-violet-600 text-white shadow-sm shadow-violet-500/30"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Participo ({participating.length})
        </button>
      </div>

      <main className="container mx-auto px-4 py-4 max-w-2xl">
        {activeQuery.isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <MatchCardSkeleton key={i} />
            ))}
          </div>
        ) : list.length === 0 && tab === "organizados" ? (
          <EmptyState
            title="No tenés partidos organizados"
            cta={{ label: "Crear partido", href: "/matches/new" }}
          />
        ) : list.length === 0 ? (
          <EmptyState
            title="No participás en ningún partido"
            cta={{ label: "Buscar partidos", href: "/feed" }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}

            <InfiniteScrollSentinel
              enabled={activeQuery.hasNextPage && !activeQuery.isFetchingNextPage}
              onIntersect={activeQuery.fetchNextPage}
            />
            {activeQuery.isFetchingNextPage && (
              <div className="py-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
