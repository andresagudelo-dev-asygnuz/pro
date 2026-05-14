import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { TournamentRow } from "@/lib/tournaments/api";

interface Props {
  tournament: TournamentRow;
  onPublish: () => void;
  onCloseRegistrations: () => void;
  onGenerateFixture: () => void;
  onFinalize: () => void;
  isLoading: boolean;
}

export function TournamentStateActions({
  tournament,
  onPublish,
  onCloseRegistrations,
  onGenerateFixture,
  onFinalize,
  isLoading,
}: Props) {
  const { status } = tournament;

  if (status === "borrador") {
    return (
      <Button
        className="rounded-xl bg-violet-600 hover:bg-violet-700"
        onClick={onPublish}
        disabled={isLoading}
      >
        Publicar torneo
      </Button>
    );
  }

  if (status === "abierto_inscripciones") {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="rounded-xl" disabled={isLoading}>
            Cerrar inscripciones
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar inscripciones?</AlertDialogTitle>
            <AlertDialogDescription>
              Ya no se podrán agregar nuevos participantes al torneo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onCloseRegistrations}>
              Sí, cerrar inscripciones
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (status === "cerrado_inscripciones") {
    return (
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={onGenerateFixture}
          disabled={isLoading}
        >
          Generar fixture
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="rounded-xl text-destructive border-destructive/40 hover:bg-destructive/10"
              disabled={isLoading}
            >
              Finalizar torneo
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Finalizar el torneo?</AlertDialogTitle>
              <AlertDialogDescription>
                El torneo quedará marcado como finalizado. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onFinalize}
              >
                Sí, finalizar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (status === "finalizado") {
    return (
      <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/15 text-green-700 font-medium">
        Torneo finalizado
      </span>
    );
  }

  return null;
}
