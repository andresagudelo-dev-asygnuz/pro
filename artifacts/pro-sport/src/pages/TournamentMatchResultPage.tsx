import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getTournamentById, type TournamentRow } from "@/lib/tournaments/api";
import {
  getMatchById, recordResult, listMatchEvents, addMatchEvent,
  type MatchRow, type MatchEventRow, type MatchEventType,
} from "@/lib/tournaments/matches";
import { listRegistrationsWithNames, type RegistrationWithNames } from "@/lib/tournaments/registrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/AppLayout";


const eventLabels: Record<MatchEventType, string> = {
  gol: "Gol", auto_gol: "Auto-gol", amarilla: "Amarilla", roja: "Roja", sustitucion: "Sustitución",
};

export default function TournamentMatchResultPage() {
  const { user } = useAuth();
  const { id, matchId } = useParams<{ id: string; matchId: string }>();

  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationWithNames[]>([]);
  const [events, setEvents] = useState<MatchEventRow[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [eventType, setEventType] = useState<MatchEventType>("gol");
  const [eventMinute, setEventMinute] = useState(0);
  const [eventSide, setEventSide] = useState<"home" | "away">("home");
  const [eventNotes, setEventNotes] = useState("");
  const [addingEvent, setAddingEvent] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: m }, { data: regs }, { data: evs }] = await Promise.all([
        getTournamentById(supabase, id),
        getMatchById(supabase, matchId),
        listRegistrationsWithNames(supabase, id),
        listMatchEvents(supabase, matchId),
      ]);
      if (!t || !m) { setError("Partido no encontrado"); setLoading(false); return; }
      const tRow = t as TournamentRow;
      const mRow = m as MatchRow;
      setTournament(tRow);
      setMatch(mRow);
      setRegistrations((regs ?? []) as RegistrationWithNames[]);
      setEvents((evs ?? []) as MatchEventRow[]);
      setIsOwner(!!user && user.id === tRow.owner_id);
      setHomeScore(mRow.home_score ?? 0);
      setAwayScore(mRow.away_score ?? 0);
      setLoading(false);
    })();
  }, [id, matchId]);

  const regLabel = (regId: string | null) => {
    if (!regId) return "TBD";
    const r = registrations.find((x) => x.id === regId);
    if (!r) return "Participante";
    if (r.team_id) return r.team_name ?? `Equipo`;
    if (r.user_id) return r.player_name ?? "Jugador";
    return "Participante";
  };

  async function handleRecord(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const res = await recordResult(supabase, { matchId, homeScore, awayScore, status: "finalizado" });
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    setMatch(res.data);
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAddingEvent(true);
    const res = await addMatchEvent(supabase, { matchId, eventType, minute: eventMinute, teamSide: eventSide, notes: eventNotes.trim() || null, playerId: null });
    setAddingEvent(false);
    if (res.error) { setError(res.error); return; }
    if (res.data) setEvents((prev) => [...prev, res.data!]);
    setEventNotes("");
  }

  if (loading) return <div className="container py-8 max-w-3xl mx-auto">Cargando…</div>;
  if (!tournament || !match) return (
    <div className="container py-8 max-w-3xl mx-auto">
      <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error ?? "Partido no encontrado"}</div>
    </div>
  );

  return (
    <AppLayout>
    <div className="container py-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {regLabel(match.home_registration_id)} vs {regLabel(match.away_registration_id)}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jornada {match.round}{match.group_code ? ` · Grupo ${match.group_code}` : ""} · {tournament.name}
          </p>
        </div>
        <Button variant="outline" asChild><Link href={`/tournaments/${id}/matches`}>Volver a partidos</Link></Button>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm">{error}</div>}

      <div className="border rounded-lg p-4 flex items-center justify-between gap-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Estado</div>
        <div className="text-sm font-medium">{match.status.replace(/_/g, " ")}</div>
      </div>

      {isOwner ? (
        <form onSubmit={handleRecord} className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold">Cargar / editar resultado</h2>
          <div className="flex items-end gap-3">
            <div>
              <Label htmlFor="home-score">{regLabel(match.home_registration_id)}</Label>
              <Input id="home-score" type="number" min={0} max={99} value={homeScore} onChange={(e) => setHomeScore(parseInt(e.target.value, 10) || 0)} className="w-24" />
            </div>
            <div className="text-lg font-bold pb-2">:</div>
            <div>
              <Label htmlFor="away-score">{regLabel(match.away_registration_id)}</Label>
              <Input id="away-score" type="number" min={0} max={99} value={awayScore} onChange={(e) => setAwayScore(parseInt(e.target.value, 10) || 0)} className="w-24" />
            </div>
          </div>
          <Button type="submit" disabled={submitting}>{submitting ? "Guardando…" : "Guardar resultado"}</Button>
          <p className="text-xs text-muted-foreground">Al guardar como <code>finalizado</code> la tabla de posiciones se recalcula automáticamente.</p>
        </form>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Marcador</div>
          <div className="text-3xl font-bold tabular-nums mt-1">{match.home_score ?? "–"} : {match.away_score ?? "–"}</div>
        </div>
      )}

      <section className="border rounded-lg p-4 space-y-4">
        <h2 className="font-semibold">Eventos del partido</h2>
        {events.length === 0 && <p className="text-sm text-muted-foreground">Sin eventos cargados todavía.</p>}
        <ul className="space-y-1 text-sm">
          {events.map((ev) => (
            <li key={ev.id} className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground w-10">{ev.minute != null ? `${ev.minute}'` : "—"}</span>
              <span className="font-medium">{eventLabels[ev.event_type]}</span>
              {ev.team_side && <span className="text-xs text-muted-foreground">({ev.team_side === "home" ? "local" : "visitante"})</span>}
              {ev.notes && <span className="text-xs text-muted-foreground">· {ev.notes}</span>}
            </li>
          ))}
        </ul>

        {isOwner && (
          <form onSubmit={handleAddEvent} className="grid grid-cols-1 sm:grid-cols-5 gap-2 border-t pt-4">
            <select className="border rounded-md p-2 bg-background" value={eventType} onChange={(e) => setEventType(e.target.value as MatchEventType)}>
              {(Object.keys(eventLabels) as MatchEventType[]).map((k) => <option key={k} value={k}>{eventLabels[k]}</option>)}
            </select>
            <Input type="number" min={0} max={130} placeholder="Minuto" value={eventMinute} onChange={(e) => setEventMinute(parseInt(e.target.value, 10) || 0)} />
            <select className="border rounded-md p-2 bg-background" value={eventSide} onChange={(e) => setEventSide(e.target.value as "home" | "away")}>
              <option value="home">Local</option>
              <option value="away">Visitante</option>
            </select>
            <Input type="text" placeholder="Notas (opcional)" value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} />
            <Button type="submit" disabled={addingEvent}>{addingEvent ? "…" : "Agregar"}</Button>
          </form>
        )}
      </section>
    </div>
    </AppLayout>
  );
}
