import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { Cancha, CanchaSchedule, CanchaBooking, CanchaSportType, TimeSlot, PaymentStatus } from "@/lib/types/db";

type ApiResult<T> = { error: string | null; data: T | null };

function generateSlots(opensAt: string, closesAt: string, durationMinutes = 60): string[] {
  const [openH, openM] = opensAt.split(":").map(Number);
  const [closeH, closeM] = closesAt.split(":").map(Number);
  const openTotal = openH * 60 + (openM || 0);
  const closeTotal = closeH * 60 + (closeM || 0);
  const slots: string[] = [];
  for (let t = openTotal; t + durationMinutes <= closeTotal; t += durationMinutes) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return slots;
}

export async function listActiveCanchasBasic(
  supabase: SupabaseClient,
): Promise<ApiResult<{ id: string; name: string }[]>> {
  const { data, error } = await supabase
    .from("canchas")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as { id: string; name: string }[] };
}

export async function getAllCanchas(
  supabase: SupabaseClient,
  filters?: { city?: string; sportType?: CanchaSportType | ""; sportTypes?: CanchaSportType[]; venueId?: string },
): Promise<ApiResult<Cancha[]>> {
  let query = supabase.from("canchas").select("*").eq("is_active", true).order("name");
  if (filters?.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters?.sportTypes && filters.sportTypes.length > 0) {
    query = query.in("sport_type", filters.sportTypes);
  } else if (filters?.sportType) {
    query = query.eq("sport_type", filters.sportType);
  }
  if (filters?.venueId) query = query.eq("venue_id", filters.venueId);
  const { data, error } = await query;
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as Cancha[] };
}

export async function getMyCanchas(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<Cancha[]>> {
  const { data, error } = await supabase
    .from("canchas")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as Cancha[] };
}

export async function getCanchaById(
  supabase: SupabaseClient,
  id: string,
): Promise<ApiResult<Cancha>> {
  const { data, error } = await supabase.from("canchas").select("*").eq("id", id).single();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as Cancha };
}

export async function assignCanchaToVenue(
  supabase: SupabaseClient,
  canchaId: string,
  venueId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("canchas")
    .update({ venue_id: venueId })
    .eq("id", canchaId);
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: null };
}

export type CanchaInput = {
  name: string;
  description?: string;
  sport_type: CanchaSportType;
  capacity: number;
  address: string;
  city: string;
  price_per_hour: number;
  discount_percent: number;
  is_active: boolean;
  phone?: string;
  whatsapp?: string;
  venue_id?: string | null;
  lat?: number | null;
  lng?: number | null;
  image_url?: string | null;
};

export async function createCancha(
  supabase: SupabaseClient,
  input: CanchaInput,
  userId: string,
): Promise<ApiResult<Cancha>> {
  const { data, error } = await supabase
    .from("canchas")
    .insert({ ...input, owner_id: userId })
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as Cancha };
}

export async function updateCancha(
  supabase: SupabaseClient,
  id: string,
  input: Partial<CanchaInput>,
): Promise<ApiResult<Cancha>> {
  const { data, error } = await supabase
    .from("canchas")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as Cancha };
}

export async function getCanchaSchedules(
  supabase: SupabaseClient,
  canchaId: string,
): Promise<ApiResult<CanchaSchedule[]>> {
  const { data, error } = await supabase
    .from("cancha_schedules")
    .select("*")
    .eq("cancha_id", canchaId)
    .order("day_of_week");
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as CanchaSchedule[] };
}

export type ScheduleInput = {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_available: boolean;
};

export async function upsertCanchaSchedules(
  supabase: SupabaseClient,
  canchaId: string,
  schedules: ScheduleInput[],
): Promise<ApiResult<CanchaSchedule[]>> {
  const rows = schedules.map((s) => ({ ...s, cancha_id: canchaId }));
  const { data, error } = await supabase
    .from("cancha_schedules")
    .upsert(rows, { onConflict: "cancha_id,day_of_week" })
    .select();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as CanchaSchedule[] };
}

export async function getAvailableSlots(
  supabase: SupabaseClient,
  canchaId: string,
  date: string,
  slotMinutes = 60,
): Promise<ApiResult<TimeSlot[]>> {
  const dayOfWeek = new Date(date + "T12:00:00").getDay();

  const [scheduleResult, bookingsResult] = await Promise.all([
    supabase
      .from("cancha_schedules")
      .select("opens_at, closes_at, is_available")
      .eq("cancha_id", canchaId)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle(),
    supabase
      .from("cancha_bookings")
      .select("start_time")
      .eq("cancha_id", canchaId)
      .eq("booking_date", date)
      .neq("status", "cancelada"),
  ]);

  if (scheduleResult.error) return { error: mapDbError(scheduleResult.error), data: null };
  if (bookingsResult.error) return { error: mapDbError(bookingsResult.error), data: null };

  const schedule = scheduleResult.data;
  if (!schedule || !schedule.is_available) return { error: null, data: [] };

  const allStarts = generateSlots(schedule.opens_at, schedule.closes_at, slotMinutes);
  const bookedStarts = new Set(
    ((bookingsResult.data ?? []) as { start_time: string }[]).map((b) =>
      b.start_time.substring(0, 5),
    ),
  );

  const slots: TimeSlot[] = allStarts.map((start) => {
    const [h, m] = start.split(":").map(Number);
    const endTotal = h * 60 + m + slotMinutes;
    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;
    const end = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
    return { start, end, isAvailable: !bookedStarts.has(start) };
  });

  return { error: null, data: slots };
}

