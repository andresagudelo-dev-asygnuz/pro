import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createPost } from "@/lib/social/api";
import { toast } from "sonner";
import { Loader2, Share } from "lucide-react";
import type { PendingBookingWithCancha } from "@/lib/canchas/api";
import { useAuth } from "@/context/AuthContext";

interface PublishAvailableSlotModalProps {
  booking: PendingBookingWithCancha | null;
  open: boolean;
  onClose: () => void;
}

export function PublishAvailableSlotModal({ booking, open, onClose }: PublishAvailableSlotModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setContent(`¡Tenemos un cupo disponible que se acaba de liberar! ⚽🔥\n\n📅 Fecha: ${booking.booking_date}\n⏰ Hora: ${booking.start_time.substring(0, 5)} - ${booking.end_time.substring(0, 5)}\n🏟️ Cancha: ${booking.canchas?.name || "Nuestra cancha"}\n\nEscríbenos o reserva directamente desde la app para asegurar tu espacio.`);
    }
  }, [booking]);

  async function handlePublish() {
    if (!user || !booking) return;
    if (!content.trim()) {
      toast.error("El contenido del post no puede estar vacío");
      return;
    }

    setSaving(true);
    try {
      await createPost(user.id, content.trim(), [], undefined, booking.cancha_id);
      toast.success("¡Espacio publicado en el feed!");
      onClose();
    } catch (err: any) {
      toast.error("No se pudo publicar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publicar Cupo Disponible</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Aprovecha este espacio cancelado y avísale a la comunidad publicándolo en el feed de la app.
          </p>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[150px] resize-none"
            placeholder="Escribe tu publicación..."
          />

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button 
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white" 
              onClick={handlePublish}
              disabled={saving}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Share className="size-4" />}
              Publicar en Feed
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
