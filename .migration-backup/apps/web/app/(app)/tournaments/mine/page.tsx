import { createClient } from "@/lib/supabase/server";
import { getMyTournaments, type TournamentRow } from "@/lib/tournaments/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Mis Torneos | PRO",
};

export default async function MyTournamentsPage() {
  const supabase = await createClient();
  const { data: userAuth } = await supabase.auth.getUser();

  if (!userAuth.user) {
    redirect("/auth/login");
  }

  // TODO: Check if user is promoter in public.user_roles

  const { data: tournaments, error } = await getMyTournaments(supabase);

  return (
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Torneos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los torneos que organizas.
          </p>
        </div>
        <Button >
          <Link href="/tournaments/new">Crear Torneo</Link>
        </Button>
      </div>

      {error ? (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          Error al cargar tus torneos.
        </div>
      ) : !tournaments || tournaments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground mb-4">No has creado ningún torneo aún.</p>
          <Button  variant="outline">
            <Link href="/tournaments/new">Crear mi primer torneo</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tournaments.map((t: TournamentRow) => (
            <div key={t.id} className="border rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'borrador' ? 'bg-muted text-muted-foreground' : 'bg-green-100 text-green-800'}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{t.location}</p>
                <div className="text-xs text-muted-foreground mt-2">
                  {t.slots_filled}/{t.slots} inscritos
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="default" size="sm" className="w-full" >
                  <Link href={`/tournaments/${t.id}`}>Gestionar</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
