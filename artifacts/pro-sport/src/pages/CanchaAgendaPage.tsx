import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  getCanchaById,
  getCanchaSchedules,
  upsertCanchaSchedules,
  getCanchaBookingsForDate,
  updateBookingStatus,
  getWeeklyBookingSummary,
  type DaySummary,
} from "@/lib/canchas/api";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Pencil, Users, AlertCircle, RefreshCw } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import {
  DAY_LABELS,
  type Cancha,
  type CanchaSchedule,
  type CanchaBooking,
  type Profile,
} from "@/lib/types/db";
import { initialsFromName } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

const supabase = createClient();

type ScheduleState = {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_available: boolean;
};

const DEFAULT_SCHEDULE: ScheduleState[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  opens_at: "08:00",
  closes_at: "22:00",
  is_available: i !== 0,
}));

const STATUS_CONFIG = {
  pendiente: {
    label: "Pendiente",
    style: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  },
  confirmada: {
    label: "Confirmada",
    style: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
  },
  cancelada: {
    label: "Cancelada",
    style: "bg-muted text-muted-foreground border-transparent",
  },
};

function getNext7Days(): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function formatDayShort(dateStr: string): { weekday: string; day: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return {
    weekday: d.toLocaleDateString("es-CO", { weekday: "short" }).slice(0, 3),
    day: String(d.getDate()),
  };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function CanchaAgendaPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState[]>(DEFAULT_SCHEDULE);
  const [loadingCancha, setLoadingCancha] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [bookings, setBookings] = useState<CanchaBooking[]>([]);
  const [bookerProfiles, setBookerProfiles] = useState<Map<string, Profile>>(new Map());
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [weekSummary, setWeekSummary] = useState<DaySummary[]>([]);
  const weekDays = getNext7Days();

  const loadBookings = useCallback(async (date: string) => {
    if (!id) return;
    setLoadingBookings(true);
    const { data } = await getCanchaBookingsForDate(supabase, id, date);
    const bks = data ?? [];
    setBookings(bks);
    const ids = [...new Set(bks.map((b) => b.booked_by))].filter(Boolean);
    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", ids);
      const map = new Map<string, Profile>();
      ((profiles ?? []) as Profile[]).forEach((p) => map.set(p.id, p));
      setBookerProfiles(map);
    } else {
      setBookerProfiles(new Map());
    }
    setLoadingBookings(false);
  }, [id]);

  const loadWeekSummary = useCallback(async () => {
    if (!id) return;
    const { data } = await getWeeklyBookingSummary(supabase, id, weekDays[0], weekDays[6]);
    if (data) setWeekSummary(data);
  }, [id, weekDays[0], weekDays[6]]);

  useEffect(() => {
    Promise.all([
      getCanchaById(supabase, id),
      getCanchaSchedules(supabase, id),
    ]).then(([canchaRes, schedRes]) => {
      if (canchaRes.data) setCancha(canchaRes.data);
      if (schedRes.data && schedRes.data.length > 0) {
        const merged = DEFAULT_SCHEDULE.map((def) => {
          const existing = (schedRes.data as CanchaSchedule[]).find(
            (s) => s.day_of_week === def.day_of_week,
          );
          if (!existing) return def;
          return {
            day_of_week: existing.day_of_week,
            opens_at: existing.opens_at.substring(0, 5),
            closes_at: existing.closes_at.substring(0, 5),
            is_available: existing.is_available,
          };
        });
        setSchedule(merged);
      }
      setLoadingCancha(false);
    });
  }, [id]);

  useEffect(() => {
    loadBookings(selectedDate);
  }, [selectedDate, loadBookings]);

  useEffect(() => {
    loadWeekSummary();
  }, [loadWeekSummary]);

  // Realtime: listen for new/updated bookings
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`agenda-bookings-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cancha_bookings",
          filter: `cancha_id=eq.${id}`,
        },
        (payload: { new: { booking_date: string } }) => {
          loadWeekSummary();
          if (payload.new.booking_date === selectedDate) {
            loadBookings(selectedDate);
            toast.info("¡Nueva reserva recibida!", { icon: "📅" });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cancha_bookings",
          filter: `cancha_id=eq.${id}`,
        },
        (payload: { new: { booking_date: string } }) => {
          loadWeekSummary();
          if (payload.new.booking_date === selectedDate) {
            loadBookings(selectedDate);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, selectedDate, loadBookings, loadWeekSummary]);

  function updateDay(dayOfWeek: number, field: keyof ScheduleState, value: string | boolean) {
    setSchedule((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d)),
    );
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    const { error } = await upsertCanchaSchedules(supabase, id, schedule);
    if (error) toast.error(error);
    else toast.success("Horarios guardados.");
    setSavingSchedule(false);
  }

  async function handleBookingAction(booking: CanchaBooking, action: "confirmada" | "cancelada") {
    const { error } = await updateBookingStatus(supabase, booking.id, action);
    if (error) {
      toast.error(error);
    } else {
      toast.success(action === "confirmada" ? "Reserva confirmada." : "Reserva cancelada.");
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: action } : b)));
      loadWeekSummary();
    }
  }

  if (loadingCancha) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cancha || (user && cancha.owner_id !== user.id)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground">No tenés permisos para gestionar esta cancha.</p>
        <Link href="/mis-canchas"><Button variant="outline">Mis canchas</Button></Link>
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === "pendiente").length;
  const today = todayStr();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <PageHeader
        title={cancha.name}
        backHref="/mis-canchas"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { loadBookings(selectedDate); loadWeekSummary(); }}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Actualizar"
            >
              <RefreshCw className="size-3.5" />
            </button>
            <Link href={`/canchas/${id}/editar`}>
              <Button variant="outline" size="sm" className="rounded-xl gap-1.5 text-xs">
                <Pencil className="size-3.5" /> Editar
              </Button>
            </Link>
          </div>
        }
      />

      <main className="container mx-auto px-4 py-5 max-w-2xl space-y-5">

        {/* Week strip */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Próximos 7 días
          </p>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((date) => {
              const { weekday, day } = formatDayShort(date);
              const summary = weekSummary.find((s) => s.booking_date === date);
              const isSelected = date === selectedDate;
              const isToday = date === today;
              const hasPending = (summary?.pending ?? 0) > 0;

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`relative flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl transition-all text-center ${
                    isSelected
                      ? "bg-violet-600 text-white shadow-md"
                      : hasPending
                      ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span className={`text-[10px] font-medium capitalize ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                    {weekday}
                  </span>
                  <span className={`text-sm font-bold ${isSelected ? "text-white" : isToday ? "text-violet-600" : ""}`}>
                    {day}
                  </span>
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-600" />
                  )}
                  {summary && summary.total > 0 ? (
                    <span className={`text-[9px] font-bold px-1 rounded-full leading-tight ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : hasPending
                        ? "bg-amber-500 text-white"
                        : "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                    }`}>
                      {summary.total}
                    </span>
                  ) : (
                    <span className="h-3.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reservas del día seleccionado */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
            <div>
              <h2 className="font-semibold text-base">
                Reservas —{" "}
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </h2>
              {pendingBookings > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <AlertCircle className="size-3 text-amber-500" />
                  <p className="text-xs text-amber-600 font-medium">
                    {pendingBookings} pendiente{pendingBookings > 1 ? "s" : ""} de confirmación
                  </p>
                </div>
              )}
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-border/60 rounded-xl px-2.5 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div className="p-5">
            {loadingBookings ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-6">
                <Users className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay reservas para este día.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const booker = bookerProfiles.get(b.booked_by);
                  const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pendiente;
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center justify-between gap-3 rounded-xl p-3.5 border transition-colors ${
                        b.status === "pendiente"
                          ? "border-amber-200 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-900/10"
                          : "border-border/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-9 shrink-0">
                          <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                            {initialsFromName(booker?.full_name ?? booker?.username ?? null)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {booker?.full_name ?? booker?.username ?? "Usuario desconocido"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {b.start_time.substring(0, 5)} – {b.end_time.substring(0, 5)} ·{" "}
                            <span className="font-medium text-violet-600 dark:text-violet-400">
                              ${Number(b.total_price).toLocaleString("es-CO")}
                            </span>
                          </p>
                          {b.notes && (
                            <p className="text-xs text-muted-foreground truncate">📝 {b.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.style}`}>
                          {cfg.label}
                        </span>
                        {b.status === "pendiente" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleBookingAction(b, "confirmada")}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                              title="Confirmar"
                            >
                              <CheckCircle2 className="size-4" />
                            </button>
                            <button
                              onClick={() => handleBookingAction(b, "cancelada")}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                              title="Cancelar"
                            >
                              <XCircle className="size-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Horario semanal (colapsable) */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowSchedule((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div>
              <h2 className="font-semibold text-base text-left">Horario semanal</h2>
              <p className="text-xs text-muted-foreground mt-0.5 text-left">
                Configurá los días y rangos horarios disponibles.
              </p>
            </div>
            <span className={`text-xs font-medium text-muted-foreground transition-transform duration-200 ${showSchedule ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>

          {showSchedule && (
            <div className="px-5 pb-5 space-y-4 border-t border-border/50">
              <div className="space-y-2 pt-4">
                {schedule.map((day) => (
                  <div
                    key={day.day_of_week}
                    className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                      day.is_available
                        ? "border-border/60 bg-background"
                        : "border-transparent bg-muted/40"
                    }`}
                  >
                    <label className="flex items-center gap-2 shrink-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={day.is_available}
                        onChange={(e) => updateDay(day.day_of_week, "is_available", e.target.checked)}
                        className="size-4 rounded border-input accent-violet-600"
                      />
                      <span className={`text-sm font-medium w-8 ${!day.is_available ? "text-muted-foreground" : ""}`}>
                        {DAY_LABELS[day.day_of_week]}
                      </span>
                    </label>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={day.opens_at}
                        disabled={!day.is_available}
                        onChange={(e) => updateDay(day.day_of_week, "opens_at", e.target.value)}
                        className="border border-border/60 rounded-lg px-2 py-1.5 text-sm bg-background disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">a</span>
                      <input
                        type="time"
                        value={day.closes_at}
                        disabled={!day.is_available}
                        onChange={(e) => updateDay(day.day_of_week, "closes_at", e.target.value)}
                        className="border border-border/60 rounded-lg px-2 py-1.5 text-sm bg-background disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <Button
                onClick={saveSchedule}
                disabled={savingSchedule}
                className="w-full rounded-xl bg-violet-600 hover:bg-violet-700"
              >
                {savingSchedule ? "Guardando…" : "Guardar horarios"}
              </Button>
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
