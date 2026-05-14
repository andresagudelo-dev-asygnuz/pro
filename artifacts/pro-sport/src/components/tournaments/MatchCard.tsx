import { Button } from "@/components/ui/button";
import type { MatchWithNames } from "@/lib/tournaments/matches";

interface Props {
  match: MatchWithNames;
  isOwner: boolean;
  onRecordResult?: (match: MatchWithNames) => void;
}

const STATUS_PALETTE: Record<string, string> = {
  programado: "bg-muted text-muted-foreground",
  en_juego: "bg-amber-500/15 text-amber-600",
  finalizado: "bg-green-500/15 text-green-700",
  w_o: "bg-orange-500/15 text-orange-700",
  cancelado: "bg-destructive/15 text-destructive",
};

const STATUS_LABELS: Record<string, string> = {
  programado: "Programado",
  en_juego: "En juego",
  finalizado: "Finalizado",
  w_o: "W/O",
  cancelado: "Cancelado",
};

function homeName(match: MatchWithNames): string {
  return match.home_team_name ?? match.home_player_name ?? "TBD";
}

function awayName(match: MatchWithNames): string {
  return match.away_team_name ?? match.away_player_name ?? "TBD";
}

export function MatchCard({ match, isOwner, onRecordResult }: Props) {
  const canRecord =
    isOwner &&
    match.status !== "finalizado" &&
    match.status !== "w_o";
  const canEdit =
    isOwner &&
    (match.status === "finalizado" || match.status === "w_o");

  return (
    <div className="border border-border/60 rounded-2xl bg-white dark:bg-zinc-900 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-xs text-muted-foreground font-medium w-14 shrink-0">
          J{match.round}
          {match.group_code ? ` · ${match.group_code}` : ""}
        </div>
        <span className="font-semibold text-sm">{homeName(match)}</span>
        <div className="text-lg font-black tabular-nums text-violet-600 dark:text-violet-400">
          {match.home_score ?? "–"} : {match.away_score ?? "–"}
        </div>
        <span className="font-semibold text-sm">{awayName(match)}</span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_PALETTE[match.status] ?? "bg-muted text-muted-foreground"}`}
        >
          {STATUS_LABELS[match.status] ?? match.status}
        </span>

        {match.scheduled_at && (
          <span className="text-xs text-muted-foreground">
            {new Date(match.scheduled_at).toLocaleString("es-CO", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}

        {(canRecord || canEdit) && onRecordResult && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => onRecordResult(match)}
          >
            {canEdit ? "Editar" : "Cargar resultado"}
          </Button>
        )}
      </div>
    </div>
  );
}
