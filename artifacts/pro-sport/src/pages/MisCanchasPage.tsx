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
  ToggleLeft,
  ToggleRight,
  Pencil,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

const supabase = createClient();

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" });
}

export default function MisCanchasPage() {
  const { user, roles } = useAuth();
  const [, setLocation] = useLocation();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [pending, setPending] = useState<PendingBookingWithCancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningBooking, setActioningBooking] = useState<string | null>(null);

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

  // Realtime: new booking arrives
  useEffect(() => {
    if (!user || canchas.length === 0) return;
    const canchaIds = canchas.map((c) => c.id);

    const channel = supabase
      .channel(`owner-bookings-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cancha_bookings" },
        async (payload: { new: { cancha_id: string; status: string } }) => {
          if (!canchaIds.includes(payload.new.cancha_id)) return;
          if (payload.new.status !== "pendiente") return;
          const { data } = await getOwnerPendingBookings(supabase, user!.id);
          if (data) {
            setPending(data);
            toast.info("¡Nueva reserva pendiente!", { icon: "🏟️" });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "cancha_bookings" },
        async () => {
          const { data } = await getOwnerPendingBookings(supabase, user!.id);
          if (data) setPending(data);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, canchas]);

  async function toggleActive(cancha: Cancha) {
    const { error } = await updateCancha(supabase, cancha.id, {
      is_active: !cancha.is_active,
    });
    if (error) {
      toast.error("No se pudo actualizar.");
    } else {
      setCanchas((prev) =>
        prev.map((c) =>
          c.id === cancha.id ? { ...c, is_active: !c.is_active } : c,
        ),
      );
      toast.success(cancha.is_active ? "Cancha desactivada." : "Cancha activada.");
    }
  }

  async function handleBookingAction(
    bookingId: string,
    action: "confirmada" | "cancelada",
  ) {
    setActioningBooking(bookingId);
    const { error } = await supabase
      .from("cancha_bookings")
      .update({ status: action })
      .eq("id", bookingId);
    if (error) {
      toast.error("No se pudo actualizar la reserva.");
    } else {
      setPending((prev) => prev.filter((b) => b.id !== bookingId));
      toast.success(action === "confirmada" ? "Reserva confirmada." : "Reserva cancelada.");
    }
    setActioningBooking(null);
  }

  if (!roles?.is_cancha && !loading) {
    return (
      <AppLayout>
        <div className="container py-8 max-w-lg mx-auto">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-6 text-center">
            <p className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">
              Rol de Cancha no activado
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">
              Necesitás activar el rol de Administrador de Cancha para registrar y gestionar tus canchas.
            </p>
            <Button className="rounded-xl" onClick={() => setLocation("/perfil")}>
              Ir a mi perfil
            </Button>
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
      <div className="container py-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="size-6 text-violet-600" />
              Panel de Canchas
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestioná tus canchas, reservas y horarios.
            </p>
          </div>
          <Button asChild className="rounded-xl gap-1.5 bg-violet-600 hover:bg-violet-700">
            <Link href="/canchas/nueva">
              <Plus className="size-4" /> Nueva cancha
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-destructive/15 text-destructive p-4 rounded-2xl text-sm">{error}</div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white dark:bg-zinc-900 border border-border/60 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-violet-600">{canchas.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Canchas</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-border/60 rounded-2xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold text-green-600">{activeCanchas}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Activas</p>
              </div>
              <div className={`border rounded-2xl p-4 text-center shadow-sm ${pending.length > 0 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700" : "bg-white dark:bg-zinc-900 border-border/60"}`}>
                <p className={`text-2xl font-bold ${pending.length > 0 ? "text-amber-600" : "text-foreground"}`}>
                  {pending.length}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Pendientes</p>
              </div>
            </div>

            {/* Pending bookings */}
            {pending.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-amber-200 dark:border-amber-700/60 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 text-amber-600" />
                    <h2 className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                      Reservas pendientes de confirmación
                    </h2>
                  </div>
                  <span className="text-xs font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                </div>
                <div className="divide-y divide-border/40">
                  {pending.map((b) => {
                    const isToday = b.booking_date === today;
                    return (
                      <div key={b.id} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold truncate">
                              {b.canchas?.name || "Cancha"}
                            </span>
                            {isToday && (
                              <span className="text-[10px] font-bold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded-full">
                                Hoy
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="size-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              {formatDate(b.booking_date)} · {b.start_time.substring(0, 5)} – {b.end_time.substring(0, 5)}
                            </p>
                            <span className="text-xs font-medium text-violet-600 dark:text-violet-400 ml-1">
                              ${Number(b.total_price).toLocaleString("es-CO")}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Link href={`/canchas/${b.cancha_id}/agenda`}>
                            <button className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors">
                              Ver agenda
                            </button>
                          </Link>
                          <button
                            disabled={actioningBooking === b.id}
                            onClick={() => handleBookingAction(b.id, "confirmada")}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                            title="Confirmar"
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                          <button
                            disabled={actioningBooking === b.id}
                            onClick={() => handleBookingAction(b.id, "cancelada")}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            title="Cancelar"
                          >
                            <XCircle className="size-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Canchas list */}
            {canchas.length === 0 ? (
              <div className="text-center py-12 border border-border/60 rounded-2xl bg-muted/20">
                <p className="text-4xl mb-4">🏟️</p>
                <p className="text-muted-foreground mb-4">Todavía no registraste ninguna cancha.</p>
                <Button asChild className="rounded-xl">
                  <Link href="/canchas/nueva">Registrar mi primera cancha</Link>
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Mis canchas ({canchas.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {canchas.map((c) => {
                    const canchaBookingsPending = pending.filter((b) => b.cancha_id === c.id).length;
                    const todayBookings = pending.filter((b) => b.cancha_id === c.id && b.booking_date === today).length;
                    return (
                      <div
                        key={c.id}
                        className="border border-border/60 rounded-2xl p-5 bg-white dark:bg-zinc-900 shadow-sm space-y-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{SPORT_TYPE_ICONS[c.sport_type]}</span>
                              <span className="text-xs text-muted-foreground">{SPORT_TYPE_LABELS[c.sport_type]}</span>
                              {canchaBookingsPending > 0 && (
                                <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                                  {canchaBookingsPending} pend.
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold truncate">{c.name}</h3>
                            <p className="text-xs text-muted-foreground">📍 {c.city}</p>
                            {todayBookings > 0 && (
                              <p className="text-xs text-amber-600 font-medium mt-0.5">
                                ⚡ {todayBookings} reserva{todayBookings > 1 ? "s" : ""} pendiente{todayBookings > 1 ? "s" : ""} hoy
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => toggleActive(c)}
                            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors shrink-0 ${
                              c.is_active
                                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700"
                                : "bg-muted text-muted-foreground border-transparent"
                            }`}
                            title={c.is_active ? "Desactivar cancha" : "Activar cancha"}
                          >
                            {c.is_active ? (
                              <><ToggleRight className="size-3.5" /> Activa</>
                            ) : (
                              <><ToggleLeft className="size-3.5" /> Inactiva</>
                            )}
                          </button>
                        </div>

                        <div className="text-sm">
                          <span className="font-bold text-violet-600 dark:text-violet-400">
                            ${c.price_per_hour.toLocaleString("es-CO")}/h
                          </span>
                          {c.discount_percent > 0 && (
                            <span className="ml-2 text-xs text-green-600 font-medium">
                              -{c.discount_percent}% dto.
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className={`rounded-xl text-xs ${canchaBookingsPending > 0 ? "border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20" : ""}`}
                            asChild
                          >
                            <Link href={`/canchas/${c.id}/agenda`}>
                              <Calendar className="size-3.5 mr-1" /> Agenda
                              {canchaBookingsPending > 0 && (
                                <span className="ml-1 size-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                                  {canchaBookingsPending}
                                </span>
                              )}
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl text-xs" asChild>
                            <Link href={`/canchas/${c.id}/editar`}>
                              <Pencil className="size-3.5 mr-1" /> Editar
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-xl text-xs" asChild>
                            <Link href={`/canchas/${c.id}`}>Ver</Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
