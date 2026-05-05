import { useEffect, useState } from "react";
import { Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { getMyTournaments, getRegisteredTournaments, type TournamentRow } from "@/lib/tournaments/api";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { Trophy, Plus } from "lucide-react";

const supabase = createClient();

const STATUS_LABELS: Record<string, string> = {
  borrador: "Borrador",
  abierto_inscripciones: "Abierto",
  cerrado_inscripciones: "Cerrado",
  cancelado: "Cancelado",
  finalizado: "Finalizado",
};

function TournamentCard({ t, actionLabel, actionHref }: { t: TournamentRow; actionLabel: string; actionHref: string }) {
  return (
    <div className="border rounded-lg p-5 flex flex-col justify-between gap-4 bg-white dark:bg-zinc-900">
      <div>
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-semibold text-lg leading-tight">{t.name}</h3>
          <span className={`shrink-0 text-xs px-2 py-1 rounded-full ${
            t.status === "borrador" ? "bg-muted text-muted-foreground" :
            t.status === "abierto_inscripciones" ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300" :
            "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
          }`}>
            {STATUS_LABELS[t.status] ?? t.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">📍 {t.location}</p>
        <p className="text-xs text-muted-foreground mt-1">{t.slots_filled}/{t.slots} inscritos</p>
      </div>
      <Button variant="default" size="sm" className="w-full" asChild>
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}

export default function MyTournamentsPage() {
  const { user, roles } = useAuth();
  const isPromoter = roles?.is_promoter ?? false;

  const [ownedTournaments, setOwnedTournaments] = useState<TournamentRow[]>([]);
  const [registeredTournaments, setRegisteredTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownedError, setOwnedError] = useState<string | null>(null);
  const [registeredError, setRegisteredError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const fetches: Promise<void>[] = [];

    if (isPromoter) {
      fetches.push(
        getMyTournaments(supabase, user.id).then(({ data, error }) => {
          if (error) setOwnedError(error);
          else setOwnedTournaments((data ?? []) as TournamentRow[]);
        }),
      );
    }

    fetches.push(
      getRegisteredTournaments(supabase, user.id).then(({ data, error }) => {
        if (error) setRegisteredError(error);
        else setRegisteredTournaments((data ?? []) as TournamentRow[]);
      }),
    );

    Promise.all(fetches).finally(() => setLoading(false));
  }, [user, isPromoter]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8 max-w-4xl mx-auto space-y-10">

        {/* Promotor section: torneos organizados */}
        {isPromoter && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Torneos que organizás</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Gestioná los torneos que creaste como promotor.</p>
              </div>
              <Button asChild>
                <Link href="/tournaments/new">
                  <Plus className="size-4 mr-1" /> Crear Torneo
                </Link>
              </Button>
            </div>

            {ownedError ? (
              <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm">{ownedError}</div>
            ) : ownedTournaments.length === 0 ? (
              <div className="text-center py-10 border rounded-lg bg-muted/30">
                <Trophy className="size-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4 text-sm">No creaste ningún torneo aún.</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/tournaments/new">Crear mi primer torneo</Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {ownedTournaments.map((t) => (
                  <TournamentCard key={t.id} t={t} actionLabel="Gestionar" actionHref={`/tournaments/${t.id}`} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Jugador section: torneos en los que está inscrito */}
        <section className="space-y-4">
          <div>
            <h2 className={`font-bold tracking-tight ${isPromoter ? "text-xl" : "text-2xl"}`}>
              {isPromoter ? "Torneos en los que participás" : "Mis Torneos"}
            </h2>
            {!isPromoter && (
              <p className="text-sm text-muted-foreground mt-0.5">Torneos en los que estás inscrito como jugador.</p>
            )}
          </div>

          {registeredError ? (
            <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm">{registeredError}</div>
          ) : registeredTournaments.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-muted/30">
              <Trophy className="size-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-4">Todavía no estás inscrito en ningún torneo.</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/tournaments">Ver torneos disponibles</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {registeredTournaments.map((t) => (
                <TournamentCard key={t.id} t={t} actionLabel="Ver torneo" actionHref={`/tournaments/${t.id}`} />
              ))}
            </div>
          )}
        </section>

      </div>
    </AppLayout>
  );
}
