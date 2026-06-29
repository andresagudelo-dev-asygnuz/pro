import type { TournamentRow } from "@/lib/tournaments/api";

interface StatCardProps {
  label: string;
  value: string;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-1">{value}</div>
    </div>
  );
}

const FORMAT_LABELS: Record<TournamentRow["format"], string> = {
  liga: "Liga",
  eliminatoria: "Eliminatoria",
  fase_grupos_eliminatoria: "Grupos + Eliminatoria",
};

interface Props {
  tournament: TournamentRow;
  registeredCount: number;
}

export function TournamentStatsGrid({ tournament, registeredCount }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border rounded-2xl p-4 bg-white dark:bg-zinc-900 shadow-sm">
      <StatCard
        label="Formato"
        value={FORMAT_LABELS[tournament.format] ?? tournament.format.replace(/_/g, " ")}
      />
      <StatCard
        label="Cupos"
        value={`${registeredCount}/${tournament.slots}`}
      />
      <StatCard
        label="Inicio"
        value={new Date(tournament.start_date).toLocaleDateString("es-AR")}
      />
      <StatCard
        label="Fin"
        value={new Date(tournament.end_date).toLocaleDateString("es-AR")}
      />
    </div>
  );
}
