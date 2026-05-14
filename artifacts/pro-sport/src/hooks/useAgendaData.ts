import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getCanchaBookingsForDate } from "@/lib/canchas/api";
import { listRecurringWithExceptionsForCancha, expandToBookings } from "@/lib/canchas/recurring-api";
import type { ExpandedOccurrence } from "@/lib/canchas/recurring-api";

// ─── AgendaItem discriminated union ─────────────────────────────────────────

/**
 * Represents a single booking slot on the agenda, either an ad-hoc booking or
 * an expanded occurrence of a recurring series.
 *
 * Both variants expose the same flat fields needed by AgendaDayGrid and
 * AgendaBookingCard so components can render them uniformly without switching
 * on `kind`.
 */
export type AgendaItem =
  | {
      kind: "adhoc";
      /** Unique identifier (booking row id). */
      id: string;
      /** "YYYY-MM-DD" — calendar date of this slot. */
      booking_date: string;
      start_time: string;
      end_time: string;
      status: string; // "pendiente" | "confirmada" | "cancelada"
      total_price: number;
      notes?: string;
      customer_name?: string;
      customer_id?: string;
      isRecurring: false;
      /** The raw ExpandedOccurrence — undefined for ad-hoc items. */
      occurrence?: undefined;
    }
  | {
      kind: "recurring";
      /** Synthetic id composed from recurringId + date. */
      id: string;
      /** "YYYY-MM-DD" — calendar date of this occurrence. */
      booking_date: string;
      start_time: string;
      end_time: string;
      /** Recurring occurrences don't have a booking status — use "confirmada". */
      status: "confirmada";
      total_price: number;
      notes?: undefined;
      customer_name?: undefined;
      customer_id?: undefined;
      isRecurring: true;
      /** The raw ExpandedOccurrence for downstream use (Task 4.4+). */
      occurrence: ExpandedOccurrence;
    };

// ─── Hook result ──────────────────────────────────────────────────────────────

interface UseAgendaDataResult {
  items: AgendaItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  weekStart: Date;
  fromDate: string;
  toDate: string;
}

// ─── Date utilities ───────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Format a local Date to "YYYY-MM-DD". */
function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAgendaData(canchaId: string, weekStart: Date): UseAgendaDataResult {
  const supabase = createClient();

  // Visible range: 1 week before weekStart … weekStart + 13 days.
  // This ensures recurring expansions cover the full visible grid plus
  // one extra week on each side to avoid edge-case gaps.
  const fromDate = toDateStr(addDays(weekStart, -7));
  const toDate = toDateStr(addDays(weekStart, 13));

  // ── Query 1: ad-hoc bookings for the 7 visible days ──────────────────────
  const {
    data: adhocData,
    isLoading: isLoadingBookings,
    error: bookingsError,
    refetch,
  } = useQuery({
    queryKey: ["agenda", canchaId, toDateStr(weekStart)],
    queryFn: async () => {
      if (!canchaId) return [];

      const dates = Array.from({ length: 7 }, (_, i) =>
        toDateStr(addDays(weekStart, i))
      );

      const results = await Promise.all(
        dates.map((date) => getCanchaBookingsForDate(supabase, canchaId, date))
      );

      return results.flatMap(({ data: bookings }) =>
        (bookings ?? []).map(
          (b): AgendaItem => ({
            id: b.id,
            booking_date: b.booking_date,
            start_time: b.start_time,
            end_time: b.end_time,
            status: b.status,
            total_price: Number(b.total_price),
            notes: b.notes ?? undefined,
            customer_id: b.booked_by,
            kind: "adhoc",
            isRecurring: false,
          })
        )
      );
    },
    enabled: !!canchaId,
  });

  // ── Query 2: recurring bookings + exceptions ──────────────────────────────
  const {
    data: recurringData,
    isLoading: isLoadingRecurring,
    error: recurringError,
  } = useQuery({
    queryKey: ["recurring", canchaId],
    queryFn: async () => {
      if (!canchaId) return { recurrings: [], exceptions: [] };
      const { data, error } = await listRecurringWithExceptionsForCancha(supabase, canchaId);
      if (error || !data) return { recurrings: [], exceptions: [] };
      return data;
    },
    enabled: !!canchaId,
  });

  // ── Combine ad-hoc + recurring occurrences via useMemo ───────────────────
  const items = useMemo<AgendaItem[]>(() => {
    const adhocItems: AgendaItem[] = adhocData ?? [];

    const recurringItems: AgendaItem[] = [];

    if (recurringData) {
      const { recurrings, exceptions } = recurringData;

      for (const recurring of recurrings) {
        const exceptionsForThis = exceptions.filter(
          (ex) => ex.recurring_id === recurring.id
        );

        const occurrences = expandToBookings(
          recurring,
          exceptionsForThis,
          fromDate,
          toDate,
        );

        for (const occ of occurrences) {
          recurringItems.push({
            kind: "recurring",
            id: `recurring-${occ.recurringId}-${occ.date}`,
            booking_date: occ.date,
            start_time: occ.start_time,
            end_time: occ.end_time,
            status: "confirmada",
            total_price: occ.price,
            isRecurring: true,
            occurrence: occ,
          });
        }
      }
    }

    const combined = [...adhocItems, ...recurringItems];

    // Sort by date ascending, then by start_time ascending
    combined.sort((a, b) => {
      const dateCmp = a.booking_date.localeCompare(b.booking_date);
      if (dateCmp !== 0) return dateCmp;
      return a.start_time.localeCompare(b.start_time);
    });

    return combined;
  }, [adhocData, recurringData, fromDate, toDate]);

  return {
    items,
    isLoading: isLoadingBookings || isLoadingRecurring,
    error: bookingsError
      ? (bookingsError as Error).message
      : recurringError
        ? (recurringError as Error).message
        : null,
    refetch,
    weekStart,
    fromDate,
    toDate,
  };
}
