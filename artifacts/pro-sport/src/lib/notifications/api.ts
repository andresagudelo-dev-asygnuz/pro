import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "@/lib/errors/map-db-error";
import type { Notification } from "@/lib/types/db";

type ApiResult<T> = { data: T | null; error: string | null };

// ── Notification type payloads ──────────────────────────────────────────────
export interface NotificationPayloads {
  // Match notifications
  match_joined:            { match_id: string; match_title: string; joiner_id: string; joiner_name: string };
  match_request:           { match_id: string; match_title: string; requester_id: string; requester_name: string };
  match_request_accepted:  { match_id: string; match_title: string };
  match_request_rejected:  { match_id: string; match_title: string };
  match_cancelled:         { match_id: string; match_title: string };
  match_updated:           { match_id: string; match_title: string };
  match_reminder:          { match_id: string; match_title: string; starts_at: string };
  match_invite:            { match_id: string; match_title: string; inviter_id: string; inviter_name: string };
  // Booking notifications (fields mirror DB booking row)
  booking_confirmed:       { cancha_id: string; cancha_name: string; booking_date: string; start_time: string; end_time: string; total_price: number };
  booking_cancelled:       { cancha_id: string; cancha_name: string; booking_date: string; start_time: string; end_time: string; total_price: number };
  booking_cancelled_owner: { cancha_id: string; cancha_name: string; booking_date: string; start_time: string; end_time: string; total_price: number };
  booking_rejected:        { cancha_id: string; cancha_name: string; booking_date: string };
  booking_new_request:     { cancha_id: string; cancha_name: string; booking_date: string; start_time: string; end_time: string; booker_name: string; booker_id: string };
  new_booking:             { cancha_id: string; cancha_name: string; booking_date: string; start_time: string; end_time: string; booker_name: string; booker_id: string };
  booking_receipt_uploaded:{ cancha_id: string; cancha_name: string; booking_date: string; start_time: string; end_time: string; booker_name: string };
  booking_payment_rejected:{ cancha_id: string; cancha_name: string; booking_date: string; start_time: string; end_time: string; reason: string };
  // Social notifications
  friend_request:          { from_id: string; from_name: string };
  friend_accepted:         { from_id: string; from_name: string };
  // Tournament notifications
  tournament_registered:   { tournament_id: string; tournament_name: string };
  tournament_started:      { tournament_id: string; tournament_name: string };
}

export type NotificationType = keyof NotificationPayloads;

// ── Base send function ──────────────────────────────────────────────────────
export async function sendNotification<T extends NotificationType>(
  supabase: SupabaseClient,
  userId: string,
  type: T,
  data: NotificationPayloads[T],
): Promise<void> {
  await supabase.from("notifications").insert({ user_id: userId, type, data });
}

// ── Typed convenience helpers ───────────────────────────────────────────────
export async function notifyMatchJoined(
  supabase: SupabaseClient,
  organizerId: string,
  payload: NotificationPayloads["match_joined"],
) {
  return sendNotification(supabase, organizerId, "match_joined", payload);
}

export async function notifyMatchRequest(
  supabase: SupabaseClient,
  organizerId: string,
  payload: NotificationPayloads["match_request"],
) {
  return sendNotification(supabase, organizerId, "match_request", payload);
}

export async function notifyMatchCancelled(
  supabase: SupabaseClient,
  participantId: string,
  payload: NotificationPayloads["match_cancelled"],
) {
  return sendNotification(supabase, participantId, "match_cancelled", payload);
}

export async function notifyBookingConfirmed(
  supabase: SupabaseClient,
  userId: string,
  payload: NotificationPayloads["booking_confirmed"],
) {
  return sendNotification(supabase, userId, "booking_confirmed", payload);
}

export async function notifyBookingCancelled(
  supabase: SupabaseClient,
  userId: string,
  payload: NotificationPayloads["booking_cancelled"],
) {
  return sendNotification(supabase, userId, "booking_cancelled", payload);
}

export async function notifyNewBooking(
  supabase: SupabaseClient,
  ownerId: string,
  payload: NotificationPayloads["new_booking"],
) {
  return sendNotification(supabase, ownerId, "new_booking", payload);
}

export async function notifyReceiptUploaded(
  supabase: SupabaseClient,
  ownerId: string,
  payload: NotificationPayloads["booking_receipt_uploaded"],
) {
  return sendNotification(supabase, ownerId, "booking_receipt_uploaded", payload);
}

export async function notifyPaymentRejected(
  supabase: SupabaseClient,
  userId: string,
  payload: NotificationPayloads["booking_payment_rejected"],
) {
  return sendNotification(supabase, userId, "booking_payment_rejected", payload);
}

export async function notifyFriendRequest(
  supabase: SupabaseClient,
  toUserId: string,
  payload: NotificationPayloads["friend_request"],
) {
  return sendNotification(supabase, toUserId, "friend_request", payload);
}

export async function notifyFriendAccepted(
  supabase: SupabaseClient,
  toUserId: string,
  payload: NotificationPayloads["friend_accepted"],
) {
  return sendNotification(supabase, toUserId, "friend_accepted", payload);
}

// ── CRUD DAL functions ──────────────────────────────────────────────────────

export async function getNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 60,
): Promise<ApiResult<Notification[]>> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { data: null, error: mapDbError(error, "getNotifications") };
  return { data: (data ?? []) as Notification[], error: null };
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  return { error: error ? mapDbError(error, "markAllNotificationsRead") : null };
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error ? mapDbError(error, "markNotificationRead") : null };
}

export async function deleteNotification(
  supabase: SupabaseClient,
  id: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  return { error: error ? mapDbError(error, "deleteNotification") : null };
}

export async function deleteReadNotifications(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("user_id", userId)
    .not("read_at", "is", null);
  return { error: error ? mapDbError(error, "deleteReadNotifications") : null };
}
