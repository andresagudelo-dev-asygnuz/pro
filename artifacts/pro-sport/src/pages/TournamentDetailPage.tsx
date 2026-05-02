import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getTournamentById, type TournamentRow } from "@/lib/tournaments/api";
import { listRegistrations, type RegistrationRow } from "@/lib/tournaments/registrations";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";

const supabase = createClient();

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-1">{value}</div>
    </div>
  );
}

export default function TournamentDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await getTournamentById(supabase, id);
      if (err) { setError(err); setLoading(false); return; }
      if (!data) { setError("Torneo no encontrado"); setLoading(false); return; }
      setTournament(data as TournamentRow);

      if (user) {
        const { data: regs } = await listRegistrations(supabase, id);
        setRegistrations((regs ?? []) as RegistrationRow[]);
      }
      setLoading(false);
    })();
  }, [id, user]);

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;
  if (error || !tournament) {
    return (
      <div className="container py-8 max-w-3xl mx-auto">
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">{error ?? "Torneo no encontrado"}</div>
      </div>
    );
  }

  const t = tournament;
  const isOwner = !!user && user.id === t.owner_id;
  const confirmed = registrations.filter((r) => r.status === "confirmada");
  const isOpen = t.status === "abierto_inscripciones";
  const hasSlots = t.slots_filled < t.slots;

  return (
    <AppLayout>
      <div className="py-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t.name}</h1>
            <p className="text-muted-foreground mt-1">{t.location}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
            {t.status.replace(/_/g, " ")}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border rounded-lg p-4">
          <Stat label="Formato" value={t.format.replace(/_/g, " ")} />
          <Stat label="Cupos" value={`${t.slots_filled}/${t.slots}`} />
          <Stat label="Inicio" value={new Date(t.start_date).toLocaleDateString("es-AR")} />
          <Stat label="Fin" value={new Date(t.end_date).toLocaleDateString("es-AR")} />
        </div>

        <div className="flex flex-wrap gap-3">
          {isOwner && (
            <Button variant="outline" asChild>
              <Link href={`/tournaments/${t.id}/registrations`}>Ver inscripciones ({confirmed.length})</Link>
            </Button>
          )}

          <Button variant="outline" asChild>
            <Link href={`/tournaments/${t.id}/matches`}>Partidos</Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href={`/tournaments/${t.id}/standings`}>Tabla de posiciones</Link>
          </Button>

          {!isOwner && isOpen && hasSlots && user && (
            <Button asChild>
              <Link href={`/tournaments/${t.id}/register`}>Inscribirme</Link>
            </Button>
          )}

          {!isOpen && (
            <span className="text-sm text-muted-foreground">Este torneo no está abierto a inscripciones.</span>
          )}

          {isOpen && !hasSlots && (
            <span className="text-sm text-muted-foreground">Cupos agotados.</span>
          )}

          {!user && isOpen && (
            <Button asChild>
              <Link href="/login">Ingresá para inscribirte</Link>
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
