/**
 * recurring-expand.ts
 *
 * Pure function that expands a RecurringBooking into concrete occurrences
 * within a given date range, applying exceptions (cancellations / modifications).
 *
 * No external date-library dependency — uses native JS Date with UTC operations.
 */

import type { RecurringBooking, RecurringException, RecurringExceptionAction } from "../types/db";

export type { RecurringException, RecurringExceptionAction };

// ─── Exported output type ────────────────────────────────────────────────────

export interface ExpandedOccurrence {
  date: string;       // "YYYY-MM-DD"
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  price: number;
  isRecurring: true;
  recurringId: string;
  isException: boolean;
}

// ─── Frequency type (column being added in this phase) ──────────────────────

export type RecurringFrequency = "weekly" | "biweekly" | "monthly";

// RecurringBooking from db.ts has end_date as string (non-nullable) but the DB
// allows NULL. We work with a looser local shape to handle that gracefully.
type RecurringBookingWithFrequency = RecurringBooking & {
  frequency?: RecurringFrequency;
  end_date: string | null;
};

// ─── Helper functions (internal, not exported) ───────────────────────────────

/** Parse "YYYY-MM-DD" into a UTC Date (midnight). */
function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Format a UTC Date back to "YYYY-MM-DD". */
function formatDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 0 = Sunday … 6 = Saturday (UTC) */
function getDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

/** Return a new Date that is n days after date (non-mutating). */
function addDays(date: Date, n: number): Date {
  return new Date(date.getTime() + n * 86_400_000);
}

/**
 * Return which occurrence of the weekday this date is within its month.
 * E.g. "first Tuesday" → 1, "third Monday" → 3.
 * Used for monthly recurrence.
 */
function getWeekNumberInMonth(date: Date): number {
  const dayOfMonth = date.getUTCDate(); // 1-based
  return Math.ceil(dayOfMonth / 7);
}

/**
 * Given a target month (year + month, 0-indexed) and the anchor weekday
 * (0-6) and which ordinal occurrence (1-5), return the matching date.
 * Returns null if that ordinal doesn't exist in the month (e.g. 5th Monday
 * in a month that only has 4 Mondays).
 */
function nthWeekdayOfMonth(
  year: number,
  month: number, // 0-indexed
  weekday: number,
  ordinal: number, // 1-based
): Date | null {
  // Start on the 1st of the target month
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = getDayOfWeek(first);
  // Days until the first occurrence of `weekday` in this month
  const daysToFirst = (weekday - firstWeekday + 7) % 7;
  const targetDay = 1 + daysToFirst + (ordinal - 1) * 7;

  // Verify the target day is still within the same month
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  if (targetDay > daysInMonth) return null;

  return new Date(Date.UTC(year, month, targetDay));
}

// ─── Main exported function ──────────────────────────────────────────────────

/**
 * Expand a recurring booking into concrete occurrences within [fromDate, toDate].
 *
 * @param recurring  - The recurring booking record (must include `frequency`).
 * @param exceptions - List of exception records for this recurring booking.
 * @param fromDate   - Range start "YYYY-MM-DD" (inclusive).
 * @param toDate     - Range end   "YYYY-MM-DD" (inclusive).
 * @returns Array of expanded occurrences sorted by date ascending.
 */
