import type { SupabaseClient } from "@supabase/supabase-js";

type ApiResult<T> = { error: string | null; data: T | null };

export type ClientTag = "vip" | "frecuente" | "bloqueado";

export const CLIENT_TAG_CONFIG: Record<ClientTag, { label: string; color: string; bg: string }> = {
  vip:       { label: "VIP",       color: "text-amber-700 dark:text-amber-300",  bg: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700" },
  frecuente: { label: "Frecuente", color: "text-blue-700 dark:text-blue-300",    bg: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" },
  bloqueado: { label: "Bloqueado", color: "text-red-700 dark:text-red-300",      bg: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700" },
};

export interface CanchaClient {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  total_bookings: number;
  confirmed: number;
  cancelled: number;
  pending: number;
  total_spent: number;
  last_booking_date: string | null;
  tag: ClientTag | null;
  tag_notes: string | null;
}

export async function getCanchaClients(
  supabase: SupabaseClient,
  canchaId: string,
): Promise<ApiResult<CanchaClient[]>> {
  const [bookingsRes, tagsRes] = await Promise.all([
    supabase
      .from("cancha_bookings")
      .select("booked_by, status, total_price, booking_date")
      .eq("cancha_id", canchaId),
    supabase
      .from("cancha_client_tags")
      .select("user_id, tag, notes")
      .eq("cancha_id", canchaId),
  ]);

  if (bookingsRes.error) return { error: bookingsRes.error.message, data: null };

  const bks = (bookingsRes.data ?? []) as Array<{
    booked_by: string; status: string; total_price: number; booking_date: string;
  }>;
  const tags = (tagsRes.data ?? []) as Array<{ user_id: string; tag: string; notes: string | null }>;

  const tagMap = new Map(tags.map(t => [t.user_id, { tag: t.tag as ClientTag, notes: t.notes }]));

  const userMap = new Map<string, { total: number; confirmed: number; cancelled: number; pending: number; spent: number; lastDate: string | null }>();
  for (const b of bks) {
    if (!userMap.has(b.booked_by)) userMap.set(b.booked_by, { total: 0, confirmed: 0, cancelled: 0, pending: 0, spent: 0, lastDate: null });
    const u = userMap.get(b.booked_by)!;
    u.total++;
    if (b.status === "confirmada") { u.confirmed++; u.spent += Number(b.total_price); }
    if (b.status === "cancelada")  u.cancelled++;
    if (b.status === "pendiente")  u.pending++;
    if (!u.lastDate || b.booking_date > u.lastDate) u.lastDate = b.booking_date;
  }

  if (userMap.size === 0) return { error: null, data: [] };

  const userIds = [...userMap.keys()];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, city")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const clients: CanchaClient[] = userIds.map(uid => {
    const stats  = userMap.get(uid)!;
    const tag    = tagMap.get(uid);
    const p: any = profileMap.get(uid);
    return {
      user_id:           uid,
      full_name:         p?.full_name   ?? null,
      username:          p?.username    ?? null,
      avatar_url:        p?.avatar_url  ?? null,
      city:              p?.city        ?? null,
      total_bookings:    stats.total,
      confirmed:         stats.confirmed,
      cancelled:         stats.cancelled,
      pending:           stats.pending,
      total_spent:       stats.spent,
      last_booking_date: stats.lastDate,
      tag:               tag?.tag   ?? null,
      tag_notes:         tag?.notes ?? null,
    };
  }).sort((a, b) => b.total_bookings - a.total_bookings);

  return { error: null, data: clients };
}

export async function upsertClientTag(
  supabase: SupabaseClient,
  canchaId: string,
  userId: string,
  tag: ClientTag,
  notes?: string,
  createdBy?: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("cancha_client_tags")
    .upsert(
      { cancha_id: canchaId, user_id: userId, tag, notes: notes ?? null, created_by: createdBy ?? null, updated_at: new Date().toISOString() },
      { onConflict: "cancha_id,user_id" },
    );
  if (error) return { error: error.message, data: null };
  return { error: null, data: null };
}

export async function removeClientTag(
  supabase: SupabaseClient,
  canchaId: string,
  userId: string,
): Promise<ApiResult<null>> {
  const { error } = await supabase
    .from("cancha_client_tags")
    .delete()
    .eq("cancha_id", canchaId)
    .eq("user_id", userId);
  if (error) return { error: error.message, data: null };
  return { error: null, data: null };
}
