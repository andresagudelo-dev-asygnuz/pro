import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTournamentById, type TournamentRow } from "@/lib/tournaments/api";
import { listStandings } from "@/lib/tournaments/matches";
import {
  listRegistrations,
  type RegistrationRow,
} from "@/lib/tournaments/registrations";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Tabla de posiciones | PRO",
};

type PageProps = { params: Promise<{ id: string }> };

function displayRegistration(
  regId: string,
  registrations: RegistrationRow[],
): string {
  const r = registrations.find((x) => x.id === regId);
  if (!r) return regId.slice(0, 8);
  if (r.team_id) return `Equipo ${r.team_id.slice(0, 8)}`;
  if (r.user_id) return `Jugador ${r.user_id.slice(0, 8)}`;
  return regId.slice(0, 8);
}

export default async function StandingsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament } = await getTournamentById(supabase, id);
  if (!tournament) notFound();
  const t = tournament as TournamentRow;

  const { data: userAuth } = await supabase.auth.getUser();
  const { data: standings, error } = await listStandings(supabase, t.id);

  const { data: regs } = userAuth.user
    ? await listRegistrations(supabase, t.id)
    : { data: [] as RegistrationRow[] };
  const registrations = (regs ?? []) as RegistrationRow[];

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Tabla — {t.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Posiciones calculadas sobre partidos finalizados. V=3pts, E=1pt,
            D=0pts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Link href={`/tournaments/${t.id}`}>Volver</Link>
          </Button>
          <Button variant="outline">
            <Link href={`/tournaments/${t.id}/matches`}>Ver partidos</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm">
          {error}
        </div>
      )}

      {(standings ?? []).length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Todavía no hay resultados cargados en este torneo.
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
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
              {(standings ?? []).map((row, idx) => (
                <tr key={row.registration_id} className="border-t">
                  <td className="p-3 text-muted-foreground">{idx + 1}</td>
                  <td className="p-3 font-medium">
                    {displayRegistration(
                      row.registration_id,
                      registrations,
                    )}
                  </td>
                  <td className="text-right p-2 tabular-nums">
                    {row.played}
                  </td>
                  <td className="text-right p-2 tabular-nums">{row.wins}</td>
                  <td className="text-right p-2 tabular-nums">{row.draws}</td>
                  <td className="text-right p-2 tabular-nums">{row.losses}</td>
                  <td className="text-right p-2 tabular-nums">
                    {row.goals_for}
                  </td>
                  <td className="text-right p-2 tabular-nums">
                    {row.goals_against}
                  </td>
                  <td className="text-right p-2 tabular-nums">
                    {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
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
  );
}
