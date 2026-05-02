import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getMyTournaments, type TournamentRow } from "@/lib/tournaments/api";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";

const supabase = createClient();

export default function MyTournamentsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error: err } = await getMyTournaments(supabase, user.id);
      if (err) setError(err);
      else setTournaments((data ?? []) as TournamentRow[]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center p-12 text-muted-foreground">Cargando…</div>;

  return (
    <AppLayout>
    <div className="container py-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Torneos</h1>
          <p className="text-muted-foreground mt-1">Gestioná los torneos que organizás.</p>
        </div>
        <Button asChild>
          <Link href="/tournaments/new">Crear Torneo</Link>
        </Button>
      </div>

      {error ? (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">Error al cargar tus torneos.</div>
      ) : tournaments.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground mb-4">No creaste ningún torneo aún.</p>
          <Button variant="outline" asChild>
            <Link href="/tournaments/new">Crear mi primer torneo</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tournaments.map((t) => (
            <div key={t.id} className="border rounded-lg p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${t.status === "borrador" ? "bg-muted text-muted-foreground" : "bg-green-100 text-green-800"}`}>
                    {t.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{t.location}</p>
                <div className="text-xs text-muted-foreground mt-2">{t.slots_filled}/{t.slots} inscritos</div>
              </div>
              <div className="mt-4">
                <Button variant="default" size="sm" className="w-full" asChild>
                  <Link href={`/tournaments/${t.id}`}>Gestionar</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </AppLayout>
  );
}
