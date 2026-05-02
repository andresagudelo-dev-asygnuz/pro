import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { getTournamentById, type TournamentRow } from "@/lib/tournaments/api";
import { listMatches, type MatchRow, type MatchStatus } from "@/lib/tournaments/matches";
import { listRegistrations, type RegistrationRow } from "@/lib/tournaments/registrations";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";

const supabase = createClient();

function statusBadge(status: MatchStatus) {
  const palette: Record<MatchStatus, string> = {
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

function displayRegistration(regId: string | null, registrations: RegistrationRow[]): string {
  if (!regId) return "TBD";
  const r = registrations.find((x) => x.id === regId);
  if (!r) return regId.slice(0, 8);
  if (r.team_id) return `Equipo ${r.team_id.slice(0, 6)}`;
  if (r.user_id) return `Jugador ${r.user_id.slice(0, 6)}`;
  return regId.slice(0, 8);
}

export default function TournamentMatchesPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data: t } = await getTournamentById(supabase, id);
      if (!t) { setError("Torneo no encontrado"); setLoading(false); return; }
      const tRow = t as TournamentRow;
      setTournament(tRow);
      setIsOwner(!!auth.user && auth.user.id === tRow.owner_id);

      const [{ data: ms, error: matchErr }, { data: regs }] = await Promise.all([
        listMatches(supabase, id),
        auth.user ? listRegistrations(supabase, id) : { data: [] as RegistrationRow[] },
      ]);
      if (matchErr) setError(matchErr);
      setMatches(ms ?? []);
      setRegistrations((regs ?? []) as RegistrationRow[]);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;
  if (!tournament) return <div className="container py-8 max-w-4xl mx-auto"><div className="bg-destructive/15 text-destructive p-4 rounded-md">{error ?? "Torneo no encontrado"}</div></div>;

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partidos — {tournament.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Fixture y resultados del torneo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href={`/tournaments/${id}`}>Volver</Link></Button>
          <Button variant="outline" asChild><Link href={`/tournaments/${id}/standings`}>Ver tabla</Link></Button>
          {isOwner && <Button asChild><Link href={`/tournaments/${id}/matches/new`}>Nuevo partido</Link></Button>}
        </div>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm">{error}</div>}

      {matches.length === 0 && !error && (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Todavía no hay partidos cargados en este torneo.
          {isOwner && (
            <div className="mt-3">
              <Button asChild><Link href={`/tournaments/${id}/matches/new`}>Crear el primer partido</Link></Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {matches.map((m) => (
          <div key={m.id} className="border rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="text-xs text-muted-foreground w-16">J{m.round}{m.group_code ? ` · ${m.group_code}` : ""}</div>
              <div className="font-medium">{displayRegistration(m.home_registration_id, registrations)}</div>
              <div className="text-lg font-bold tabular-nums">{m.home_score ?? "–"} : {m.away_score ?? "–"}</div>
              <div className="font-medium">{displayRegistration(m.away_registration_id, registrations)}</div>
            </div>
            <div className="flex items-center gap-3">
              {statusBadge(m.status)}
              {m.scheduled_at && <span className="text-xs text-muted-foreground">{new Date(m.scheduled_at).toLocaleString("es-AR")}</span>}
              {isOwner && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/tournaments/${id}/matches/${m.id}`}>{m.status === "finalizado" ? "Editar" : "Cargar resultado"}</Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
