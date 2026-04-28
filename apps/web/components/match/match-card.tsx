import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatMatchDate } from "@/lib/format";
import type { Match, Sport } from "@/lib/types/db";

type MatchCardProps = {
  match: Match;
  sport: Pick<Sport, "id" | "name" | "icon"> | null;
  joined: number;
  isJoined: boolean;
};

export function MatchCard({ match, sport, joined, isJoined }: MatchCardProps) {
  const full = joined >= match.max_players;
  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex flex-col gap-3 rounded-xl border bg-background p-4 shadow-sm transition-colors hover:border-foreground/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{sport?.icon}</span>
            <span>{sport?.name ?? match.sport_id}</span>
            <span>·</span>
            <span>{match.city}</span>
          </div>
          <h3 className="text-base font-medium leading-tight text-foreground">
            {match.title}
          </h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isJoined ? (
            <Badge variant="secondary">Estás dentro</Badge>
          ) : full ? (
            <Badge variant="outline">Completo</Badge>
          ) : null}
          {match.skill_level ? (
            <span className="text-xs capitalize text-muted-foreground">
              {match.skill_level}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{formatMatchDate(match.starts_at)}</span>
        <span>
          {joined}/{match.max_players} jugadores
        </span>
      </div>

      <p className="line-clamp-1 text-sm text-muted-foreground">
        📍 {match.location}
      </p>
    </Link>
  );
}
