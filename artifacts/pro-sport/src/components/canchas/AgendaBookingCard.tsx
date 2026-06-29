import { RefreshCw, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgendaItem } from "@/hooks/useAgendaData";
import type { PaymentStatus } from "@/lib/types/db";
import { usePendingBookingTimer } from "@/hooks/usePendingBookingTimer";

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  pendiente: {
    label: "Pendiente",
    style:
      "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700",
  },
  en_validacion: {
    label: "Por validar",
    style:
      "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700",
  },
  confirmada: {
    label: "Confirmada",
    style:
      "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
  },
  finalizada: {
    label: "Finalizada",
    style:
      "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
  },
  cancelada: {
    label: "Cancelada",
    style: "bg-muted text-muted-foreground border-transparent",
  },
};

const PAYMENT_DOT: Record<PaymentStatus, string> = {
  sin_anticipo: "bg-red-400",
  anticipo_pagado: "bg-amber-400",
  pagado_total: "bg-emerald-400",
  rechazado: "bg-rose-500",
};

const PAYMENT_TITLE: Record<PaymentStatus, string> = {
  sin_anticipo: "Sin anticipo",
  anticipo_pagado: "Anticipo pagado",
  pagado_total: "Pagado total",
  rechazado: "Comprobante rechazado",
};

interface AgendaBookingCardProps {
  item: AgendaItem;
  onClick: () => void;
  isRecurring?: boolean;
}

/** Inner component that safely calls the timer hook for pending bookings. */
function PendingCountdown({ expiresAt }: { expiresAt: string | null | undefined }) {
  const { minutes, seconds, expired, urgent } = usePendingBookingTimer(expiresAt ?? null);
  if (!expiresAt || expired) return null;
  const totalSecondsLeft = minutes * 60 + seconds;
  if (totalSecondsLeft > 5 * 60) return null; // Only show when < 5 min left
  return (
    <span
      className={cn(
        "text-[9px] font-mono font-bold tabular-nums",
        urgent ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
      )}
    >
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

export function AgendaBookingCard({ item, onClick, isRecurring = false }: AgendaBookingCardProps) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pendiente;
  const startTime = item.start_time.substring(0, 5);
  const endTime = item.end_time.substring(0, 5);
  const isEnValidacion = item.status === "en_validacion";
  const expiresAt = item.kind === "adhoc" ? item.expires_at : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-2.5 transition-colors hover:opacity-90",
        item.status === "pendiente"
          ? "border-amber-200 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-900/10"
          : isEnValidacion
          ? "border-orange-200 dark:border-orange-700/60 bg-orange-50/30 dark:bg-orange-900/10"
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
            {item.kind === "adhoc" && item.status === "pendiente" && (
              <PendingCountdown expiresAt={expiresAt} />
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
          {item.kind === "adhoc" && !isEnValidacion && (
            <span
              className={cn("inline-block mt-0.5 size-2 rounded-full", PAYMENT_DOT[item.payment_status])}
              title={PAYMENT_TITLE[item.payment_status]}
            />
          )}
          {isEnValidacion && (
            <span className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] font-semibold text-orange-600 dark:text-orange-400 animate-pulse">
              <FileCheck className="size-3" /> Comprobante recibido
            </span>
          )}
        </div>
        <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0", cfg.style)}>
          {cfg.label}
        </span>
      </div>
    </button>
  );
}
