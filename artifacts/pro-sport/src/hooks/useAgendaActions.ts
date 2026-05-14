import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getCanchaById,
  getCanchaSchedules,
  upsertCanchaSchedules,
  getCanchaBookingsForDate,
  updateBookingStatus,
} from "@/lib/canchas/api";
import { getOrCreateConversation } from "@/lib/chat/api";
import { sendNotification } from "@/lib/notifications/api";
import { toast } from "sonner";
import type { Cancha, CanchaSchedule, CanchaBooking, Profile } from "@/lib/types/db";
import type { ScheduleState } from "@/components/canchas/CanchaScheduleEditor";

const DEFAULT_SCHEDULE: ScheduleState[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  opens_at: "08:00",
  closes_at: "22:00",
  is_available: i !== 0,
}));

interface UseAgendaActionsOptions {
  canchaId: string;
  userId: string | undefined;
  selectedDate: string;
  onNavigate: (path: string) => void;
  onRefetchAgenda: () => void;
}

export function useAgendaActions({
  canchaId,
  userId,
  selectedDate,
  onNavigate,
  onRefetchAgenda,
}: UseAgendaActionsOptions) {
  const supabase = createClient();

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState[]>(DEFAULT_SCHEDULE);
  const [loadingCancha, setLoadingCancha] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [bookings, setBookings] = useState<CanchaBooking[]>([]);
  const [bookerProfiles, setBookerProfiles] = useState<Map<string, Profile>>(new Map());
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [openingChat, setOpeningChat] = useState<string | null>(null);
  const [slotMinutes, setSlotMinutesState] = useState<number>(() => {
    if (!canchaId) return 60;
    return parseInt(localStorage.getItem(`cancha_slot_${canchaId}`) || "60", 10);
  });

  // Load cancha + schedule
  useEffect(() => {
    if (!canchaId) return;
    Promise.all([
      getCanchaById(supabase, canchaId),
      getCanchaSchedules(supabase, canchaId),
    ]).then(([canchaRes, schedRes]) => {
      if (canchaRes.data) setCancha(canchaRes.data);
      if (schedRes.data && schedRes.data.length > 0) {
        const merged = DEFAULT_SCHEDULE.map((def) => {
          const existing = (schedRes.data as CanchaSchedule[]).find(
            (s) => s.day_of_week === def.day_of_week
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
  }, [canchaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load bookings for selected date
  const loadBookings = useCallback(async (date: string) => {
    if (!canchaId) return;
    setLoadingBookings(true);
    const { data } = await getCanchaBookingsForDate(supabase, canchaId, date);
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
  }, [canchaId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadBookings(selectedDate); }, [selectedDate, loadBookings]);

  // Realtime
  useEffect(() => {
    if (!canchaId) return;
    const channel = supabase
      .channel(`agenda-bookings-${canchaId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "cancha_bookings",
        filter: `cancha_id=eq.${canchaId}`,
      }, (payload: { new: { booking_date: string } }) => {
        onRefetchAgenda();
        if (payload.new.booking_date === selectedDate) {
          loadBookings(selectedDate);
          toast.info("¡Nueva reserva recibida!", { icon: "📅" });
        }
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "cancha_bookings",
        filter: `cancha_id=eq.${canchaId}`,
      }, (payload: { new: { booking_date: string } }) => {
        onRefetchAgenda();
        if (payload.new.booking_date === selectedDate) loadBookings(selectedDate);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [canchaId, selectedDate, loadBookings, onRefetchAgenda]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateDay(dayOfWeek: number, field: keyof ScheduleState, value: string | boolean) {
    setSchedule((prev) =>
      prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d))
    );
  }

  function applyToGroup(target: "all" | "laborales" | "finde", sourceDay: number) {
    const source = schedule.find((d) => d.day_of_week === sourceDay);
    if (!source) return;
    const targets =
      target === "all" ? [0, 1, 2, 3, 4, 5, 6] :
      target === "laborales" ? [1, 2, 3, 4, 5] : [0, 6];
    setSchedule((prev) =>
      prev.map((d) =>
        targets.includes(d.day_of_week)
          ? { ...d, opens_at: source.opens_at, closes_at: source.closes_at, is_available: source.is_available }
          : d
      )
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
        is_available:
          preset === "finde_only" ? [0, 6].includes(d.day_of_week) :
          preset === "laboral_full" ? [1, 2, 3, 4, 5].includes(d.day_of_week) : true,
      }))
    );
    toast.success("Preset aplicado. Revisá y guardá.");
  }

  function changeSlotDuration(mins: number) {
    setSlotMinutesState(mins);
    localStorage.setItem(`cancha_slot_${canchaId}`, String(mins));
    toast.success(`Turno de ${mins < 60 ? mins + " min" : mins / 60 + "h"} configurado.`);
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    const { error } = await upsertCanchaSchedules(supabase, canchaId, schedule);
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
      onRefetchAgenda();
      const notifType = action === "confirmada" ? "booking_confirmed" : "booking_cancelled_owner";
      if (cancha) {
        await sendNotification(supabase, booking.booked_by, notifType, {
          cancha_id: cancha.id,
          cancha_name: cancha.name,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          total_price: booking.total_price,
        });
      }
    }
  }

  async function openChat(booking: CanchaBooking) {
    if (!userId || !cancha) return;
    setOpeningChat(booking.id);
    const booker = bookerProfiles.get(booking.booked_by);
    const bookerName = booker?.full_name ?? booker?.username ?? "Jugador";
    const { data, error } = await getOrCreateConversation(
      supabase, "booking", booking.id,
      [userId, booking.booked_by],
      `Reserva — ${cancha.name}`,
      `${booking.booking_date} · ${booking.start_time.substring(0, 5)}–${booking.end_time.substring(0, 5)} · ${bookerName}`,
      { cancha_id: cancha.id, cancha_name: cancha.name, booking_date: booking.booking_date }
    );
    setOpeningChat(null);
    if (error || !data) { toast.error("No se pudo abrir el chat."); return; }
    onNavigate(`/chat/${data.id}`);
  }

  return {
    cancha,
    schedule,
    loadingCancha,
    savingSchedule,
    bookings,
    bookerProfiles,
    loadingBookings,
    openingChat,
    slotMinutes,
    loadBookings,
    updateDay,
    applyToGroup,
    applyPreset,
    changeSlotDuration,
    saveSchedule,
    handleBookingAction,
    openChat,
  };
}
