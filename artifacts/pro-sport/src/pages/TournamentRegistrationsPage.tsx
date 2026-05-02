import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { getTournamentById, type TournamentRow } from "@/lib/tournaments/api";
import { listRegistrations, type RegistrationRow } from "@/lib/tournaments/registrations";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";

const supabase = createClient();

function Section({ title, rows }: { title: string; rows: RegistrationRow[] }) {
  return (
    <section className="border rounded-lg">
      <header className="px-4 py-3 border-b"><h2 className="font-semibold">{title}</h2></header>
      {rows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">Sin inscripciones en esta categoría.</div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className="px-4 py-3 text-sm flex justify-between gap-4">
              <div>
                <div className="font-medium">
                  {r.team_id ? `Equipo · ${r.team_id.slice(0, 8)}` : `Solo · ${r.user_id?.slice(0, 8)}`}
                </div>
                <div className="text-xs text-muted-foreground">Registrada {new Date(r.created_at).toLocaleString("es-AR")}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function TournamentRegistrationsPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { navigate("/login"); return; }

      const { data: t } = await getTournamentById(supabase, id);
      if (!t) { setError("Torneo no encontrado"); setLoading(false); return; }
      const tRow = t as TournamentRow;

      if (tRow.owner_id !== auth.user.id) {
        setError("Solo el promotor del torneo puede ver las inscripciones.");
        setTournament(tRow);
        setLoading(false);
        return;
      }
      setTournament(tRow);

      const { data: regs, error: err } = await listRegistrations(supabase, id);
      if (err) setError(err);
      setRegistrations((regs ?? []) as RegistrationRow[]);
      setLoading(false);
    })();
  }, [id, navigate]);

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;
  if (!tournament) return <div className="container py-8 max-w-4xl mx-auto"><div className="bg-destructive/15 text-destructive p-4 rounded-md">{error ?? "Torneo no encontrado"}</div></div>;

  const confirmed = registrations.filter((r) => r.status === "confirmada");
  const waiting = registrations.filter((r) => r.status === "lista_espera");
  const cancelled = registrations.filter((r) => r.status === "cancelada");

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inscripciones — {tournament.name}</h1>
          <p className="text-muted-foreground mt-1">{tournament.slots_filled}/{tournament.slots} cupos ocupados.</p>
        </div>
        <Button variant="outline" asChild><Link href={`/tournaments/${id}`}>Volver al torneo</Link></Button>
      </div>

      {error && <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error}</div>}

      <Section title={`Confirmadas (${confirmed.length})`} rows={confirmed} />
      <Section title={`Lista de espera (${waiting.length})`} rows={waiting} />
      <Section title={`Canceladas (${cancelled.length})`} rows={cancelled} />
    </div>
  );
}
