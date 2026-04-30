import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTournamentById, type TournamentRow } from "@/lib/tournaments/api";
import { listMatches, type MatchRow } from "@/lib/tournaments/matches";
import {
  listRegistrations,
  type RegistrationRow,
} from "@/lib/tournaments/registrations";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Partidos del torneo | PRO",
};

type PageProps = { params: Promise<{ id: string }> };

function displayRegistration(
  regId: string | null,
  registrations: RegistrationRow[],
): string {
  if (!regId) return "TBD";
  const r = registrations.find((x) => x.id === regId);
  if (!r) return regId.slice(0, 8);
  if (r.team_id) return `Equipo ${r.team_id.slice(0, 6)}`;
  if (r.user_id) return `Jugador ${r.user_id.slice(0, 6)}`;
  return regId.slice(0, 8);
}

function statusBadge(status: MatchRow["status"]) {
  const palette: Record<MatchRow["status"], string> = {
    programado: "bg-muted text-muted-foreground",
    en_juego: "bg-amber-500/15 text-amber-600",
    finalizado: "bg-green-500/15 text-green-700",
    w_o: "bg-orange-500/15 text-orange-700",
    cancelado: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${palette[status]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default async function TournamentMatchesPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament } = await getTournamentById(supabase, id);
  if (!tournament) notFound();
  const t = tournament as TournamentRow;

  const { data: userAuth } = await supabase.auth.getUser();
  const isOwner = !!userAuth.user && userAuth.user.id === t.owner_id;

  const { data: matches, error: matchesErr } = await listMatches(supabase, t.id);

  // Usamos listRegistrations para mostrar nombres; si no tiene rol, rows = [].
  const { data: registrations } = userAuth.user
    ? await listRegistrations(supabase, t.id)
    : { data: [] as RegistrationRow[] };
  const regs = (registrations ?? []) as RegistrationRow[];

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Partidos — {t.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Fixture y resultados del torneo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Link href={`/tournaments/${t.id}`}>Volver</Link>
          </Button>
          <Button variant="outline">
            <Link href={`/tournaments/${t.id}/standings`}>Ver tabla</Link>
          </Button>
          {isOwner && (
            <Button>
              <Link href={`/tournaments/${t.id}/matches/new`}>Nuevo partido</Link>
            </Button>
          )}
        </div>
      </div>

      {matchesErr && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm">
          {matchesErr}
        </div>
      )}

      {(matches ?? []).length === 0 && !matchesErr && (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Todavía no hay partidos cargados en este torneo.
          {isOwner && (
            <div className="mt-3">
              <Button>
                <Link href={`/tournaments/${t.id}/matches/new`}>
                  Crear el primer partido
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {(matches ?? []).map((m) => (
          <div
            key={m.id}
            className="border rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap"
          >
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground w-16">
                J{m.round}
                {m.group_code ? ` · ${m.group_code}` : ""}
              </div>
              <div className="font-medium">
                {displayRegistration(m.home_registration_id, regs)}
              </div>
              <div className="text-lg font-bold tabular-nums">
                {m.home_score ?? "–"} : {m.away_score ?? "–"}
              </div>
              <div className="font-medium">
                {displayRegistration(m.away_registration_id, regs)}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {statusBadge(m.status)}
              {m.scheduled_at && (
                <span className="text-xs text-muted-foreground">
                  {new Date(m.scheduled_at).toLocaleString()}
                </span>
              )}
              {isOwner && (
                <Button variant="outline" size="sm">
                  <Link href={`/tournaments/${t.id}/matches/${m.id}`}>
                    {m.status === "finalizado" ? "Editar" : "Cargar resultado"}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
