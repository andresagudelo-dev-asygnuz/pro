/**
 * Composition hook — assembles schedule management and bookings-for-date
 * into the combined interface consumed by CanchaAgendaPage.
 *
 * Public API is preserved identically so no consumer changes are required.
 */
import { useCanchaSchedule } from "@/hooks/useCanchaSchedule";
import { useCanchaBookingsForDate } from "@/hooks/useCanchaBookingsForDate";

interface UseAgendaActionsOptions {
  canchaId: string;
  userId: string | undefined;
  selectedDate: string;
  onNavigate: (path: string) => void;
  onRefetchAgenda: () => void;
}

export function useAgendaActions({
  canchaId,
  userId,
  selectedDate,
  onNavigate,
  onRefetchAgenda,
}: UseAgendaActionsOptions) {
  const schedule = useCanchaSchedule(canchaId);

  const bookings = useCanchaBookingsForDate({
    canchaId,
    cancha: schedule.cancha,
    selectedDate,
    userId,
    onNavigate,
    onRefetchAgenda,
  });

  return { ...schedule, ...bookings };
}
