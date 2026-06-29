import type { TournamentRow } from "@/lib/tournaments/api";

const STATUS_LABELS: Record<TournamentRow["status"], string> = {
  borrador: "Borrador",
  abierto_inscripciones: "Abierto a inscripciones",
  cerrado_inscripciones: "Inscripciones cerradas",
  in_progress: "En curso",
  cancelado: "Cancelado",
  finalizado: "Finalizado",
};

const STATUS_STYLES: Record<TournamentRow["status"], string> = {
  borrador: "bg-muted text-muted-foreground",
  abierto_inscripciones: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  cerrado_inscripciones: "bg-amber-500/15 text-amber-700",
  in_progress: "bg-blue-500/15 text-blue-700",
  cancelado: "bg-destructive/15 text-destructive",
  finalizado: "bg-green-500/15 text-green-700",
};

interface Props {
  tournament: TournamentRow;
}

export function TournamentHeader({ tournament }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{tournament.name}</h1>
        <p className="text-muted-foreground mt-1">{tournament.location}</p>
      </div>
      <span
        className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${STATUS_STYLES[tournament.status]}`}
      >
        {STATUS_LABELS[tournament.status]}
      </span>
    </div>
  );
}
