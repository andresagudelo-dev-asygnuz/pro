import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listRecurringWithExceptionsForCancha, updateRecurring } from "@/lib/canchas/recurring-api";
import { Badge } from "@/components/ui/badge";
import { CalendarOff } from "lucide-react";
import { toast } from "sonner";
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
  const queryClient = useQueryClient();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelFromDate, setCancelFromDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  async function handleCancelFrom(recurringId: string) {
    if (!cancelFromDate) return;
    // Set end_date to the day before cancelFromDate so that occurrence on cancelFromDate is excluded.
    const d = new Date(cancelFromDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    const endDate = d.toISOString().split("T")[0];
    setSaving(true);
    const { error } = await updateRecurring(supabase, recurringId, { end_date: endDate });
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Fechas restantes liberadas.");
      setCancelingId(null);
      setCancelFromDate("");
      queryClient.invalidateQueries({ queryKey: ["recurring", canchaId] });
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["recurring", canchaId],
    queryFn: async () => {
      const { data, error } = await listRecurringWithExceptionsForCancha(supabase, canchaId);
      if (error || !data) return { recurrings: [], exceptions: [] };
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

  const recurrings = data?.recurrings ?? [];

  if (recurrings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No hay series recurrentes activas.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {recurrings.map((r) => (
        <div key={r.id} className="rounded-xl border border-border/60 bg-background overflow-hidden">
          {/* Main row */}
          <div className="flex items-center gap-3 px-3 py-2.5">
            <button
              onClick={() => onSelect?.(r)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold">
                  {r.day_of_week != null ? DAY_LABELS[r.day_of_week] : "Día"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.start_time?.substring(0, 5) ?? "--:--"}–{r.end_time?.substring(0, 5) ?? "--:--"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {r.frequency ? FREQUENCY_LABELS[r.frequency] : "Frecuencia"}
                </span>
                <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                  ${Number(r.price_per_session || 0).toLocaleString("es-CO")}/sesión
                </span>
              </div>
            </button>

            <StatusBadge status={r.status} />

            {/* Cancel-from trigger — only for active series */}
            {(r.status === "confirmada" || r.status === "pendiente") && (
              <button
                onClick={() => {
                  if (cancelingId === r.id) {
                    setCancelingId(null);
                    setCancelFromDate("");
                  } else {
                    setCancelingId(r.id);
                    setCancelFromDate(todayStr);
                  }
                }}
                title="Cancelar temporada desde una fecha"
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <CalendarOff className="size-4" />
              </button>
            )}
          </div>

          {/* Inline cancel-from panel */}
          {cancelingId === r.id && (
            <div className="px-3 pb-3 border-t border-border/30 pt-2.5 flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                Liberar todas las fechas <strong>desde</strong>:
              </p>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={cancelFromDate}
                  min={todayStr}
                  onChange={(e) => setCancelFromDate(e.target.value)}
                  className="border border-border/60 rounded-lg px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1"
                />
                <button
                  onClick={() => handleCancelFrom(r.id)}
                  disabled={!cancelFromDate || saving}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50 shrink-0"
                >
                  {saving ? "Guardando..." : "Confirmar"}
                </button>
                <button
                  onClick={() => { setCancelingId(null); setCancelFromDate(""); }}
                  className="px-3 py-1 rounded-lg text-xs text-muted-foreground hover:bg-muted/50 transition-colors shrink-0"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
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
