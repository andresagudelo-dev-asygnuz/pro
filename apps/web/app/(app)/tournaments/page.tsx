import { createClient } from "@/lib/supabase/server";
import { getTournaments, type TournamentRow } from "@/lib/tournaments/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Torneos | PRO",
};

export default async function TournamentsPage() {
  const supabase = await createClient();
  const { data: tournaments, error } = await getTournaments(supabase);

  // Consider public ones and not drafts if it's public listing
  // In a real scenario you filter by status 'abierto_inscripciones', etc.
  const publicTournaments = tournaments?.filter(t => t.status !== "borrador") || [];

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Torneos Activos</h1>
          <p className="text-muted-foreground mt-1">
            Encuentra torneos en tu ciudad y compite al máximo nivel.
          </p>
        </div>
        <Button >
          <Link href="/tournaments/mine">Mis Torneos (Promotor)</Link>
        </Button>
      </div>

      {error ? (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          Error al cargar los torneos.
        </div>
      ) : publicTournaments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">No hay torneos disponibles en este momento.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {publicTournaments.map((t: TournamentRow) => (
            <div key={t.id} className="border rounded-lg p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-lg">{t.name}</h3>
                <p className="text-sm text-muted-foreground">{t.location}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {t.format}
                  </span>
                  <span className="text-xs bg-secondary/20 text-secondary-foreground px-2 py-1 rounded-full">
                    {t.slots_filled}/{t.slots} cupos
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span>Inicio: {new Date(t.start_date).toLocaleDateString()}</span>
                <Button variant="outline" size="sm" >
                  <Link href={`/tournaments/${t.id}`}>Ver detalles</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
