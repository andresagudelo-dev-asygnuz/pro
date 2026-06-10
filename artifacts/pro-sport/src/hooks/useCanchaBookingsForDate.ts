import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCanchaBookingsForDate, updateBookingStatus, updateBookingPaymentStatus } from "@/lib/canchas/api";
import { getProfilesByIds } from "@/lib/profiles/api";
import { getOrCreateConversation } from "@/lib/chat/api";
import { sendNotification } from "@/lib/notifications/api";
import { toast } from "sonner";
import type { Cancha, CanchaBooking, PaymentStatus, Profile } from "@/lib/types/db";

export interface UseCanchaBookingsForDateResult {
  bookings: CanchaBooking[];
  bookerProfiles: Map<string, Profile>;
  loadingBookings: boolean;
  openingChat: string | null;
  loadBookings: (date: string) => Promise<void>;
  handleBookingAction: (booking: CanchaBooking, action: "confirmada" | "cancelada") => Promise<void>;
  handlePaymentStatusChange: (bookingId: string, paymentStatus: PaymentStatus) => Promise<void>;
  openChat: (booking: CanchaBooking) => Promise<void>;
}

interface UseCanchaBookingsForDateOptions {
  canchaId: string;
  /** Resolved cancha entity — needed for notifications and chat metadata. */
  cancha: Cancha | null;
  selectedDate: string;
  userId: string | undefined;
  onNavigate: (path: string) => void;
  onRefetchAgenda: () => void;
}

export function useCanchaBookingsForDate({
  canchaId,
  cancha,
  selectedDate,
  userId,
  onNavigate,
  onRefetchAgenda,
}: UseCanchaBookingsForDateOptions): UseCanchaBookingsForDateResult {
  const [bookings, setBookings] = useState<CanchaBooking[]>([]);
  const [bookerProfiles, setBookerProfiles] = useState<Map<string, Profile>>(new Map());
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [openingChat, setOpeningChat] = useState<string | null>(null);

  const loadBookings = useCallback(async (date: string) => {
    if (!canchaId) return;
    setLoadingBookings(true);
    const { data } = await getCanchaBookingsForDate(supabase, canchaId, date);
    const bks = data ?? [];
    setBookings(bks);

    const ids = [...new Set(bks.map((b) => b.booked_by))].filter(Boolean);
    if (ids.length > 0) {
      const { data: profiles } = await getProfilesByIds(supabase, ids);
      const map = new Map<string, Profile>();
      ((profiles ?? []) as Profile[]).forEach((p) => map.set(p.id, p));
      setBookerProfiles(map);
    } else {
      setBookerProfiles(new Map());
    }
    setLoadingBookings(false);
  }, [canchaId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when selected date changes
  useEffect(() => {
    loadBookings(selectedDate);
  }, [selectedDate, loadBookings]);

  // Realtime subscription for new/updated bookings
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

  const handleBookingAction = useCallback(async (
    booking: CanchaBooking,
    action: "confirmada" | "cancelada",
  ) => {
    const { error } = await updateBookingStatus(supabase, booking.id, action);
    if (error) {
      toast.error(error);
    } else {
      toast.success(action === "confirmada" ? "Reserva confirmada." : "Reserva cancelada.");
      setBookings((prev) =>
        prev.map((b) => (b.id === booking.id ? { ...b, status: action } : b)),
      );
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
  }, [cancha, onRefetchAgenda]);

  const handlePaymentStatusChange = useCallback(async (
    bookingId: string,
    paymentStatus: PaymentStatus,
  ) => {
    const { error } = await updateBookingPaymentStatus(supabase, bookingId, paymentStatus);
    if (error) {
      toast.error(error);
    } else {
      const LABELS: Record<PaymentStatus, string> = {
        sin_anticipo: "Sin anticipo",
        anticipo_pagado: "Anticipo registrado",
        pagado_total: "Pago total registrado",
      };
      toast.success(LABELS[paymentStatus]);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, payment_status: paymentStatus } : b)),
      );
    }
  }, []);

  const openChat = useCallback(async (booking: CanchaBooking) => {
    if (!userId || !cancha) return;
    setOpeningChat(booking.id);
    const booker = bookerProfiles.get(booking.booked_by);
    const bookerName = booker?.full_name ?? booker?.username ?? "Jugador";
    const { data, error } = await getOrCreateConversation(
      supabase, "booking", booking.id,
      [userId, booking.booked_by],
      `Reserva — ${cancha.name}`,
      `${booking.booking_date} · ${booking.start_time.substring(0, 5)}–${booking.end_time.substring(0, 5)} · ${bookerName}`,
      { cancha_id: cancha.id, cancha_name: cancha.name, booking_date: booking.booking_date },
    );
    setOpeningChat(null);
    if (error || !data) { toast.error("No se pudo abrir el chat."); return; }
    onNavigate(`/chat/${data.id}`);
  }, [userId, cancha, bookerProfiles, onNavigate]);

  return {
    bookings,
    bookerProfiles,
    loadingBookings,
    openingChat,
    loadBookings,
    handleBookingAction,
    handlePaymentStatusChange,
    openChat,
  };
}
