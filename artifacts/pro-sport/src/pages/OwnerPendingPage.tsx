import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  getOwnerPendingBookings,
  updateBookingStatus,
  type PendingBookingWithCancha,
} from "@/lib/canchas/api";
import { PageHeader } from "@/components/PageHeader";
import { Clock, CheckCircle2, XCircle, Bell } from "lucide-react";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications/api";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
}

export default function OwnerPendingPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingBookingWithCancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningBooking, setActioningBooking] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getOwnerPendingBookings(supabase, user.id).then(({ data }) => {
      setPending(data ?? []);
      setLoading(false);
    });
  }, [user]);

  // Subscribe to changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`owner-bookings-pending-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cancha_bookings" },
        async () => {
          const { data } = await getOwnerPendingBookings(supabase, user.id);
          if (data) setPending(data);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  async function handleBookingAction(bookingId: string, action: "confirmada" | "cancelada") {
    setActioningBooking(bookingId);
    const booking = pending.find((b) => b.id === bookingId);
    const { error } = await updateBookingStatus(supabase, bookingId, action);
    if (error) {
      toast.error("No se pudo actualizar la reserva.");
    } else {
      setPending((prev) => prev.filter((b) => b.id !== bookingId));
      toast.success(action === "confirmada" ? "✅ Reserva confirmada." : "Reserva cancelada.");
      if (booking) {
        const notifType = action === "confirmada" ? "booking_confirmed" : "booking_cancelled_owner";
        await sendNotification(supabase, booking.booked_by, notifType, {
          cancha_id: booking.cancha_id,
          cancha_name: booking.canchas?.name || "la cancha",
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          total_price: booking.total_price,
        });
      }
    }
    setActioningBooking(null);
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayPending = pending.filter((b) => b.booking_date === todayStr).length;

  return (
    <>
      <div className="-mx-4 -mt-6 min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
        <PageHeader title="Reservas Pendientes" backHref="/mis-canchas" />

        <div className="max-w-2xl mx-auto px-4 py-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-2xl bg-white dark:bg-zinc-900">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="size-6" />
              </div>
              <p className="font-semibold text-zinc-900 dark:text-white mb-1">Todo al día</p>
              <p className="text-sm text-muted-foreground">No tienes reservas pendientes de confirmación.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-700/50 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/40">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <Bell className="size-3 text-white" />
                  </div>
                  <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                    {pending.length} reserva{pending.length > 1 ? "s" : ""} por revisar
                  </span>
                </div>
                {todayPending > 0 && (
                  <span className="text-[10px] font-bold bg-violet-600 text-white px-2 py-0.5 rounded-full">
                    {todayPending} hoy
                  </span>
                )}
              </div>

              <div className="divide-y divide-border/40">
                {pending.map((b) => {
                  const isToday = b.booking_date === todayStr;
                  const isBusy = actioningBooking === b.id;
                  return (
                    <div key={b.id} className="px-4 py-4 hover:bg-muted/30 transition-colors">
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
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1.5">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {formatDate(b.booking_date)} · {b.start_time.substring(0, 5)}–{b.end_time.substring(0, 5)}
                            </span>
                          </div>
                          <p className="text-sm font-black text-violet-600 dark:text-violet-400">
                            ${Number(b.total_price).toLocaleString("es-CO")}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            disabled={isBusy}
                            onClick={() => handleBookingAction(b.id, "confirmada")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-40 text-xs font-bold"
                          >
                            <CheckCircle2 className="size-3.5" /> Confirmar
                          </button>
                          <button
                            disabled={isBusy}
                            onClick={() => handleBookingAction(b.id, "cancelada")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-40 text-xs font-bold"
                          >
                            <XCircle className="size-3.5" /> Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
