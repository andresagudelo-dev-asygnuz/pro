import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgendaItem } from "@/hooks/useAgendaData";

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  pendiente: {
    label: "Pendiente",
    style:
      "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  },
  confirmada: {
    label: "Confirmada",
    style:
      "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
  },
  cancelada: {
    label: "Cancelada",
    style: "bg-muted text-muted-foreground border-transparent",
  },
};

interface AgendaBookingCardProps {
  item: AgendaItem;
  onClick: () => void;
  isRecurring?: boolean;
}

export function AgendaBookingCard({ item, onClick, isRecurring = false }: AgendaBookingCardProps) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pendiente;
  const startTime = item.start_time.substring(0, 5);
  const endTime = item.end_time.substring(0, 5);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-2.5 transition-colors hover:opacity-90",
        item.status === "pendiente"
          ? "border-amber-200 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-900/10"
          : "border-border/60 bg-background"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold tabular-nums">
              {startTime}–{endTime}
            </span>
            {isRecurring && (
              <RefreshCw className="size-3 text-violet-500 shrink-0" />
            )}
          </div>
          {item.customer_name && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {item.customer_name}
            </p>
          )}
          <p className="text-[11px] font-medium text-violet-600 dark:text-violet-400 mt-0.5">
            ${Number(item.total_price).toLocaleString("es-CO")}
          </p>
        </div>
        <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0", cfg.style)}>
          {cfg.label}
        </span>
      </div>
    </button>
  );
}
