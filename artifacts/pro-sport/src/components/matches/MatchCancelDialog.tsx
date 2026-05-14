import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MatchCancelDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function MatchCancelDialog({ isOpen, onConfirm, onClose, isLoading }: MatchCancelDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar este partido?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Todos los participantes serán notificados de la cancelación.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isLoading}>
            Volver
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Cancelando…" : "Sí, cancelar partido"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
