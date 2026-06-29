import type { SupabaseClient } from "@supabase/supabase-js";
import { listRecurringByCancha, listExceptionsByRecurring, expandToBookings } from "./recurring-api";
import { mapDbError } from "../errors/map-db-error";

type ApiResult<T> = { error: string | null; data: T | null };

export type StatsPeriod = "week" | "month" | "year";

export interface TopClient {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  total: number;
  revenue: number;
  cancelled: number;
}

export interface CanchaStats {
  period: StatsPeriod;
  total_bookings: number;
  confirmed: number;
  cancelled: number;
  pending: number;
  revenue: number;
  cancellation_rate: number;
  top_clients: TopClient[];
  popular_slots: Array<{ start_time: string; count: number }>;
  daily_summary: Array<{ date: string; total: number; revenue: number }>;
}

function getPeriodStart(period: StatsPeriod): string {
  const now = new Date();
  if (period === "week") {
    const d = new Date(now);
    d.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
    return d.toISOString().split("T")[0];
  }
  if (period === "month") {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
  return `${now.getFullYear()}-01-01`;
}

export async function getCanchaStats(
  supabase: SupabaseClient,
  canchaId: string,
  period: StatsPeriod = "month",
): Promise<ApiResult<CanchaStats>> {
  const startDate = getPeriodStart(period);
  const endDate   = new Date().toISOString().split("T")[0];

  const { data: bookings, error } = await supabase
    .from("cancha_bookings")
    .select("booked_by, status, total_price, booking_date, start_time")
    .eq("cancha_id", canchaId)
    .gte("booking_date", startDate)
    .lte("booking_date", endDate);

  if (error) return { error: error.message, data: null };

  const bks = (bookings ?? []) as Array<{
    booked_by: string; status: string; total_price: number; booking_date: string; start_time: string;
  }>;

  const confirmed = bks.filter(b => b.status === "confirmada").length;
  const cancelled = bks.filter(b => b.status === "cancelada").length;
  const pending   = bks.filter(b => b.status === "pendiente").length;
  const revenue   = bks.filter(b => b.status === "confirmada").reduce((s, b) => s + Number(b.total_price), 0);
  const cancellation_rate = bks.length > 0 ? Math.round((cancelled / bks.length) * 100) : 0;

  // Aggregate per client
  const clientMap = new Map<string, { total: number; revenue: number; cancelled: number }>();
  for (const b of bks) {
    if (!clientMap.has(b.booked_by)) clientMap.set(b.booked_by, { total: 0, revenue: 0, cancelled: 0 });
    const c = clientMap.get(b.booked_by)!;
    c.total++;
    if (b.status === "confirmada") c.revenue += Number(b.total_price);
    if (b.status === "cancelada")  c.cancelled++;
  }

  const topIds = [...clientMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([id]) => id);

  let top_clients: TopClient[] = [];
  if (topIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", topIds);
    const pm = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    top_clients = topIds.map(uid => {
      const s = clientMap.get(uid)!;
      const p: any = pm.get(uid);
      return { user_id: uid, full_name: p?.full_name ?? null, username: p?.username ?? null, avatar_url: p?.avatar_url ?? null, total: s.total, revenue: s.revenue, cancelled: s.cancelled };
    });
  }

  // Popular time slots
  const slotMap = new Map<string, number>();
  for (const b of bks.filter(b => b.status !== "cancelada")) {
    const t = b.start_time.substring(0, 5);
    slotMap.set(t, (slotMap.get(t) ?? 0) + 1);
  }
  const popular_slots = [...slotMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([start_time, count]) => ({ start_time, count }))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Daily summary
  const dailyMap = new Map<string, { total: number; revenue: number }>();
  for (const b of bks) {
    if (!dailyMap.has(b.booking_date)) dailyMap.set(b.booking_date, { total: 0, revenue: 0 });
    const d = dailyMap.get(b.booking_date)!;
    d.total++;
    if (b.status === "confirmada") d.revenue += Number(b.total_price);
  }
  const daily_summary = [...dailyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, s]) => ({ date, total: s.total, revenue: s.revenue }));

  return {
    error: null,
    data: { period, total_bookings: bks.length, confirmed, cancelled, pending, revenue, cancellation_rate, top_clients, popular_slots, daily_summary },
  };
}

// ─── Revenue Series ──────────────────────────────────────────────────────────

export type RevenueDatum = {
  period: string;    // "YYYY-MM"
  collected: number; // ad-hoc bookings confirmed
  scheduled: number; // recurring occurrences active
};

/** Returns "YYYY-MM-DD" for the first day of a "YYYY-MM" month string */
function firstDayOfMonth(month: string): string {
  return `${month}-01`;
}

/** Returns "YYYY-MM-DD" for the last day of a "YYYY-MM" month string */
function lastDayOfMonth(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, mon, 0)); // day 0 of next month = last day of this month
  return last.toISOString().split("T")[0];
}

/** Enumerate all "YYYY-MM" strings between fromMonth and toMonth inclusive */
function monthRange(fromMonth: string, toMonth: string): string[] {
  const months: string[] = [];
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  let year = fy;
  let month = fm;
  while (year < ty || (year === ty && month <= tm)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month++;
    if (month > 12) { month = 1; year++; }
  }
  return months;
}

export async function getRevenueSeries(
  supabase: SupabaseClient,
  canchaId: string,
  fromMonth: string,
  toMonth: string,
): Promise<{ data: RevenueDatum[] | null; error: string | null }> {
  const fromDate = firstDayOfMonth(fromMonth);
  const toDate = lastDayOfMonth(toMonth);

  // ── 1. Collected revenue from ad-hoc bookings ─────────────────────────────
  const { data: bookings, error: bErr } = await supabase
    .from("cancha_bookings")
    .select("booking_date, total_price")
    .eq("cancha_id", canchaId)
    .eq("status", "confirmada")
    .gte("booking_date", fromDate)
    .lte("booking_date", toDate);

  if (bErr) return { data: null, error: mapDbError(bErr, "revenue_series_bookings") };

  const collectedMap = new Map<string, number>();
  for (const b of (bookings ?? []) as Array<{ booking_date: string; total_price: number }>) {
    const period = b.booking_date.substring(0, 7);
    collectedMap.set(period, (collectedMap.get(period) ?? 0) + Number(b.total_price));
  }

  // ── 2. Scheduled revenue from recurring bookings ──────────────────────────
  const scheduledMap = new Map<string, number>();

  const { data: recurrings, error: rErr } = await listRecurringByCancha(supabase, canchaId);
  if (rErr) return { data: null, error: rErr };

  for (const recurring of recurrings ?? []) {
    const { data: exceptions } = await listExceptionsByRecurring(supabase, recurring.id);
    const occurrences = expandToBookings(recurring, exceptions ?? [], fromDate, toDate);
    for (const occ of occurrences) {
      const period = occ.date.substring(0, 7);
      scheduledMap.set(period, (scheduledMap.get(period) ?? 0) + occ.price);
    }
  }

  // ── 3. Combine into sorted array ──────────────────────────────────────────
  const periods = monthRange(fromMonth, toMonth);
  const data: RevenueDatum[] = periods.map(period => ({
    period,
    collected: collectedMap.get(period) ?? 0,
    scheduled: scheduledMap.get(period) ?? 0,
  }));

  return { data, error: null };
}
