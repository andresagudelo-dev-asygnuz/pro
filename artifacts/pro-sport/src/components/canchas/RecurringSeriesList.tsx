import { supabase } from "@/lib/supabase";
/**
 * RecurringSeriesList.tsx
 *
 * Compact list of active recurring series for a cancha.
 * Uses useQuery + listRecurringByCancha and renders each series as a row.
 */

import { useQuery } from "@tanstack/react-query";
import { listRecurringByCancha } from "@/lib/canchas/recurring-api";
import { Badge } from "@/components/ui/badge";
import type { RecurringBooking } from "@/lib/types/db";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

const FREQUENCY_LABELS: Record<RecurringBooking["frequency"], string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecurringSeriesListProps {
  canchaId: string;
  onSelect?: (recurring: RecurringBooking) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecurringSeriesList({
  canchaId,
  onSelect,
}: RecurringSeriesListProps) {

  const { data, isLoading } = useQuery({
    queryKey: ["recurring", canchaId],
    queryFn: async () => {
      const { data, error } = await listRecurringByCancha(supabase, canchaId);
      if (error || !data) return [];
      return data;
    },
    enabled: !!canchaId,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No hay series recurrentes activas.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {data.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect?.(r)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 bg-background hover:bg-muted/40 transition-colors text-left"
        >
          {/* Day + time */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">
                {DAY_LABELS[r.day_of_week]}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.start_time.substring(0, 5)}–{r.end_time.substring(0, 5)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {FREQUENCY_LABELS[r.frequency]}
              </span>
              <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                ${Number(r.price_per_session).toLocaleString("es-CO")}/sesión
              </span>
            </div>
          </div>

          {/* Status badge */}
          <StatusBadge status={r.status} />
        </button>
      ))}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RecurringBooking["status"] }) {
  const map: Record<RecurringBooking["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    pendiente: { label: "Pendiente", variant: "secondary" },
    confirmada: { label: "Confirmada", variant: "default" },
    pausada: { label: "Pausada", variant: "outline" },
    cancelada: { label: "Cancelada", variant: "destructive" },
  };

  const { label, variant } = map[status] ?? map.pendiente;

  return (
    <Badge variant={variant} className="text-[10px] shrink-0">
      {label}
    </Badge>
  );
}
