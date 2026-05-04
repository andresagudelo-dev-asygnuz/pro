import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  getMyCanchas,
  updateCancha,
  getOwnerPendingBookings,
  type PendingBookingWithCancha,
} from "@/lib/canchas/api";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import {
  SPORT_TYPE_LABELS,
  SPORT_TYPE_ICONS,
  type Cancha,
} from "@/lib/types/db";
import {
  Plus,
  Calendar,
  Pencil,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  BarChart2,
  Shield,
  LayoutDashboard,
  UserCircle2,
  ChevronRight,
  Bell,
  MapPin,
  Zap,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import { sendNotification } from "@/lib/notifications/api";

const supabase = createClient();

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
}

const SPORT_GRADIENTS: Record<string, string> = {
  futbol_11:   "from-green-600 to-green-800",
  futbol_9:    "from-green-500 to-emerald-700",
  futbol_5:    "from-emerald-500 to-teal-700",
  futbol_sala: "from-teal-500 to-cyan-700",
  padel:       "from-violet-600 to-purple-800",
  tenis:       "from-yellow-500 to-amber-700",
  basket:      "from-orange-500 to-red-700",
  voleibol:    "from-blue-500 to-indigo-700",
  otro:        "from-zinc-500 to-zinc-700",
};

export default function MisCanchasPage() {
  const { user, roles } = useAuth();
  const [, setLocation] = useLocation();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [pending, setPending] = useState<PendingBookingWithCancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningBooking, setActioningBooking] = useState<string | null>(null);
  const [togglingCancha, setTogglingCancha] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getMyCanchas(supabase, user.id),
      getOwnerPendingBookings(supabase, user.id),
    ]).then(([canchasRes, pendingRes]) => {
      if (canchasRes.error) setError(canchasRes.error);
      else setCanchas(canchasRes.data ?? []);
      setPending(pendingRes.data ?? []);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user || canchas.length === 0) return;
    const canchaIds = canchas.map((c) => c.id);
    const channel = supabase
      .channel(`owner-bookings-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cancha_bookings" },
        async (payload: { new: { cancha_id: string; status: string } }) => {
          if (!canchaIds.includes(payload.new.cancha_id)) return;
          if (payload.new.status !== "pendiente") return;
          const { data } = await getOwnerPendingBookings(supabase, user!.id);
          if (data) { setPending(data); toast.info("¡Nueva reserva pendiente!", { icon: "🏟️" }); }
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cancha_bookings" },
        async () => {
          const { data } = await getOwnerPendingBookings(supabase, user!.id);
          if (data) setPending(data);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, canchas]);

  async function toggleActive(cancha: Cancha) {
    setTogglingCancha(cancha.id);
    const { error } = await updateCancha(supabase, cancha.id, { is_active: !cancha.is_active });
    if (error) {
      toast.error("No se pudo actualizar.");
    } else {
      setCanchas((prev) => prev.map((c) => c.id === cancha.id ? { ...c, is_active: !c.is_active } : c));
      toast.success(cancha.is_active ? "Cancha desactivada." : "¡Cancha activada!");
    }
    setTogglingCancha(null);
  }

  async function handleBookingAction(bookingId: string, action: "confirmada" | "cancelada") {
    setActioningBooking(bookingId);
    const booking = pending.find((b) => b.id === bookingId);
    const { error } = await supabase.from("cancha_bookings").update({ status: action }).eq("id", bookingId);
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

  if (!roles?.is_cancha && !loading) {
    return (
      <AppLayout>
        <div className="container py-8 max-w-lg mx-auto">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">Rol de Cancha no activado</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
              Necesitás activar el rol de Administrador de Cancha para registrar y gestionar tus canchas.
            </p>
            <Button className="rounded-xl" onClick={() => setLocation("/perfil")}>Ir a mi perfil</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const activeCanchas = canchas.filter((c) => c.is_active).length;
  const today = todayStr();
  const todayPending = pending.filter((b) => b.booking_date === today).length;

  return (
    <AppLayout>
      <div className="-mx-4 -mt-6 min-h-screen bg-zinc-100 dark:bg-zinc-950">

        {/* ── Hero header ────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-violet-900 via-violet-800 to-indigo-900 pt-6 pb-8 px-5">
          {/* Top row: back + actions */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Panel de Canchas</h1>
              <p className="text-violet-300 text-xs mt-0.5">Gestioná tus canchas, reservas y horarios</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/mis-canchas/perfil">
                <button className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <UserCircle2 className="size-4 text-white" />
                </button>
              </Link>
              <Link href="/mis-canchas/dashboard">
                <button className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <LayoutDashboard className="size-4 text-white" />
                </button>
              </Link>
            </div>
          </div>

          {/* Stats chips */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-white tabular-nums">{loading ? "—" : canchas.length}</p>
              <p className="text-[11px] text-violet-200 mt-0.5 font-medium">Canchas</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3 text-center">
              <p className={`text-2xl font-black tabular-nums ${activeCanchas > 0 ? "text-emerald-300" : "text-white"}`}>
                {loading ? "—" : activeCanchas}
              </p>
              <p className="text-[11px] text-violet-200 mt-0.5 font-medium">Activas</p>
            </div>
            <div className={`rounded-2xl p-3 text-center ${pending.length > 0 ? "bg-amber-400/20 ring-1 ring-amber-400/40" : "bg-white/10"}`}>
              <p className={`text-2xl font-black tabular-nums ${pending.length > 0 ? "text-amber-300" : "text-white"}`}>
                {loading ? "—" : pending.length}
              </p>
              <p className={`text-[11px] mt-0.5 font-medium ${pending.length > 0 ? "text-amber-200" : "text-violet-200"}`}>
                {pending.length > 0 ? "⚡ Pendientes" : "Pendientes"}
              </p>
            </div>
          </div>

          {/* Nueva cancha CTA */}
          <Link href="/canchas/nueva">
            <button className="w-full flex items-center justify-center gap-2 bg-white text-violet-700 font-bold text-sm py-2.5 rounded-xl hover:bg-violet-50 transition-colors shadow-md">
              <Plus className="size-4" /> Registrar nueva cancha
            </button>
          </Link>
        </div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div className="px-3 pt-4 pb-28 space-y-4 max-w-2xl mx-auto">

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-sm">{error}</div>
          ) : (
            <>
              {/* ── Pending bookings banner ─────────────────────────── */}
              {pending.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-700/50 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/40">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                        <Bell className="size-3 text-white" />
                      </div>
                      <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                        {pending.length} reserva{pending.length > 1 ? "s" : ""} esperando confirmación
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
                      const isToday = b.booking_date === today;
                      const isBusy = actioningBooking === b.id;
                      return (
                        <div key={b.id} className="px-4 py-3">
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
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {formatDate(b.booking_date)} · {b.start_time.substring(0, 5)}–{b.end_time.substring(0, 5)}
                                </span>
                                <span className="font-semibold text-violet-600 dark:text-violet-400">
                                  ${Number(b.total_price).toLocaleString("es-CO")}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Link href={`/canchas/${b.cancha_id}/agenda`}>
                                <button className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors">
                                  Agenda
                                </button>
                              </Link>
                              <button
                                disabled={isBusy}
                                onClick={() => handleBookingAction(b.id, "confirmada")}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors disabled:opacity-40"
                                title="Confirmar"
                              >
                                {isBusy ? (
                                  <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <CheckCircle2 className="size-4" />
                                )}
                              </button>
                              <button
                                disabled={isBusy}
                                onClick={() => handleBookingAction(b.id, "cancelada")}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-40"
                                title="Cancelar"
                              >
                                <XCircle className="size-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Canchas list ─────────────────────────────────────── */}
              {canchas.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-2xl bg-white dark:bg-zinc-900">
                  <p className="text-5xl mb-4">🏟️</p>
                  <p className="font-semibold text-zinc-900 dark:text-white mb-1">Sin canchas registradas</p>
                  <p className="text-sm text-muted-foreground mb-5">Registrá tu primera cancha para empezar a recibir reservas.</p>
                  <Link href="/canchas/nueva">
                    <button className="bg-violet-600 hover:bg-violet-700 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-colors">
                      + Registrar cancha
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Mis canchas · {canchas.length}
                  </p>
                  {canchas.map((c) => {
                    const cPending = pending.filter((b) => b.cancha_id === c.id).length;
                    const gradient = SPORT_GRADIENTS[c.sport_type] ?? SPORT_GRADIENTS.otro;
                    const isToggling = togglingCancha === c.id;
                    return (
                      <div key={c.id} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm overflow-hidden border border-border/50">

                        {/* Sport color band */}
                        <div className={`bg-gradient-to-r ${gradient} px-4 py-3 flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{SPORT_TYPE_ICONS[c.sport_type]}</span>
                            <div>
                              <p className="text-white font-bold text-sm leading-tight">{c.name}</p>
                              <p className="text-white/70 text-xs">{SPORT_TYPE_LABELS[c.sport_type]}</p>
                            </div>
                          </div>
                          {/* Active toggle */}
                          <button
                            onClick={() => toggleActive(c)}
                            disabled={isToggling}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors shrink-0 ${
                              c.is_active
                                ? "bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30"
                                : "bg-white/10 text-white/60 hover:bg-white/20"
                            }`}
                          >
                            {isToggling ? (
                              <div className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Power className="size-3" />
                            )}
                            {c.is_active ? "Activa" : "Inactiva"}
                          </button>
                        </div>

                        {/* Card body */}
                        <div className="px-4 py-3">
                          {/* Location + price row */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="size-3" /> {c.city}
                              {c.address && <span className="truncate max-w-[120px]"> · {c.address}</span>}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-black text-violet-600 dark:text-violet-400">
                                ${c.price_per_hour.toLocaleString("es-CO")}<span className="font-normal text-xs text-muted-foreground">/h</span>
                              </span>
                              {c.discount_percent > 0 && (
                                <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                                  -{c.discount_percent}%
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Pending alert for this cancha */}
                          {cPending > 0 && (
                            <div className="flex items-center gap-1.5 mb-3 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl">
                              <Zap className="size-3 shrink-0" />
                              {cPending} reserva{cPending > 1 ? "s" : ""} pendiente{cPending > 1 ? "s" : ""} de confirmación
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="grid grid-cols-4 gap-1.5">
                            <Link href={`/canchas/${c.id}/agenda`}>
                              <button className={`relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-center w-full transition-colors text-xs font-medium ${
                                cPending > 0
                                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                                  : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              }`}>
                                <Calendar className="size-4" />
                                Agenda
                                {cPending > 0 && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                                    {cPending}
                                  </span>
                                )}
                              </button>
                            </Link>
                            <Link href={`/canchas/${c.id}/clientes`}>
                              <button className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl w-full bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium">
                                <Users className="size-4" />
                                Clientes
                              </button>
                            </Link>
                            <Link href={`/canchas/${c.id}/equipo`}>
                              <button className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl w-full bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium">
                                <Shield className="size-4" />
                                Equipo
                              </button>
                            </Link>
                            <Link href={`/canchas/${c.id}/stats`}>
                              <button className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl w-full bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium">
                                <BarChart2 className="size-4" />
                                Stats
                              </button>
                            </Link>
                          </div>

                          {/* Edit full-width */}
                          <Link href={`/canchas/${c.id}/editar`}>
                            <button className="mt-1.5 w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs font-medium text-zinc-500 dark:text-zinc-400">
                              <div className="flex items-center gap-1.5">
                                <Pencil className="size-3.5" /> Editar cancha
                              </div>
                              <ChevronRight className="size-3.5" />
                            </button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
