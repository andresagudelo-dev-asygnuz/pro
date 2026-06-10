import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePendingBookingTimer } from "@/hooks/usePendingBookingTimer";
import { uploadBookingReceipt } from "@/lib/canchas/receipt-api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Clock, Upload, CheckCircle, CreditCard, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { VenuePaymentMethod } from "@/lib/types/db";

interface PaymentPendingModalProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  userId: string;
  canchaName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  paymentMethods: VenuePaymentMethod[];
  paymentInstructions: string | null;
  expiresAt: string;
  matchId?: string;
}

export function PaymentPendingModal({
  open,
  onClose,
  bookingId,
  userId,
  canchaName,
  bookingDate,
  startTime,
  endTime,
  totalPrice,
  paymentMethods,
  paymentInstructions,
  expiresAt,
  matchId,
}: PaymentPendingModalProps) {
  const [, setLocation] = useLocation();
  const { minutes, seconds, expired, urgent } = usePendingBookingTimer(expiresAt);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { error } = await uploadBookingReceipt(supabase, bookingId, userId, file);
    setUploading(false);
    if (error) {
      toast.error("No se pudo subir el comprobante. Intentá de nuevo.");
    } else {
      setUploaded(true);
      toast.success("Comprobante subido", {
        description: "Tu reserva pasará a revisión.",
      });
      // Redirect to match if available, else keep the modal closed state
      setTimeout(() => {
        onClose();
        if (matchId) {
          setLocation(`/matches/${matchId}`);
        }
      }, 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && uploaded) onClose(); }}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {uploaded ? (
              <><CheckCircle className="size-5 text-emerald-500" /> Pago enviado</>
            ) : expired ? (
              <><AlertCircle className="size-5 text-red-500" /> Tiempo expirado</>
            ) : (
              <><Clock className="size-5 text-amber-500" /> Cupo separado</>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Booking summary */}
        <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-1">
          <p className="font-semibold">{canchaName}</p>
          <p className="text-muted-foreground">{bookingDate} · {startTime} – {endTime}</p>
          <p className="font-medium text-emerald-600">${totalPrice.toLocaleString("es-CO")}</p>
        </div>

        {uploaded ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-muted-foreground">Tu comprobante está siendo revisado. Te avisaremos cuando sea aprobado.</p>
            <Button onClick={onClose} className="w-full">Entendido</Button>
          </div>
        ) : expired ? (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-muted-foreground">Se agotó el tiempo y tu pre-reserva fue liberada.</p>
            <Button variant="outline" onClick={onClose} className="w-full">Cerrar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timer */}
            <div className={cn(
              "text-center py-3 rounded-xl font-mono text-3xl font-bold",
              urgent ? "bg-red-50 text-red-600 dark:bg-red-950/30" : "bg-amber-50 text-amber-600 dark:bg-amber-950/30"
            )}>
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              <p className="text-xs font-normal mt-1 text-muted-foreground">para subir tu comprobante</p>
            </div>

            {/* Payment info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CreditCard className="size-4" /> Datos de pago
              </div>
              
              {paymentInstructions && (
                <div className="bg-muted text-sm rounded-xl p-3 whitespace-pre-wrap text-muted-foreground">
                  {paymentInstructions}
                </div>
              )}

              {paymentMethods && paymentMethods.length > 0 ? (
                <Tabs defaultValue={paymentMethods[0].id} className="w-full">
                  <TabsList className="w-full flex h-auto p-1 bg-muted/50 overflow-x-auto justify-start hide-scrollbar">
                    {paymentMethods.map(pm => (
                      <TabsTrigger key={pm.id} value={pm.id} className="text-xs uppercase px-4 py-2 font-semibold">
                        {pm.bank_name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {paymentMethods.map(pm => (
                    <TabsContent key={pm.id} value={pm.id} className="mt-3">
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col gap-3">
                        <div>
                          <p className="text-emerald-700/80 dark:text-emerald-400/80 text-xs uppercase tracking-wider font-bold mb-1">{pm.bank_name}</p>
                          <p className="font-mono font-bold text-xl text-emerald-800 dark:text-emerald-300 tracking-tight">{pm.account_number}</p>
                          {pm.account_name && <p className="text-sm text-emerald-900/70 dark:text-emerald-100/70">{pm.account_name}</p>}
                        </div>
                        {pm.qr_url && (
                          <div className="flex justify-center bg-white border border-border rounded-xl p-3 mt-1 shadow-sm">
                            <img src={pm.qr_url} alt={`QR ${pm.bank_name}`} className="w-40 h-40 object-contain rounded-lg" />
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted rounded-xl p-3">
                  La sede no ha configurado sus datos de pago automáticos. Contactá al coordinador.
                </p>
              )}
            </div>

            {/* Upload */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full gap-2 bg-violet-600 hover:bg-violet-700"
            >
              <Upload className="size-4" />
              {uploading ? "Subiendo comprobante…" : "Subir foto del comprobante"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Tomá una foto o captura de pantalla del pago en Nequi y subila aquí.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
