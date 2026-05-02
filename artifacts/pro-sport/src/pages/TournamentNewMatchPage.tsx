import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { getTournamentById, type TournamentRow } from "@/lib/tournaments/api";
import { listRegistrations, type RegistrationRow } from "@/lib/tournaments/registrations";
import { createMatch } from "@/lib/tournaments/matches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/AppLayout";

const supabase = createClient();

export default function TournamentNewMatchPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [round, setRound] = useState(1);
  const [groupCode, setGroupCode] = useState("");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { navigate("/login"); return; }

      const { data: t } = await getTournamentById(supabase, id);
      if (!t) { setError("Torneo no encontrado"); setLoading(false); return; }
      const tRow = t as TournamentRow;

      if (tRow.owner_id !== auth.user.id) {
        setError("Solo el promotor del torneo puede crear partidos.");
        setTournament(tRow);
        setLoading(false);
        return;
      }
      setTournament(tRow);

      const { data: regs } = await listRegistrations(supabase, id);
      setRegistrations(((regs ?? []) as RegistrationRow[]).filter((r) => r.status === "confirmada"));
      setLoading(false);
    })();
  }, [id, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!home || !away) { setError("Seleccioná local y visitante."); return; }
    setSubmitting(true);
    const res = await createMatch(supabase, {
      tournamentId: id,
      round,
      groupCode: groupCode.trim() || null,
      fixtureOrder: null,
      homeRegistrationId: home,
      awayRegistrationId: away,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      venue: venue.trim() || null,
    });
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    navigate(`/tournaments/${id}/matches`);
  }

  const regLabel = (r: RegistrationRow) =>
    r.team_id ? `Equipo ${r.team_id.slice(0, 8)}` : r.user_id ? `Jugador ${r.user_id.slice(0, 8)}` : r.id.slice(0, 8);

  if (loading) return <div className="container py-8 max-w-2xl mx-auto">Cargando…</div>;
  if (!tournament) return (
    <div className="container py-8 max-w-2xl mx-auto">
      <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error ?? "Torneo no encontrado"}</div>
    </div>
  );

  return (
    <AppLayout>
    <div className="container py-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo partido — {tournament.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">Agregá un encuentro al fixture.</p>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm">{error}</div>}

      {registrations.length < 2 ? (
        <div className="border rounded-lg p-4 text-sm text-muted-foreground">
          Necesitás al menos 2 inscripciones confirmadas antes de crear partidos.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="round">Jornada</Label>
              <Input id="round" type="number" min={1} value={round} onChange={(e) => setRound(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div>
              <Label htmlFor="group">Grupo (opcional)</Label>
              <Input id="group" type="text" placeholder="A, B, …" value={groupCode} onChange={(e) => setGroupCode(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="home">Local</Label>
            <select id="home" className="w-full border rounded-md p-2 bg-background" value={home} onChange={(e) => setHome(e.target.value)} required>
              <option value="">Seleccionar…</option>
              {registrations.map((r) => <option key={r.id} value={r.id}>{regLabel(r)}</option>)}
            </select>
          </div>

          <div>
            <Label htmlFor="away">Visitante</Label>
            <select id="away" className="w-full border rounded-md p-2 bg-background" value={away} onChange={(e) => setAway(e.target.value)} required>
              <option value="">Seleccionar…</option>
              {registrations.filter((r) => r.id !== home).map((r) => <option key={r.id} value={r.id}>{regLabel(r)}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduled">Fecha y hora (opcional)</Label>
              <Input id="scheduled" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="venue">Sede (opcional)</Label>
              <Input id="venue" type="text" value={venue} onChange={(e) => setVenue(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>{submitting ? "Guardando…" : "Crear partido"}</Button>
            <Button variant="outline" type="button" asChild><Link href={`/tournaments/${id}/matches`}>Cancelar</Link></Button>
          </div>
        </form>
      )}
    </div>
    </AppLayout>
  );
}
