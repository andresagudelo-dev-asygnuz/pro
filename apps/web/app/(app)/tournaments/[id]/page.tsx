import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTournamentById, type TournamentRow } from "@/lib/tournaments/api";
import {
  listRegistrations,
  type RegistrationRow,
} from "@/lib/tournaments/registrations";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Detalle del torneo | PRO",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function TournamentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournament, error } = await getTournamentById(supabase, id);

  if (error) {
    return (
      <div className="container py-8 max-w-3xl mx-auto">
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          Error al cargar el torneo.
        </div>
      </div>
    );
  }

  if (!tournament) notFound();
  const t = tournament as TournamentRow;

  const { data: userAuth } = await supabase.auth.getUser();
  const isOwner = !!userAuth.user && userAuth.user.id === t.owner_id;

  // Solo listamos registrations si el viewer tiene algún rol (RLS ya filtra).
  const { data: registrations } = userAuth.user
    ? await listRegistrations(supabase, t.id)
    : { data: [] as RegistrationRow[] };

  const confirmed = (registrations ?? []).filter(
    (r) => r.status === "confirmada",
  );
  const isOpen = t.status === "abierto_inscripciones";
  const hasSlots = t.slots_filled < t.slots;

  return (
    <div className="container py-8 max-w-3xl mx-auto space-y-6">
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
        <Stat label="Inicio" value={new Date(t.start_date).toLocaleDateString()} />
        <Stat label="Fin" value={new Date(t.end_date).toLocaleDateString()} />
      </div>

      <div className="flex flex-wrap gap-3">
        {isOwner && (
          <Button variant="outline">
            <Link href={`/tournaments/${t.id}/registrations`}>
              Ver inscripciones ({confirmed.length})
            </Link>
          </Button>
        )}

        {!isOwner && isOpen && hasSlots && userAuth.user && (
          <Button>
            <Link href={`/tournaments/${t.id}/register`}>Inscribirme</Link>
          </Button>
        )}

        {!isOpen && (
          <span className="text-sm text-muted-foreground">
            Este torneo no está abierto a inscripciones.
          </span>
        )}

        {isOpen && !hasSlots && (
          <span className="text-sm text-muted-foreground">
            Cupos agotados.
          </span>
        )}

        {!userAuth.user && isOpen && (
          <Button>
            <Link href="/auth/login">Ingresá para inscribirte</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-semibold mt-1">{value}</div>
    </div>
  );
}
