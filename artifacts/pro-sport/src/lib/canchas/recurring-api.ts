/**
 * recurring-api.ts
 *
 * Supabase data-access layer for recurring bookings and their exceptions.
 * All functions follow the { data, error } contract — never throw.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecurringBooking, RecurringException } from "../types/db";
import { mapDbError } from "../errors/map-db-error";
import { expandToBookings, type ExpandedOccurrence } from "./recurring-expand";

// ─── Input type ──────────────────────────────────────────────────────────────

export type RecurringBookingInput = {
  cancha_id: string;
  user_id: string;
  day_of_week: number;     // 0 = domingo … 6 = sábado
  start_time: string;      // "HH:MM"
  end_time: string;        // "HH:MM"
  start_date: string;      // "YYYY-MM-DD"
  end_date?: string | null;
  price_per_session: number;
  frequency: "weekly" | "biweekly" | "monthly";
  notes?: string | null;
};

// ─── 1. createRecurring ──────────────────────────────────────────────────────

/**
 * Insert a new recurring booking with status="pendiente".
 * The `userId` parameter is the authenticated caller; `input.user_id` is the
 * client being booked for (owner can book on behalf of a client).
 */
export async function createRecurring(
  supabase: SupabaseClient,
  input: RecurringBookingInput,
  userId: string,
): Promise<{ data: RecurringBooking | null; error: string | null }> {
  const { data, error } = await supabase
    .from("recurring_bookings")
    .insert({
      cancha_id: input.cancha_id,
      user_id: input.user_id,
      day_of_week: input.day_of_week,
      start_time: input.start_time,
      end_time: input.end_time,
      start_date: input.start_date,
      end_date: input.end_date ?? null,
      price_per_session: input.price_per_session,
      frequency: input.frequency,
      notes: input.notes ?? null,
      status: "pendiente",
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: mapDbError(error, "recurring_create") };
  }

  // Suppress unused-variable warning: userId is available for RLS / audit trails
  void userId;

  return { data: data as RecurringBooking, error: null };
}

// ─── 2. updateRecurring ──────────────────────────────────────────────────────

/**
 * Update editable fields of an existing recurring booking series.
 */
export async function updateRecurring(
  supabase: SupabaseClient,
  id: string,
  input: Partial<RecurringBookingInput>,
): Promise<{ data: RecurringBooking | null; error: string | null }> {
  const patch: Record<string, unknown> = {};
  if (input.cancha_id !== undefined)        patch.cancha_id = input.cancha_id;
  if (input.user_id !== undefined)          patch.user_id = input.user_id;
  if (input.day_of_week !== undefined)      patch.day_of_week = input.day_of_week;
  if (input.start_time !== undefined)       patch.start_time = input.start_time;
  if (input.end_time !== undefined)         patch.end_time = input.end_time;
  if (input.start_date !== undefined)       patch.start_date = input.start_date;
  if ("end_date" in input)                  patch.end_date = input.end_date ?? null;
  if (input.price_per_session !== undefined) patch.price_per_session = input.price_per_session;
  if (input.frequency !== undefined)        patch.frequency = input.frequency;
  if ("notes" in input)                     patch.notes = input.notes ?? null;

  const { data, error } = await supabase
    .from("recurring_bookings")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { data: null, error: mapDbError(error, "recurring_update") };
  }

  return { data: data as RecurringBooking, error: null };
}

// ─── 3. cancelRecurring ──────────────────────────────────────────────────────

/**
 * Soft-cancel a recurring booking by setting status="cancelada".
 */
export async function cancelRecurring(
  supabase: SupabaseClient,
  id: string,
): Promise<{ data: RecurringBooking | null; error: string | null }> {
  const { data, error } = await supabase
    .from("recurring_bookings")
    .update({ status: "cancelada" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { data: null, error: mapDbError(error, "recurring_cancel") };
  }

  return { data: data as RecurringBooking, error: null };
}

// ─── 4. listRecurringByCancha ────────────────────────────────────────────────

/**
 * List all non-cancelled recurring bookings for a cancha.
 */
export async function listRecurringByCancha(
  supabase: SupabaseClient,
  canchaId: string,
): Promise<{ data: RecurringBooking[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("recurring_bookings")
    .select("*")
    .eq("cancha_id", canchaId)
    .neq("status", "cancelada");

  if (error) {
    return { data: null, error: mapDbError(error, "recurring_list_by_cancha") };
  }

  return { data: (data ?? []) as RecurringBooking[], error: null };
}

// ─── 5. listExceptionsByRecurring ────────────────────────────────────────────

/**
 * Fetch all exceptions for a single recurring booking series.
 */
export async function listExceptionsByRecurring(
  supabase: SupabaseClient,
  recurringId: string,
): Promise<{ data: RecurringException[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from("recurring_exceptions")
    .select("*")
    .eq("recurring_id", recurringId);

  if (error) {
    return { data: null, error: mapDbError(error, "recurring_exceptions_list") };
  }

  return { data: (data ?? []) as RecurringException[], error: null };
}

// ─── 6. createException ──────────────────────────────────────────────────────

/**
 * Insert a new exception record for a recurring booking.
 */
export async function createException(
  supabase: SupabaseClient,
  input: Omit<RecurringException, "id" | "created_at">,
): Promise<{ data: RecurringException | null; error: string | null }> {
  const { data, error } = await supabase
    .from("recurring_exceptions")
    .insert(input)
    .select()
    .single();

  if (error) {
    return { data: null, error: mapDbError(error, "recurring_exception_create") };
  }

  return { data: data as RecurringException, error: null };
}

// ─── 7. listRecurringWithExceptionsForCancha ─────────────────────────────────

/**
 * Fetch all active recurring bookings for a cancha together with their exceptions.
 * Uses two sequential queries to avoid a JOIN: first fetches recurrings, then
 * fetches exceptions filtered by the returned IDs.
 *
 * Returns early (empty arrays, no second query) if no recurrings are found.
 */
export async function listRecurringWithExceptionsForCancha(
  supabase: SupabaseClient,
  canchaId: string,
): Promise<{
  data: { recurrings: RecurringBooking[]; exceptions: RecurringException[] } | null;
  error: string | null;
}> {
  // First query: active recurrings
  const { data: recurrings, error: recurringsError } = await supabase
    .from("recurring_bookings")
    .select("*")
    .eq("cancha_id", canchaId)
    .neq("status", "cancelada");

  if (recurringsError) {
    return {
      data: null,
      error: mapDbError(recurringsError, "recurring_with_exceptions_recurrings"),
    };
  }

  const recurringsList = (recurrings ?? []) as RecurringBooking[];

  // Short-circuit: no recurrings → no need for a second query
  if (recurringsList.length === 0) {
    return { data: { recurrings: [], exceptions: [] }, error: null };
  }

  // Second query: exceptions for all returned recurring IDs
  const ids = recurringsList.map((r) => r.id);

  const { data: exceptions, error: exceptionsError } = await supabase
    .from("recurring_exceptions")
    .select("*")
    .in("recurring_id", ids);

  if (exceptionsError) {
    return {
      data: null,
      error: mapDbError(exceptionsError, "recurring_with_exceptions_exceptions"),
    };
  }

  return {
    data: {
      recurrings: recurringsList,
      exceptions: (exceptions ?? []) as RecurringException[],
    },
    error: null,
  };
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export { expandToBookings, type ExpandedOccurrence } from "./recurring-expand";
