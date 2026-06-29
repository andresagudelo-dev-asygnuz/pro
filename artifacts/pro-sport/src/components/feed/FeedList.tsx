import { useRef } from "react";
import { FeedMatchCard } from "./FeedMatchCard";
import type { FeedMatch } from "@/lib/feed/api";

interface FeedListProps {
  matches: FeedMatch[];
  isLoading?: boolean;
}

export function FeedList({ matches, isLoading }: FeedListProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse border border-border/40"
          />
        ))}
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">
          🏟️
        </div>
        <div>
          <p className="font-semibold text-foreground mb-1">No hay partidos disponibles</p>
          <p className="text-sm text-muted-foreground">
            Probá con otros filtros o volvé más tarde.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {matches.map((match) => (
        <FeedMatchCard key={match.id} match={match} />
      ))}
      {/* Infinite scroll sentinel — task 5.1 will wire IntersectionObserver here */}
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />
    </div>
  );
}
