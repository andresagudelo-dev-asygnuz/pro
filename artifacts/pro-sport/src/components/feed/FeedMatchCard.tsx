import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, MapPin, Users } from "lucide-react";
import { formatMatchDate } from "@/lib/format";
import { initialsFromName } from "@/lib/format";
import type { FeedMatch } from "@/lib/feed/api";

function getStatusLabel(status: string): string {
  switch (status) {
    case "open": return "Abierto";
    case "full": return "Completo";
    case "in_progress": return "En curso";
    case "completed": return "Finalizado";
    case "cancelled": return "Cancelado";
    default: return status;
  }
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "open": return "default";
    case "full": return "secondary";
    case "cancelled": return "destructive";
    default: return "outline";
  }
}

interface FeedMatchCardProps {
  match: FeedMatch;
}

export function FeedMatchCard({ match }: FeedMatchCardProps) {
  const spotsLeft = match.max_players - match.participants_count;

  return (
    <Link href={`/matches/${match.id}`}>
      <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow border border-border/60 rounded-2xl">
        <div className="flex items-start gap-3">
          {/* Sport icon */}
          <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xl shrink-0">
            {match.sport?.name?.toLowerCase().includes("fut") ? "⚽"
              : match.sport?.name?.toLowerCase().includes("pad") ? "🎾"
              : match.sport?.name?.toLowerCase().includes("basket") ? "🏀"
              : match.sport?.name?.toLowerCase().includes("tenis") ? "🎾"
              : match.sport?.name?.toLowerCase().includes("volei") ? "🏐"
              : "🏃"}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium truncate">
                  {match.sport?.name ?? "Deporte"} · {match.city}
                </p>
                <h3 className="font-bold text-sm leading-tight text-zinc-900 dark:text-white truncate">
                  {match.title}
                </h3>
              </div>
              <Badge variant={getStatusVariant(match.status)} className="shrink-0 text-[10px] px-2 py-0.5">
                {getStatusLabel(match.status)}
              </Badge>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
              <Clock className="size-3 shrink-0" />
              <span>{formatMatchDate(match.starts_at)}</span>
            </div>

            {/* Location */}
            {match.location && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{match.location}</span>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-2.5">
              {/* Organizer */}
              {match.organizer && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="size-5">
                    {match.organizer.avatar_url && (
                      <AvatarImage src={match.organizer.avatar_url} alt={match.organizer.full_name ?? ""} />
                    )}
                    <AvatarFallback className="text-[9px]">
                      {initialsFromName(match.organizer.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                    {match.organizer.full_name ?? "Organizador"}
                  </span>
                </div>
              )}

              {/* Players count */}
              <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Users className="size-3" />
                <span>
                  {match.participants_count}/{match.max_players}
                  {spotsLeft > 0 && spotsLeft <= 3 && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">
                      ({spotsLeft} {spotsLeft === 1 ? "cupo" : "cupos"})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
