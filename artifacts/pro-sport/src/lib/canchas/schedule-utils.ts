import type { ScheduleState } from "@/components/canchas/CanchaScheduleEditor";

// ─── Default schedule ────────────────────────────────────────────────────────

export const DEFAULT_SCHEDULE: ScheduleState[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  opens_at: "08:00",
  closes_at: "22:00",
  is_available: i !== 0,
}));

// ─── Slot-duration localStorage helpers ─────────────────────────────────────

export const slotStorage = {
  get: (canchaId: string): number =>
    parseInt(localStorage.getItem(`cancha_slot_${canchaId}`) ?? "60", 10),
  set: (canchaId: string, mins: number): void =>
    localStorage.setItem(`cancha_slot_${canchaId}`, String(mins)),
};

// ─── Pure schedule transformations ──────────────────────────────────────────

type PresetKey = "laboral_full" | "finde_only" | "todos_full" | "manana" | "tarde";

interface PresetConfig {
  opens_at: string;
  closes_at: string;
  days: number[];
}

const PRESETS: Record<PresetKey, PresetConfig> = {
  laboral_full: { opens_at: "08:00", closes_at: "22:00", days: [1, 2, 3, 4, 5] },
  finde_only:   { opens_at: "08:00", closes_at: "22:00", days: [0, 6] },
  todos_full:   { opens_at: "08:00", closes_at: "22:00", days: [0, 1, 2, 3, 4, 5, 6] },
  manana:       { opens_at: "07:00", closes_at: "13:00", days: [0, 1, 2, 3, 4, 5, 6] },
  tarde:        { opens_at: "14:00", closes_at: "22:00", days: [0, 1, 2, 3, 4, 5, 6] },
};

/** Return a new schedule array with the named preset applied. */
export function applyPreset(
  schedule: ScheduleState[],
  preset: PresetKey,
): ScheduleState[] {
  const p = PRESETS[preset];
  return schedule.map((d) => ({
    ...d,
    opens_at: p.days.includes(d.day_of_week) ? p.opens_at : d.opens_at,
    closes_at: p.days.includes(d.day_of_week) ? p.closes_at : d.closes_at,
    is_available:
      preset === "finde_only"
        ? [0, 6].includes(d.day_of_week)
        : preset === "laboral_full"
          ? [1, 2, 3, 4, 5].includes(d.day_of_week)
          : true,
  }));
}

/** Return a new schedule array with a day's settings copied to a group of days. */
export function applyToGroup(
  schedule: ScheduleState[],
  target: "all" | "laborales" | "finde",
  sourceDay: number,
): ScheduleState[] {
  const source = schedule.find((d) => d.day_of_week === sourceDay);
  if (!source) return schedule;

  const targets =
    target === "all" ? [0, 1, 2, 3, 4, 5, 6] :
    target === "laborales" ? [1, 2, 3, 4, 5] : [0, 6];

  return schedule.map((d) =>
    targets.includes(d.day_of_week)
      ? { ...d, opens_at: source.opens_at, closes_at: source.closes_at, is_available: source.is_available }
      : d,
  );
}
