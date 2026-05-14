import { useState } from "react";
import { Link, useParams } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useTournamentDetail } from "@/hooks/useTournamentDetail";
import { useTournamentMatches } from "@/hooks/useTournamentMatches";
import { MatchCard } from "@/components/tournaments/MatchCard";
import { MatchResultDialog } from "@/components/tournaments/MatchResultDialog";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import type { MatchWithNames } from "@/lib/tournaments/matches";

export default function TournamentMatchesPage() {
  const { id } = useParams<{ id: string }>();
  const { isOwner, tournament } = useTournamentDetail(id);
  const { matches, isLoading, error, recordResult, isRecording } =
    useTournamentMatches(id);

  const [dialog, setDialog] = useState<{
    open: boolean;
    match: MatchWithNames | null;
  }>({ open: false, match: null });

  function openDialog(match: MatchWithNames) {
    setDialog({ open: true, match });
  }

  function closeDialog() {
    setDialog({ open: false, match: null });
  }

  function handleConfirmResult(
    matchId: string,
    homeScore: number,
    awayScore: number,
    status: "finalizado" | "w_o",
  ) {
    recordResult(
      { matchId, homeScore, awayScore, status },
      { onSuccess: closeDialog },
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Fixture{tournament ? ` — ${tournament.name}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Partidos y resultados del torneo.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href={`/tournaments/${id}`}>Volver</Link>
            </Button>
            <Button variant="outline" className="rounded-xl" asChild>
              <Link href={`/tournaments/${id}/standings`}>Ver tabla</Link>
            </Button>
            {isOwner && (
              <Button
                className="rounded-xl bg-violet-600 hover:bg-violet-700"
                asChild
              >
                <Link href={`/tournaments/${id}/matches/new`}>
                  Nuevo partido
                </Link>
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {matches.length === 0 && !error ? (
          <div className="border border-border/60 rounded-2xl p-10 text-center bg-white dark:bg-zinc-900 shadow-sm">
            <p className="text-muted-foreground mb-3">
              Todavía no hay partidos cargados.
            </p>
            {isOwner && (
              <Button className="rounded-xl" asChild>
                <Link href={`/tournaments/${id}/matches/new`}>
                  Crear el primer partido
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                isOwner={isOwner}
                onRecordResult={openDialog}
              />
            ))}
          </div>
        )}
      </div>

      <MatchResultDialog
        match={dialog.match}
        isOpen={dialog.open}
        onClose={closeDialog}
        onConfirm={handleConfirmResult}
        isLoading={isRecording}
      />
    </AppLayout>
  );
}
