import type { SupabaseClient } from "@supabase/supabase-js";

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
