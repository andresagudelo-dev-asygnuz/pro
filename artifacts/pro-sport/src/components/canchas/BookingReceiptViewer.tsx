import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { approveBookingReceipt, rejectBookingReceipt, getReceiptSignedUrl } from "@/lib/canchas/receipt-api";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CheckCircle, XCircle, Image, Loader2 } from "lucide-react";
import type { CanchaBooking } from "@/lib/types/db";

interface BookingReceiptViewerProps {
  booking: CanchaBooking & { profile?: { full_name: string | null; username: string | null } };
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function BookingReceiptViewer({ booking, open, onClose, onUpdated }: BookingReceiptViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingImg, setLoadingImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [approveMode, setApproveMode] = useState(false);
  const [paymentType, setPaymentType] = useState<"anticipo_pagado" | "pagado_total">("anticipo_pagado");
  const [paidAmount, setPaidAmount] = useState<string>("");

  useEffect(() => {
    if (!open || !booking.receipt_url) return;
    setLoadingImg(true);
    getReceiptSignedUrl(supabase, booking.receipt_url).then((url) => {
      setSignedUrl(url);
      setLoadingImg(false);
    });
  }, [open, booking.receipt_url]);

  async function handleApproveSubmit() {
    setSaving(true);
    const amountNum = paymentType === "pagado_total" ? booking.total_price : Number(paidAmount);
    if (paymentType === "anticipo_pagado" && (isNaN(amountNum) || amountNum <= 0)) {
      toast.error("Ingresá un monto de anticipo válido.");
      setSaving(false);
      return;
    }

    const { error } = await approveBookingReceipt(supabase, booking.id, paymentType, amountNum);
    setSaving(false);
    if (error) { toast.error("Error al aprobar: " + error); return; }
    toast.success("Reserva confirmada y pago registrado.");
    onUpdated();
    onClose();
  }

  async function handleReject() {
    if (!rejectReason.trim()) { toast.error("Escribí el motivo del rechazo."); return; }
    setSaving(true);
    const { error } = await rejectBookingReceipt(supabase, booking.id, rejectReason.trim());
    setSaving(false);
    if (error) { toast.error("Error al rechazar: " + error); return; }
    toast.success("Reserva rechazada. El cupo quedó libre.");
    onUpdated();
    onClose();
  }

  const clientName = booking.profile?.full_name ?? booking.profile?.username ?? "Cliente";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Comprobante de pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="bg-muted/50 rounded-xl p-3 space-y-0.5">
            <p className="font-semibold">{clientName}</p>
            <p className="text-muted-foreground">{booking.booking_date} · {booking.start_time.substring(0, 5)} – {booking.end_time.substring(0, 5)}</p>
            <p className="text-muted-foreground">${Number(booking.total_price).toLocaleString("es-CO")}</p>
          </div>

          {/* Receipt image */}
          <div className="rounded-xl overflow-hidden border border-border bg-muted min-h-[200px] flex items-center justify-center">
            {loadingImg ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : signedUrl ? (
              <img src={signedUrl} alt="Comprobante" className="w-full object-contain max-h-[300px]" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground p-6">
                <Image className="size-8" />
                <p className="text-xs">No se pudo cargar el comprobante</p>
              </div>
            )}
          </div>

          {rejectMode ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Motivo del rechazo (ej: el monto no coincide, imagen ilegible…)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-sm min-h-[80px] resize-none"
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setRejectMode(false)}>Cancelar</Button>
                <Button variant="destructive" className="flex-1 gap-1" onClick={handleReject} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                  Confirmar rechazo
                </Button>
              </div>
            </div>
          ) : approveMode ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Tipo de pago recibido</label>
                <div className="flex gap-2">
                  <Button
                    variant={paymentType === "anticipo_pagado" ? "default" : "outline"}
                    className="flex-1 text-xs px-2"
                    onClick={() => setPaymentType("anticipo_pagado")}
                  >
                    Anticipo
                  </Button>
                  <Button
                    variant={paymentType === "pagado_total" ? "default" : "outline"}
                    className="flex-1 text-xs px-2"
                    onClick={() => setPaymentType("pagado_total")}
                  >
                    Pago Total
                  </Button>
                </div>
              </div>

              {paymentType === "anticipo_pagado" && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Monto del anticipo ($)</label>
                  <Input
                    type="number"
                    placeholder="Ej: 50000"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setApproveMode(false)}>Cancelar</Button>
                <Button className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApproveSubmit} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                  Confirmar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
                onClick={() => { setRejectMode(true); setApproveMode(false); }}
                disabled={saving}
              >
                <XCircle className="size-4" /> Rechazar
              </Button>
              <Button
                className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => { setApproveMode(true); setRejectMode(false); }}
                disabled={saving}
              >
                <CheckCircle className="size-4" /> Aprobar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
