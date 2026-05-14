import { Button } from "@/components/ui/button";
import { Copy, Clock, Repeat2 } from "lucide-react";
import { DAY_LABELS } from "@/lib/types/db";

export type ScheduleState = {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_available: boolean;
};

interface CanchaScheduleEditorProps {
  schedule: ScheduleState[];
  slotMinutes: number;
  isSaving: boolean;
  onUpdateDay: (dayOfWeek: number, field: keyof ScheduleState, value: string | boolean) => void;
  onApplyToGroup: (target: "all" | "laborales" | "finde", sourceDay: number) => void;
  onApplyPreset: (preset: "laboral_full" | "finde_only" | "todos_full" | "manana" | "tarde") => void;
  onChangeSlotDuration: (mins: number) => void;
  onSave: () => void;
}

export function CanchaScheduleEditor({
  schedule,
  slotMinutes,
  isSaving,
  onUpdateDay,
  onApplyToGroup,
  onApplyPreset,
  onChangeSlotDuration,
  onSave,
}: CanchaScheduleEditorProps) {
  return (
    <div className="px-5 pb-5 space-y-5 border-t border-border/50 pt-5">
      {/* Slot duration */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Clock className="size-3.5 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Duración del turno
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[30, 60, 90, 120].map((mins) => (
            <button
              key={mins}
              onClick={() => onChangeSlotDuration(mins)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                slotMinutes === mins
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : "border-border/60 hover:border-violet-400 hover:text-violet-600"
              }`}
            >
              {mins < 60 ? `${mins} min` : `${mins / 60}h`}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Cada jugador reserva bloques de{" "}
          {slotMinutes < 60 ? `${slotMinutes} min` : `${slotMinutes / 60}h`}.
        </p>
      </div>

      {/* Presets */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Presets rápidos
        </p>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "todos_full",   label: "Todos los días 8–22" },
            { key: "laboral_full", label: "Lun–Vie 8–22" },
            { key: "finde_only",   label: "Solo finde" },
            { key: "manana",       label: "Solo mañana 7–13" },
            { key: "tarde",        label: "Solo tarde 14–22" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => onApplyPreset(key as Parameters<typeof onApplyPreset>[0])}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border/60 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 transition-all"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Day editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Días y horarios
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Copy className="size-3" />
            <span>Copiar →</span>
            {["all", "laborales", "finde"].map((t) => (
              <button
                key={t}
                onClick={() => {
                  const firstAvail = schedule.find((d) => d.is_available);
                  if (firstAvail) onApplyToGroup(t as "all" | "laborales" | "finde", firstAvail.day_of_week);
                }}
                className="px-2 py-0.5 rounded-md bg-muted hover:bg-violet-100 dark:hover:bg-violet-900/20 hover:text-violet-600 transition-colors font-medium"
              >
                {t === "all" ? "Todos" : t === "laborales" ? "Lun–Vie" : "Sáb–Dom"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {schedule.map((day) => (
            <div
              key={day.day_of_week}
              className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${
                day.is_available
                  ? "border-border/60 bg-background"
                  : "border-transparent bg-muted/40"
              }`}
            >
              <label className="flex items-center gap-2 shrink-0 cursor-pointer min-w-[72px]">
                <input
                  type="checkbox"
                  checked={day.is_available}
                  onChange={(e) => onUpdateDay(day.day_of_week, "is_available", e.target.checked)}
                  className="size-4 rounded border-input accent-violet-600"
                />
                <span className={`text-sm font-semibold ${!day.is_available ? "text-muted-foreground" : ""}`}>
                  {DAY_LABELS[day.day_of_week]}
                </span>
              </label>

              {day.is_available ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={day.opens_at}
                    onChange={(e) => onUpdateDay(day.day_of_week, "opens_at", e.target.value)}
                    className="border border-border/60 rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">a</span>
                  <input
                    type="time"
                    value={day.closes_at}
                    onChange={(e) => onUpdateDay(day.day_of_week, "closes_at", e.target.value)}
                    className="border border-border/60 rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1"
                  />
                  <div className="flex gap-1 shrink-0">
                    {(["all", "laborales", "finde"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => onApplyToGroup(t, day.day_of_week)}
                        title={`Copiar a ${t === "all" ? "todos" : t === "laborales" ? "Lun–Vie" : "Sáb–Dom"}`}
                        className="h-7 px-2 text-[10px] font-medium rounded-md border border-border/60 hover:border-violet-400 hover:text-violet-600 transition-colors"
                      >
                        {t === "all" ? "Todos" : t === "laborales" ? "L–V" : "S–D"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">Cerrado</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={onSave}
        disabled={isSaving}
        className="w-full rounded-xl bg-violet-600 hover:bg-violet-700"
      >
        {isSaving ? "Guardando…" : "Guardar horarios"}
      </Button>
    </div>
  );
}
