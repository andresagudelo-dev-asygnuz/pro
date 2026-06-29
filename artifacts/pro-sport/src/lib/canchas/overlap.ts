/**
 * overlap.ts
 *
 * Pure helpers for detecting time-slot overlaps between recurring bookings.
 * Used by the recurring booking creation form (Task 4.4) to prevent conflicts.
 */

import type { RecurringBooking, RecurringException } from "../types/db";
import { expandToBookings } from "./recurring-expand";

// ─── Exported helpers ────────────────────────────────────────────────────────

/**
 * Check whether two "HH:MM" time ranges overlap on the same calendar day.
 * Two ranges overlap when A.start < B.end AND B.start < A.end
 * (standard half-open interval intersection).
 */
export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA < endB && startB < endA;
}

/**
 * Check whether a proposed new recurring booking would overlap with any of the
 * existing active recurring series for the same cancha.
 *
 * @param newRecurring      - The candidate series (not yet saved).
 * @param existingRecurrings - All active recurring bookings for the cancha.
 * @param existingExceptions - All exceptions for those recurring bookings.
 * @param weeksAhead         - How many weeks ahead to check (default 4).
 * @returns true if at least one occurrence of the new series conflicts with an
 *          occurrence of an existing series.
 */
export function hasOverlap(
  newRecurring: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    start_date: string;
    frequency: string;
  },
  existingRecurrings: RecurringBooking[],
  existingExceptions: RecurringException[],
  weeksAhead = 4,
): boolean {
  // Build the date range to check
  const fromDate = newRecurring.start_date;
  const toDate = addDaysToDateStr(fromDate, weeksAhead * 7);

  // Expand the candidate into occurrences within the range.
  // We cast to satisfy RecurringBookingWithFrequency inside expandToBookings.
  const candidateRecurring = {
    id: "__candidate__",
    cancha_id: "",
    user_id: "",
    day_of_week: newRecurring.day_of_week,
    start_time: newRecurring.start_time,
    end_time: newRecurring.end_time,
    start_date: newRecurring.start_date,
    end_date: null,
    frequency: newRecurring.frequency as RecurringBooking["frequency"],
    status: "pendiente" as const,
    price_per_session: 0,
    notes: null,
    confirmed_at: null,
    created_at: "",
    updated_at: "",
  } satisfies RecurringBooking;

  const candidateOccurrences = expandToBookings(candidateRecurring, [], fromDate, toDate);

  if (candidateOccurrences.length === 0) return false;

  // Build a set of "date|start|end" strings for fast lookup
  const candidateSlots = new Set(
    candidateOccurrences.map((o) => o.date),
  );

  // For each existing series, expand and check for date + time overlap
  for (const existing of existingRecurrings) {
    const exceptionsForThis = existingExceptions.filter(
      (ex) => ex.recurring_id === existing.id,
    );

    const existingOccurrences = expandToBookings(
      existing,
      exceptionsForThis,
      fromDate,
      toDate,
    );

    for (const occ of existingOccurrences) {
      if (!candidateSlots.has(occ.date)) continue;

      // Same date — check if times overlap
      const candidateOnDate = candidateOccurrences.find((c) => c.date === occ.date);
      if (!candidateOnDate) continue;

      if (
        timesOverlap(
          candidateOnDate.start_time,
          candidateOnDate.end_time,
          occ.start_time,
          occ.end_time,
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

// ─── Internal helper ──────────────────────────────────────────────────────────

/** Add `n` days to a "YYYY-MM-DD" string and return the resulting date string. */
function addDaysToDateStr(dateStr: string, n: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + n));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
