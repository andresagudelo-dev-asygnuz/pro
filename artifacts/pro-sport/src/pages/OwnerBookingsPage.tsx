import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SUPABASE_DB_SCHEMA } from "@/lib/supabase/schema";
import { useAuth } from "@/context/AuthContext";
import {
  getOwnerAllBookings,
  updateBookingStatus,
  type PendingBookingWithCancha,
} from "@/lib/canchas/api";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle2, XCircle, Share, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications/api";
import { PublishAvailableSlotModal } from "@/components/canchas/PublishAvailableSlotModal";
import { BookingReceiptViewer } from "@/components/canchas/BookingReceiptViewer";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
}

export default function OwnerBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<PendingBookingWithCancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningBooking, setActioningBooking] = useState<string | null>(null);

  const [slotModalBooking, setSlotModalBooking] = useState<PendingBookingWithCancha | null>(null);
  const [receiptViewerBooking, setReceiptViewerBooking] = useState<PendingBookingWithCancha | null>(null);

  const loadBookings = async () => {
    if (!user) return;
    const { data } = await getOwnerAllBookings(supabase, user.id);
    setBookings(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadBookings();
  }, [user]);

  // Subscribe to changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`owner-all-bookings-${user.id}`)
      .on("postgres_changes", { event: "*", schema: SUPABASE_DB_SCHEMA, table: "cancha_bookings" },
        () => loadBookings()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function handleBookingAction(b: PendingBookingWithCancha, action: "confirmada" | "cancelada") {
    setActioningBooking(b.id);
    const { error } = await updateBookingStatus(supabase, b.id, action);
    if (error) {
      toast.error("No se pudo actualizar la reserva.");
    } else {
      toast.success(action === "confirmada" ? "✅ Reserva confirmada." : "Reserva cancelada.");
      loadBookings();
      const notifType = action === "confirmada" ? "booking_confirmed" : "booking_cancelled_owner";
      await sendNotification(supabase, b.booked_by, notifType, {
        cancha_id: b.cancha_id,
        cancha_name: b.canchas?.name || "la cancha",
        booking_date: b.booking_date,
        start_time: b.start_time,
        end_time: b.end_time,
        total_price: b.total_price,
      });
    }
    setActioningBooking(null);
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const pendientes = bookings.filter(b => b.status === "pendiente" && b.payment_status !== "rechazado");
  const proximas = bookings.filter(b => b.status === "confirmada" && b.booking_date >= todayStr);
  const historial = bookings.filter(b => b.status === "confirmada" && b.booking_date < todayStr);
  const canceladas = bookings.filter(b => b.status === "cancelada" || b.payment_status === "rechazado");

  function renderBookingCard(b: PendingBookingWithCancha, showActions: boolean, showPublishAction: boolean = false) {
    const isToday = b.booking_date === todayStr;
    const isBusy = actioningBooking === b.id;

    return (
      <div key={b.id} className="px-4 py-4 border-b border-border/40 hover:bg-muted/30 transition-colors bg-white dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                {b.canchas?.name || "Cancha"}
              </span>
              {isToday && (
                <span className="text-[10px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded-full shrink-0">
                  Hoy
                </span>
              )}
              {b.payment_status === "rechazado" && (
                <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-full shrink-0">
                  Pago Rechazado
                </span>
              )}
              {b.status === "cancelada" && (
                <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-full shrink-0">
                  Cancelada
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatDate(b.booking_date)} · {b.start_time.substring(0, 5)}–{b.end_time.substring(0, 5)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-black text-violet-600 dark:text-violet-400">
                ${Number(b.total_price).toLocaleString("es-CO")}
              </p>
              {b.receipt_url && (
                <button 
                  onClick={() => setReceiptViewerBooking(b)}
                  className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ImageIcon className="size-3" /> Ver comprobante
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {showActions && (
              <>
                <button
                  disabled={isBusy}
                  onClick={() => handleBookingAction(b, "confirmada")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-40 text-xs font-bold"
                >
                  <CheckCircle2 className="size-3.5" /> Confirmar
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => handleBookingAction(b, "cancelada")}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-40 text-xs font-bold"
                >
                  <XCircle className="size-3.5" /> Cancelar
                </button>
              </>
            )}
            {showPublishAction && (
              <button
                onClick={() => setSlotModalBooking(b)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors disabled:opacity-40 text-xs font-bold"
              >
                <Share className="size-3.5" /> Publicar cupo
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderList(list: PendingBookingWithCancha[], emptyMessage: string, showActions: boolean, showPublishAction: boolean = false) {
    if (loading) {
      return (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-2xl bg-white dark:bg-zinc-900 mt-4">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden mt-4">
        {list.map(b => renderBookingCard(b, showActions, showPublishAction))}
      </div>
    );
  }

  return (
    <>
      <div className="-mx-4 -mt-6 min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
        <PageHeader title="Todas las Reservas" backHref="/mis-canchas/dashboard" />

        <div className="max-w-3xl mx-auto px-4 py-6">
          <Tabs defaultValue="pendientes" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="pendientes" className="rounded-lg text-xs py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800">
                Pendientes {pendientes.length > 0 && `(${pendientes.length})`}
              </TabsTrigger>
              <TabsTrigger value="proximas" className="rounded-lg text-xs py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800">
                Próximas {proximas.length > 0 && `(${proximas.length})`}
              </TabsTrigger>
              <TabsTrigger value="historial" className="rounded-lg text-xs py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800">
                Historial
              </TabsTrigger>
              <TabsTrigger value="canceladas" className="rounded-lg text-xs py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800">
                Canceladas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendientes" className="focus-visible:outline-none">
              {renderList(pendientes, "No hay reservas pendientes de revisión.", true)}
            </TabsContent>
            <TabsContent value="proximas" className="focus-visible:outline-none">
              {renderList(proximas, "No tienes reservas próximas confirmadas.", false)}
            </TabsContent>
            <TabsContent value="historial" className="focus-visible:outline-none">
              {renderList(historial, "Aún no hay historial de reservas jugadas.", false)}
            </TabsContent>
            <TabsContent value="canceladas" className="focus-visible:outline-none">
              {renderList(canceladas, "No hay reservas canceladas o rechazadas.", false, true)}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PublishAvailableSlotModal 
        booking={slotModalBooking}
        open={!!slotModalBooking}
        onClose={() => setSlotModalBooking(null)}
      />

      {receiptViewerBooking && (
        <BookingReceiptViewer
          booking={receiptViewerBooking}
          open={!!receiptViewerBooking}
          onClose={() => setReceiptViewerBooking(null)}
          onUpdated={loadBookings}
        />
      )}
    </>
  );
}
