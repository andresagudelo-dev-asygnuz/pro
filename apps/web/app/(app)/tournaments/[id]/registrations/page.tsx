import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTournamentById, type TournamentRow } from "@/lib/tournaments/api";
import {
  listRegistrations,
  type RegistrationRow,
} from "@/lib/tournaments/registrations";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Inscripciones al torneo | PRO",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function TournamentRegistrationsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userAuth } = await supabase.auth.getUser();
  if (!userAuth.user) redirect("/auth/login");

  const { data: tournament } = await getTournamentById(supabase, id);
  if (!tournament) notFound();
  const t = tournament as TournamentRow;

  if (t.owner_id !== userAuth.user.id) {
    return (
      <div className="container py-8 max-w-3xl mx-auto">
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          Solo el promotor del torneo puede ver las inscripciones.
        </div>
      </div>
    );
  }

  const { data: registrations, error } = await listRegistrations(supabase, t.id);
  const rows = (registrations ?? []) as RegistrationRow[];
  const confirmed = rows.filter((r) => r.status === "confirmada");
  const cancelled = rows.filter((r) => r.status === "cancelada");
  const waiting = rows.filter((r) => r.status === "lista_espera");

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Inscripciones — {t.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t.slots_filled}/{t.slots} cupos ocupados.
          </p>
        </div>
        <Button variant="outline">
          <Link href={`/tournaments/${t.id}`}>Volver al torneo</Link>
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          Error al cargar las inscripciones.
        </div>
      )}

      <Section title={`Confirmadas (${confirmed.length})`} rows={confirmed} />
      <Section title={`Lista de espera (${waiting.length})`} rows={waiting} />
      <Section title={`Canceladas (${cancelled.length})`} rows={cancelled} />
    </div>
  );
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: RegistrationRow[];
}) {
  return (
    <section className="border rounded-lg">
      <header className="px-4 py-3 border-b">
        <h2 className="font-semibold">{title}</h2>
      </header>
      {rows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">
          Sin inscripciones en esta categoría.
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => (
            <li
              key={r.id}
              className="px-4 py-3 text-sm flex justify-between gap-4"
            >
              <div>
                <div className="font-medium">
                  {r.team_id ? `Equipo · ${r.team_id.slice(0, 8)}` : `Solo · ${r.user_id?.slice(0, 8)}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  Registrada {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