export async function createBooking(
  supabase: SupabaseClient,
  input: {
    cancha_id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    total_price: number;
    notes?: string;
  },
  userId: string,
): Promise<ApiResult<CanchaBooking>> {
  const { data, error } = await supabase
    .from("cancha_bookings")
    .insert({
      cancha_id: input.cancha_id,
      booked_by: userId,
      booking_date: input.booking_date,
      start_time: input.start_time + ":00",
      end_time: input.end_time + ":00",
      status: "pendiente",
      total_price: input.total_price,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as CanchaBooking };
}

export type BookingWithCancha = CanchaBooking & { canchas: Cancha };

export type BookingWithCanchaInfo = CanchaBooking & {
  canchas: { name: string; address: string; city: string } | null;
};

export async function getBookingWithCancha(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<ApiResult<BookingWithCanchaInfo>> {
  const { data, error } = await supabase
    .from("cancha_bookings")
    .select("*, canchas(name, address, city)")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as BookingWithCanchaInfo | null };
}

export type CanchaOwnerInfo = { owner_id: string; name: string };

export async function getCanchaOwnerInfo(
  supabase: SupabaseClient,
  canchaId: string,
): Promise<ApiResult<CanchaOwnerInfo>> {
  const { data, error } = await supabase
    .from("canchas")
    .select("owner_id, name")
    .eq("id", canchaId)
    .maybeSingle();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as CanchaOwnerInfo | null };
}

export async function getMyBookings(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<BookingWithCancha[]>> {
  const { data, error } = await supabase
    .from("cancha_bookings")
    .select("*, canchas(*)")
    .eq("booked_by", userId)
    .order("booking_date", { ascending: false });
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as BookingWithCancha[] };
}

export async function getCanchaBookingsForDate(
  supabase: SupabaseClient,
  canchaId: string,
  date: string,
): Promise<ApiResult<CanchaBooking[]>> {
  const { data, error } = await supabase
    .from("cancha_bookings")
    .select("*")
    .eq("cancha_id", canchaId)
    .eq("booking_date", date)
    .order("start_time");
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as CanchaBooking[] };
}

export async function getClientBookingsForCancha(
  supabase: SupabaseClient,
  canchaId: string,
  userId: string,
  limit = 10,
): Promise<ApiResult<CanchaBooking[]>> {
  const { data, error } = await supabase
    .from("cancha_bookings")
    .select("*")
    .eq("cancha_id", canchaId)
    .eq("booked_by", userId)
    .order("booking_date", { ascending: false })
    .limit(limit);
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as CanchaBooking[] };
}

export async function updateBookingStatus(
  supabase: SupabaseClient,
  bookingId: string,
  status: "confirmada" | "cancelada",
): Promise<ApiResult<CanchaBooking>> {
  const { data, error } = await supabase
    .from("cancha_bookings")
    .update({ status })
    .eq("id", bookingId)
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as CanchaBooking };
}

export async function updateBookingPaymentStatus(
  supabase: SupabaseClient,
  bookingId: string,
  paymentStatus: PaymentStatus,
): Promise<ApiResult<CanchaBooking>> {
  const { data, error } = await supabase
    .from("cancha_bookings")
    .update({ payment_status: paymentStatus })
    .eq("id", bookingId)
    .select()
    .single();
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: data as CanchaBooking };
}

export type PendingBookingWithCancha = CanchaBooking & {
  canchas: { name: string; sport_type: string };
};

export async function getOwnerPendingBookings(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<PendingBookingWithCancha[]>> {
  const { data: myCanchas } = await supabase
    .from("canchas")
    .select("id")
    .eq("owner_id", userId);
  if (!myCanchas?.length) return { error: null, data: [] };
  const ids = myCanchas.map((c: { id: string }) => c.id);
  const { data, error } = await supabase
    .from("cancha_bookings")
    .select("*, canchas(name, sport_type)")
    .in("cancha_id", ids)
    .eq("status", "pendiente")
    .order("booking_date")
    .order("start_time");
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as PendingBookingWithCancha[] };
}

export async function getOwnerAllBookings(
  supabase: SupabaseClient,
  userId: string,
): Promise<ApiResult<PendingBookingWithCancha[]>> {
  const { data: myCanchas } = await supabase
    .from("canchas")
    .select("id")
    .eq("owner_id", userId);
  if (!myCanchas?.length) return { error: null, data: [] };
  const ids = myCanchas.map((c: { id: string }) => c.id);
  const { data, error } = await supabase
    .from("cancha_bookings")
    .select("*, canchas(name, sport_type)")
    .in("cancha_id", ids)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false });
  if (error) return { error: mapDbError(error), data: null };
  return { error: null, data: (data ?? []) as PendingBookingWithCancha[] };
}

export type DaySummary = {
  booking_date: string;
  total: number;
  pending: number;
};

export async function getWeeklyBookingSummary(
  supabase: SupabaseClient,
  canchaId: string,
  startDate: string,
  endDate: string,
): Promise<ApiResult<DaySummary[]>> {
  const { data, error } = await supabase
    .from("cancha_bookings")
    .select("booking_date, status")
    .eq("cancha_id", canchaId)
    .gte("booking_date", startDate)
    .lte("booking_date", endDate);
  if (error) return { error: mapDbError(error), data: null };
  const grouped: Record<string, { total: number; pending: number }> = {};
  for (const b of (data ?? []) as { booking_date: string; status: string }[]) {
    if (!grouped[b.booking_date])
      grouped[b.booking_date] = { total: 0, pending: 0 };
    grouped[b.booking_date].total++;
    if (b.status === "pendiente") grouped[b.booking_date].pending++;
  }
  return {
    error: null,
    data: Object.entries(grouped).map(([booking_date, s]) => ({
      booking_date,
      total: s.total,
      pending: s.pending,
    })),
  };
}
