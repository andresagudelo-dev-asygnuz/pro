import { ChevronLeft, ChevronRight } from "lucide-react";

interface AgendaWeekSelectorProps {
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
}

function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const month = weekEnd.toLocaleDateString("es-CO", { month: "long" });
  const year = weekEnd.getFullYear();

  const startMonth = weekStart.toLocaleDateString("es-CO", { month: "long" });

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startDay}–${endDay} ${month} ${year}`;
  }
  return `${startDay} ${startMonth} – ${endDay} ${month} ${year}`;
}

export function AgendaWeekSelector({ weekStart, onPrev, onNext }: AgendaWeekSelectorProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-1">
      <button
        onClick={onPrev}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Semana anterior"
      >
        <ChevronLeft className="size-4" />
      </button>

      <span className="text-sm font-semibold text-center flex-1 capitalize">
        {formatWeekLabel(weekStart)}
      </span>

      <button
        onClick={onNext}
        className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Semana siguiente"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
