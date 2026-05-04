import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
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
import { CheckCircle2, XCircle, Pencil, Users, AlertCircle, RefreshCw, Copy, Clock, Repeat2, MessageCircle, ExternalLink } from "lucide-react";
import { sendNotification } from "@/lib/notifications/api";
import { getOrCreateConversation } from "@/lib/chat/api";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

type BookingFilter = "all" | "pendiente" | "confirmada" | "cancelada";

export default function CanchaAgendaPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState[]>(DEFAULT_SCHEDULE);
  const [loadingCancha, setLoadingCancha] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [slotMinutes, setSlotMinutes] = useState<number>(() => {
    if (!id) return 60;
    return parseInt(localStorage.getItem(`cancha_slot_${id}`) || "60", 10);
  });

  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [bookings, setBookings] = useState<CanchaBooking[]>([]);
  const [bookerProfiles, setBookerProfiles] = useState<Map<string, Profile>>(new Map());
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>("all");
  const [openingChat, setOpeningChat] = useState<string | null>(null);

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

  function applyToGroup(target: "all" | "laborales" | "finde", sourceDay: number) {
    const source = schedule.find((d) => d.day_of_week === sourceDay);
    if (!source) return;
    const targets =
      target === "all" ? [0, 1, 2, 3, 4, 5, 6] :
      target === "laborales" ? [1, 2, 3, 4, 5] :
      [0, 6];
    setSchedule((prev) =>
      prev.map((d) =>
        targets.includes(d.day_of_week)
          ? { ...d, opens_at: source.opens_at, closes_at: source.closes_at, is_available: source.is_available }
          : d,
      ),
    );
    toast.success("Horario aplicado.");
  }

  function applyPreset(preset: "laboral_full" | "finde_only" | "todos_full" | "manana" | "tarde") {
    const presets: Record<string, { opens_at: string; closes_at: string; days: number[] }> = {
      laboral_full: { opens_at: "08:00", closes_at: "22:00", days: [1, 2, 3, 4, 5] },
      finde_only:   { opens_at: "08:00", closes_at: "22:00", days: [0, 6] },
      todos_full:   { opens_at: "08:00", closes_at: "22:00", days: [0, 1, 2, 3, 4, 5, 6] },
      manana:       { opens_at: "07:00", closes_at: "13:00", days: [0, 1, 2, 3, 4, 5, 6] },
      tarde:        { opens_at: "14:00", closes_at: "22:00", days: [0, 1, 2, 3, 4, 5, 6] },
    };
    const p = presets[preset];
    setSchedule((prev) =>
      prev.map((d) => ({
        ...d,
        opens_at: p.days.includes(d.day_of_week) ? p.opens_at : d.opens_at,
        closes_at: p.days.includes(d.day_of_week) ? p.closes_at : d.closes_at,
        is_available: preset === "finde_only"
          ? [0, 6].includes(d.day_of_week)
          : preset === "laboral_full"
          ? [1, 2, 3, 4, 5].includes(d.day_of_week)
          : true,
      })),
    );
    toast.success("Preset aplicado. Revisá y guardá.");
  }

  function changeSlotDuration(mins: number) {
    setSlotMinutes(mins);
    localStorage.setItem(`cancha_slot_${id}`, String(mins));
    toast.success(`Turno de ${mins < 60 ? mins + " min" : mins / 60 + "h"} configurado.`);
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    const { error } = await upsertCanchaSchedules(supabase, id, schedule);
    if (error) toast.error(error);
    else toast.success("Horarios guardados. Se aplican automáticamente cada semana.");
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
      const notifType = action === "confirmada" ? "booking_confirmed" : "booking_cancelled_owner";
      await sendNotification(supabase, booking.booked_by, notifType, {
        cancha_id: cancha!.id,
        cancha_name: cancha!.name,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        total_price: booking.total_price,
      });
    }
  }

  async function openChat(booking: CanchaBooking) {
    if (!user || !cancha) return;
    setOpeningChat(booking.id);
    const booker = bookerProfiles.get(booking.booked_by);
    const bookerName = booker?.full_name ?? booker?.username ?? "Jugador";
    const { data, error } = await getOrCreateConversation(
      supabase,
      "booking",
      booking.id,
      [user.id, booking.booked_by],
      `Reserva — ${cancha.name}`,
      `${booking.booking_date} · ${booking.start_time.substring(0, 5)}–${booking.end_time.substring(0, 5)} · ${bookerName}`,
      { cancha_id: cancha.id, cancha_name: cancha.name, booking_date: booking.booking_date }
    );
    setOpeningChat(null);
    if (error || !data) { toast.error("No se pudo abrir el chat."); return; }
    setLocation(`/chat/${data.id}`);
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
  const filteredBookings = bookingFilter === "all" ? bookings : bookings.filter((b) => b.status === bookingFilter);
  const filterCounts: Record<BookingFilter, number> = {
    all: bookings.length,
    pendiente: bookings.filter((b) => b.status === "pendiente").length,
    confirmada: bookings.filter((b) => b.status === "confirmada").length,
    cancelada: bookings.filter((b) => b.status === "cancelada").length,
  };
  const FILTER_LABELS: Record<BookingFilter, string> = {
    all: "Todas", pendiente: "Pendientes", confirmada: "Confirmadas", cancelada: "Canceladas",
  };
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
          {/* Header + date picker */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
            <div>
              <h2 className="font-semibold text-base">
                Reservas —{" "}
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("es-CO", {
                  weekday: "long", day: "numeric", month: "long",
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

          {/* Filtros de estado */}
          {bookings.length > 0 && (
            <div className="flex gap-2 px-5 pt-3 pb-1 overflow-x-auto scrollbar-none">
              {(["all", "pendiente", "confirmada", "cancelada"] as BookingFilter[]).map((f) => {
                const count = filterCounts[f];
                if (f !== "all" && count === 0) return null;
                return (
                  <button
                    key={f}
                    onClick={() => setBookingFilter(f)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                      bookingFilter === f
                        ? "bg-violet-600 text-white border-violet-600"
                        : "border-border/60 hover:border-violet-400 bg-background"
                    }`}
                  >
                    {FILTER_LABELS[f]}{count > 0 ? ` (${count})` : ""}
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-5 pt-3">
            {loadingBookings ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-6">
                <Users className="size-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {bookings.length === 0 ? "No hay reservas para este día." : "Sin reservas con este filtro."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => {
                  const booker = bookerProfiles.get(b.booked_by);
                  const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pendiente;
                  const bookerName = booker?.full_name ?? booker?.username ?? "Usuario";
                  const isOpeningThisChat = openingChat === b.id;
                  return (
                    <div
                      key={b.id}
                      className={`rounded-xl border transition-colors ${
                        b.status === "pendiente"
                          ? "border-amber-200 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-900/10"
                          : "border-border/60 bg-background"
                      }`}
                    >
                      {/* Row 1: avatar + info + status */}
                      <div className="flex items-center gap-3 p-3.5">
                        <Link href={`/profile/${b.booked_by}`}>
                          <Avatar className="size-10 shrink-0 cursor-pointer ring-2 ring-offset-1 ring-violet-200 dark:ring-violet-800">
                            {booker?.avatar_url && <AvatarImage src={booker.avatar_url} />}
                            <AvatarFallback className="text-xs font-semibold bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                              {initialsFromName(bookerName)}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold">{bookerName}</p>
                            {booker?.city && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                📍 {booker.city}
                              </span>
                            )}
                          </div>
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
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${cfg.style}`}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Row 2: actions */}
                      <div className="flex items-center gap-2 px-3.5 pb-3 border-t border-border/30 pt-2.5">
                        {/* Ver perfil */}
                        <Link href={`/profile/${b.booked_by}`}>
                          <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                            <ExternalLink className="size-3" /> Ver perfil
                          </button>
                        </Link>

                        {/* Chat */}
                        <button
                          onClick={() => openChat(b)}
                          disabled={isOpeningThisChat}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-50 font-medium"
                        >
                          {isOpeningThisChat
                            ? <div className="size-3 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                            : <MessageCircle className="size-3" />}
                          {isOpeningThisChat ? "Abriendo..." : "Chat"}
                        </button>

                        <div className="flex-1" />

                        {/* Confirm / Cancel */}
                        {b.status === "pendiente" && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleBookingAction(b, "confirmada")}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors font-medium"
                              title="Confirmar"
                            >
                              <CheckCircle2 className="size-3.5" /> Confirmar
                            </button>
                            <button
                              onClick={() => handleBookingAction(b, "cancelada")}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors font-medium"
                              title="Cancelar"
                            >
                              <XCircle className="size-3.5" /> Cancelar
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

        {/* Configuración semanal */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border/60 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowSchedule((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Repeat2 className="size-4 text-violet-600" />
              <div className="text-left">
                <h2 className="font-semibold text-base">Configuración semanal</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Se repite automáticamente cada semana · Configurá una vez
                </p>
              </div>
            </div>
            <span className={`text-xs font-medium text-muted-foreground transition-transform duration-200 ${showSchedule ? "rotate-180" : ""}`}>▾</span>
          </button>

          {showSchedule && (
            <div className="px-5 pb-5 space-y-5 border-t border-border/50 pt-5">

              {/* Duración de turno */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock className="size-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Duración del turno</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[30, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => changeSlotDuration(mins)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        slotMinutes === mins
                          ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                          : "border-border/60 hover:border-violet-400 hover:text-violet-600"
                      }`}
                    >
                      {mins < 60 ? `${mins} min` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Cada jugador reserva bloques de {slotMinutes < 60 ? `${slotMinutes} min` : `${slotMinutes / 60}h`}.
                </p>
              </div>

              {/* Presets rápidos */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Presets rápidos</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: "todos_full",   label: "Todos los días 8–22" },
                    { key: "laboral_full", label: "Lun–Vie 8–22" },
                    { key: "finde_only",   label: "Solo finde" },
                    { key: "manana",       label: "Solo mañana 7–13" },
                    { key: "tarde",        label: "Solo tarde 14–22" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key as Parameters<typeof applyPreset>[0])}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 transition-all"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Editor por día */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Días y horarios</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Copy className="size-3" />
                    <span>Copiar día seleccionado →</span>
                    {["all", "laborales", "finde"].map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          const firstAvail = schedule.find((d) => d.is_available);
                          if (firstAvail) applyToGroup(t as "all" | "laborales" | "finde", firstAvail.day_of_week);
                        }}
                        className="px-2 py-0.5 rounded-md bg-muted hover:bg-violet-100 dark:hover:bg-violet-900/20 hover:text-violet-600 transition-colors font-medium"
                      >
                        {t === "all" ? "Todos" : t === "laborales" ? "Lun–Vie" : "Sáb–Dom"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {schedule.map((day) => (
                    <div
                      key={day.day_of_week}
                      className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                        day.is_available ? "border-border/60 bg-background" : "border-transparent bg-muted/40"
                      }`}
                    >
                      <label className="flex items-center gap-2 shrink-0 cursor-pointer min-w-[72px]">
                        <input
                          type="checkbox"
                          checked={day.is_available}
                          onChange={(e) => updateDay(day.day_of_week, "is_available", e.target.checked)}
                          className="size-4 rounded border-input accent-violet-600"
                        />
                        <span className={`text-sm font-semibold ${!day.is_available ? "text-muted-foreground" : ""}`}>
                          {DAY_LABELS[day.day_of_week]}
                        </span>
                      </label>

                      {day.is_available ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="time"
                            value={day.opens_at}
                            onChange={(e) => updateDay(day.day_of_week, "opens_at", e.target.value)}
                            className="border border-border/60 rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1"
                          />
                          <span className="text-xs text-muted-foreground shrink-0">a</span>
                          <input
                            type="time"
                            value={day.closes_at}
                            onChange={(e) => updateDay(day.day_of_week, "closes_at", e.target.value)}
                            className="border border-border/60 rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1"
                          />
                          <div className="flex gap-1 shrink-0">
                            {(["all", "laborales", "finde"] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => applyToGroup(t, day.day_of_week)}
                                title={`Copiar a ${t === "all" ? "todos" : t === "laborales" ? "Lun–Vie" : "Sáb–Dom"}`}
                                className="h-7 px-2 text-[10px] font-medium rounded-md border border-border/60 hover:border-violet-400 hover:text-violet-600 transition-colors"
                              >
                                {t === "all" ? "Todos" : t === "laborales" ? "L–V" : "S–D"}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Cerrado</span>
                      )}
                    </div>
                  ))}
                </div>
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
