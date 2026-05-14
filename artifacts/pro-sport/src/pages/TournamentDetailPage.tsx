import { Link, useParams } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useTournamentDetail } from "@/hooks/useTournamentDetail";
import { TournamentHeader } from "@/components/tournaments/TournamentHeader";
import { TournamentStatsGrid } from "@/components/tournaments/TournamentStatsGrid";
import { TournamentStateActions } from "@/components/tournaments/TournamentStateActions";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";

export default function TournamentDetailPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const { tournament, registrations, isLoading, error, isOwner, mutations } =
    useTournamentDetail(id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !tournament) {
    return (
      <AppLayout>
        <div className="container py-8 max-w-3xl mx-auto">
          <div className="bg-destructive/15 text-destructive p-4 rounded-2xl">
            {error ?? "Torneo no encontrado"}
          </div>
        </div>
      </AppLayout>
    );
  }

  const confirmed = registrations.filter((r) => r.status === "confirmada");
  const isOpen = tournament.status === "abierto_inscripciones";
  const hasSlots = tournament.slots_filled < tournament.slots;

  return (
    <AppLayout>
      <div className="py-8 max-w-3xl mx-auto space-y-6">
        <TournamentHeader tournament={tournament} />

        <TournamentStatsGrid
          tournament={tournament}
          registeredCount={confirmed.length}
        />

        {isOwner && (
          <TournamentStateActions
            tournament={tournament}
            onPublish={mutations.publish}
            onCloseRegistrations={mutations.closeRegs}
            onGenerateFixture={mutations.generateFixture}
            onFinalize={mutations.finalize}
            isLoading={mutations.isLoading}
          />
        )}

        <div className="flex flex-wrap gap-3">
          {isOwner && (
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href={`/tournaments/${tournament.id}/registrations`}>
                Ver inscripciones ({confirmed.length})
              </Link>
            </Button>
          )}

          <Button variant="outline" className="rounded-xl" asChild>
            <Link href={`/tournaments/${tournament.id}/matches`}>Partidos</Link>
          </Button>

          <Button variant="outline" className="rounded-xl" asChild>
            <Link href={`/tournaments/${tournament.id}/standings`}>
              Tabla de posiciones
            </Link>
          </Button>

          {!isOwner && isOpen && hasSlots && user && (
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700" asChild>
              <Link href={`/tournaments/${tournament.id}/register`}>
                Inscribirme
              </Link>
            </Button>
          )}

          {!isOpen && (
            <span className="text-sm text-muted-foreground self-center">
              Este torneo no está abierto a inscripciones.
            </span>
          )}

          {isOpen && !hasSlots && (
            <span className="text-sm text-muted-foreground self-center">
              Cupos agotados.
            </span>
          )}

          {!user && isOpen && (
            <Button className="rounded-xl" asChild>
              <Link href="/login">Ingresá para inscribirte</Link>
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