export function expandToBookings(
  recurring: RecurringBookingWithFrequency,
  exceptions: RecurringException[],
  fromDate: string,
  toDate: string,
): ExpandedOccurrence[] {
  // ── Guard: inactive status ────────────────────────────────────────────────
  if (recurring.status === "cancelada" || recurring.status === "pausada") {
    return [];
  }

  const seriesStart = parseDate(recurring.start_date);
  const seriesEnd = recurring.end_date
    ? parseDate(recurring.end_date)
    : parseDate("9999-12-31");

  const rangeFrom = parseDate(fromDate);
  const rangeTo = parseDate(toDate);

  // ── Guard: no overlap ─────────────────────────────────────────────────────
  if (rangeTo < seriesStart || rangeFrom > seriesEnd) {
    return [];
  }

  // ── Guard: empty range ────────────────────────────────────────────────────
  if (rangeTo < rangeFrom) {
    return [];
  }

  // ── Build exception map keyed by original_date ────────────────────────────
  const exceptionMap = new Map<string, RecurringException>();
  for (const ex of exceptions) {
    exceptionMap.set(ex.original_date, ex);
  }

  // ── Determine iteration bounds ────────────────────────────────────────────
  const iterStart =
    seriesStart > rangeFrom ? seriesStart : rangeFrom;
  const iterEnd =
    seriesEnd < rangeTo ? seriesEnd : rangeTo;

  const frequency = recurring.frequency ?? "weekly";

  // For monthly recurrence: compute the anchor week-ordinal from start_date.
  const anchorWeekOrdinal =
    frequency === "monthly" ? getWeekNumberInMonth(seriesStart) : 0;

  // For biweekly: pre-compute how many weeks from start_date the first
  // occurrence in the iteration window is, so we can test even/odd parity.
  // We track parity by counting full 14-day periods from series start.
  const results: ExpandedOccurrence[] = [];

  if (frequency === "monthly") {
    // ── Monthly: iterate month by month within the range ───────────────────
    let year = iterStart.getUTCFullYear();
    let month = iterStart.getUTCMonth(); // 0-indexed

    const endYear = iterEnd.getUTCFullYear();
    const endMonth = iterEnd.getUTCMonth();

    while (year < endYear || (year === endYear && month <= endMonth)) {
      const candidate = nthWeekdayOfMonth(
        year,
        month,
        recurring.day_of_week,
        anchorWeekOrdinal,
      );

      if (candidate !== null) {
        const candidateStr = formatDate(candidate);
        const candidateTs = candidate.getTime();
        const iterStartTs = iterStart.getTime();
        const iterEndTs = iterEnd.getTime();

        if (candidateTs >= iterStartTs && candidateTs <= iterEndTs) {
          const occ = buildOccurrence(
            recurring,
            candidateStr,
            exceptionMap,
          );
          if (occ !== null) results.push(occ);
        }
      }

      // Advance to next month
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
  } else {
    // ── Weekly / biweekly: walk day by day ────────────────────────────────
    let current = iterStart;
    const iterEndTs = iterEnd.getTime();

    while (current.getTime() <= iterEndTs) {
      if (getDayOfWeek(current) === recurring.day_of_week) {
        // Check frequency alignment
        if (frequency === "weekly" || isAlignedBiweekly(seriesStart, current)) {
          const candidateStr = formatDate(current);
          const occ = buildOccurrence(recurring, candidateStr, exceptionMap);
          if (occ !== null) results.push(occ);
        }
      }
      current = addDays(current, 1);
    }
  }

  return results;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Returns true if `candidate` falls on an even biweekly cycle from `seriesStart`.
 * Both dates are assumed to share the same weekday.
 */
function isAlignedBiweekly(seriesStart: Date, candidate: Date): boolean {
  const diffMs = candidate.getTime() - seriesStart.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  // diffDays should be a multiple of 7; biweekly = multiple of 14
  return diffDays % 14 === 0;
}

/**
 * Build a single ExpandedOccurrence for `dateStr`, applying any exception.
 * Returns null if the occurrence is cancelled.
 */
function buildOccurrence(
  recurring: RecurringBookingWithFrequency,
  dateStr: string,
  exceptionMap: Map<string, RecurringException>,
): ExpandedOccurrence | null {
  const exception = exceptionMap.get(dateStr);

  if (exception) {
    if (exception.action === "cancelled") {
      return null; // omit entirely
    }
    // action === "modified"
    return {
      date: dateStr,
      start_time: exception.new_start ?? recurring.start_time,
      end_time: exception.new_end ?? recurring.end_time,
      price: exception.new_price ?? recurring.price_per_session,
      isRecurring: true,
      recurringId: recurring.id,
      isException: true,
    };
  }

  return {
    date: dateStr,
    start_time: recurring.start_time,
    end_time: recurring.end_time,
    price: recurring.price_per_session,
    isRecurring: true,
    recurringId: recurring.id,
    isException: false,
  };
}
