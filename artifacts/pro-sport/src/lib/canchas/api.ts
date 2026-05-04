import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { Cancha, CanchaSchedule, CanchaBooking, CanchaSportType, TimeSlot } from "@/lib/types/db";

type ApiResult<T> = { error: string | null; data: T | null };

function generateHourlySlots(opensAt: string, closesAt: string): string[] {
  const openHour = parseInt(opensAt.split(":")[0], 10);
  const closeHour = parseInt(closesAt.split(":")[0], 10);
  const slots: string[] = [];
  for (let h = openHour; h < closeHour; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

export async function getAllCanchas(
  supabase: SupabaseClient,
  filters?: { city?: string; sportType?: CanchaSportType | ""; sportTypes?: CanchaSportType[] },
): Promise<ApiResult<Cancha[]>> {
  let query = supabase.from("canchas").select("*").eq("is_active", true).order("name");
  if (filters?.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters?.sportTypes && filters.sportTypes.length > 0) {
    query = query.in("sport_type", filters.sportTypes);
  } else if (filters?.sportType) {
    query = query.eq("sport_type", filters.sportType);
  }
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

  const allStarts = generateHourlySlots(schedule.opens_at, schedule.closes_at);
  const bookedStarts = new Set(
    ((bookingsResult.data ?? []) as { start_time: string }[]).map((b) =>
      b.start_time.substring(0, 5),
    ),
  );

  const slots: TimeSlot[] = allStarts.map((start) => {
    const hour = parseInt(start.split(":")[0], 10);
    const end = `${String(hour + 1).padStart(2, "0")}:00`;
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
