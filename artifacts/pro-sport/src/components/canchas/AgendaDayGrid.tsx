import { AgendaBookingCard } from "./AgendaBookingCard";
import type { AgendaItem } from "@/hooks/useAgendaData";

interface AgendaDayGridProps {
  items: AgendaItem[];
  weekStart: Date;
  onItemClick: (item: AgendaItem) => void;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDayHeader(date: Date): { weekday: string; day: string } {
  return {
    weekday: date.toLocaleDateString("es-CO", { weekday: "short" }).slice(0, 3),
    day: String(date.getDate()),
  };
}

export function AgendaDayGrid({ items, weekStart, onItemClick }: AgendaDayGridProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      date,
      dateStr: toDateStr(date),
      ...formatDayHeader(date),
    };
  });

  const today = toDateStr(new Date());

  return (
    /* Horizontally scrollable on mobile, 7 columns on wider screens */
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <div className="grid grid-cols-7 gap-1 min-w-[560px]">
        {days.map(({ dateStr, weekday, day, date }) => {
          const dayItems = items.filter((i) => i.booking_date === dateStr);
          const isToday = dateStr === today;

          return (
            <div key={dateStr} className="flex flex-col gap-1">
              {/* Day header */}
              <div
                className={`flex flex-col items-center py-1.5 rounded-lg ${
                  isToday
                    ? "bg-violet-600 text-white"
                    : "bg-muted/40"
                }`}
              >
                <span
                  className={`text-[10px] font-medium capitalize ${
                    isToday ? "text-white/80" : "text-muted-foreground"
                  }`}
                >
                  {weekday}
                </span>
                <span
                  className={`text-sm font-bold leading-tight ${
                    isToday ? "text-white" : ""
                  }`}
                >
                  {day}
                </span>
              </div>

              {/* Bookings or empty */}
              <div className="flex flex-col gap-1 min-h-[40px]">
                {dayItems.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/50 text-center py-2 leading-tight">
                    Sin reservas
                  </p>
                ) : (
                  dayItems.map((item) => (
                    <AgendaBookingCard
                      key={item.id}
                      item={item}
                      onClick={() => onItemClick(item)}
                      isRecurring={item.isRecurring}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
