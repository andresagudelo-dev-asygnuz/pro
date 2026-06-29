import { Link, useParams } from "wouter";
import { useTournamentDetail } from "@/hooks/useTournamentDetail";
import { useTournamentMatches } from "@/hooks/useTournamentMatches";
import { listRegistrationsWithNames } from "@/lib/tournaments/registrations";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export default function TournamentStandingsPage() {
  const { id } = useParams<{ id: string }>();
  const { tournament } = useTournamentDetail(id);
  const { standings, isLoading, error } = useTournamentMatches(id);

  const regsQuery = useQuery({
    queryKey: ["tournament", id, "registrations-with-names"],
    queryFn: async () => {
      const { data, error: err } = await listRegistrationsWithNames(supabase, id);
      if (err) throw new Error(err);
      return data ?? [];
    },
    enabled: !!id,
  });

  const registrations = regsQuery.data ?? [];

  function resolveParticipantName(registrationId: string): string {
    const reg = registrations.find((r) => r.id === registrationId);
    if (!reg) return registrationId.slice(0, 8);
    return reg.team_name ?? reg.player_name ?? "TBD";
  }

  if (isLoading || regsQuery.isLoading) {
    return (
      <>
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="container py-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Tabla{tournament ? ` — ${tournament.name}` : ""}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Posiciones: V=3pts, E=1pt, D=0pts.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href={`/tournaments/${id}`}>Volver</Link>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href={`/tournaments/${id}/matches`}>Ver partidos</Link>
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {standings.length === 0 ? (
          <div className="border border-border/60 rounded-2xl p-8 text-center bg-white dark:bg-zinc-900 shadow-sm text-muted-foreground">
            Todavía no hay resultados cargados en este torneo.
          </div>
        ) : (
          <div className="border border-border/60 rounded-2xl overflow-x-auto bg-white dark:bg-zinc-900 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Participante</th>
                  <th className="text-right p-2 tabular-nums">PJ</th>
                  <th className="text-right p-2 tabular-nums">G</th>
                  <th className="text-right p-2 tabular-nums">E</th>
                  <th className="text-right p-2 tabular-nums">P</th>
                  <th className="text-right p-2 tabular-nums">GF</th>
                  <th className="text-right p-2 tabular-nums">GC</th>
                  <th className="text-right p-2 tabular-nums">DG</th>
                  <th className="text-right p-3 tabular-nums font-bold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, idx) => (
                  <tr key={row.registration_id} className="border-t">
                    <td className="p-3 text-muted-foreground">{idx + 1}</td>
                    <td className="p-3 font-medium">
                      {resolveParticipantName(row.registration_id)}
                    </td>
                    <td className="text-right p-2 tabular-nums">{row.played}</td>
                    <td className="text-right p-2 tabular-nums">{row.wins}</td>
                    <td className="text-right p-2 tabular-nums">{row.draws}</td>
                    <td className="text-right p-2 tabular-nums">{row.losses}</td>
                    <td className="text-right p-2 tabular-nums">{row.goals_for}</td>
                    <td className="text-right p-2 tabular-nums">{row.goals_against}</td>
                    <td className="text-right p-2 tabular-nums">
                      {row.goal_difference > 0
                        ? `+${row.goal_difference}`
                        : row.goal_difference}
                    </td>
                    <td className="text-right p-3 tabular-nums font-bold">
                      {row.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
