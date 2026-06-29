import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getCanchaById, getCanchaSchedules, upsertCanchaSchedules } from "@/lib/canchas/api";
import {
  DEFAULT_SCHEDULE,
  slotStorage,
  applyPreset as applyPresetUtil,
  applyToGroup as applyToGroupUtil,
} from "@/lib/canchas/schedule-utils";
import { toast } from "sonner";
import type { Cancha, CanchaSchedule } from "@/lib/types/db";
import type { ScheduleState } from "@/components/canchas/CanchaScheduleEditor";

export interface UseCanchaScheduleResult {
  cancha: Cancha | null;
  schedule: ScheduleState[];
  loadingCancha: boolean;
  savingSchedule: boolean;
  slotMinutes: number;
  updateDay: (dayOfWeek: number, field: keyof ScheduleState, value: string | boolean) => void;
  applyPreset: (preset: "laboral_full" | "finde_only" | "todos_full" | "manana" | "tarde") => void;
  applyToGroup: (target: "all" | "laborales" | "finde", sourceDay: number) => void;
  changeSlotDuration: (mins: number) => void;
  saveSchedule: () => Promise<void>;
}

export function useCanchaSchedule(canchaId: string): UseCanchaScheduleResult {
  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [schedule, setSchedule] = useState<ScheduleState[]>(DEFAULT_SCHEDULE);
  const [loadingCancha, setLoadingCancha] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [slotMinutes, setSlotMinutesState] = useState<number>(() =>
    canchaId ? slotStorage.get(canchaId) : 60,
  );

  // Load cancha + schedule on mount
  useEffect(() => {
    if (!canchaId) return;
    Promise.all([
      getCanchaById(supabase, canchaId),
      getCanchaSchedules(supabase, canchaId),
    ]).then(([canchaRes, schedRes]) => {
      if (canchaRes.data) setCancha(canchaRes.data);
      if (schedRes.data && schedRes.data.length > 0) {
        const merged = DEFAULT_SCHEDULE.map((def) => {
          const existing = (schedRes.data as CanchaSchedule[]).find(
            (s) => s.day_of_week === def.day_of_week,
          );
          if (!existing) return def;
          return {
            day_of_week: existing.day_of_week,
            opens_at: existing.opens_at.substring(0, 5),
            closes_at: existing.closes_at.substring(0, 5),
            is_available: existing.is_available,
          };
        });
        setSchedule(merged);
      }
      setLoadingCancha(false);
    });
  }, [canchaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDay = useCallback(
    (dayOfWeek: number, field: keyof ScheduleState, value: string | boolean) => {
      setSchedule((prev) =>
        prev.map((d) => (d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d)),
      );
    },
    [],
  );

  const applyPreset = useCallback(
    (preset: "laboral_full" | "finde_only" | "todos_full" | "manana" | "tarde") => {
      setSchedule((prev) => applyPresetUtil(prev, preset));
      toast.success("Preset aplicado. Revisá y guardá.");
    },
    [],
  );

  const applyToGroup = useCallback(
    (target: "all" | "laborales" | "finde", sourceDay: number) => {
      setSchedule((prev) => applyToGroupUtil(prev, target, sourceDay));
      toast.success("Horario aplicado.");
    },
    [],
  );

  const changeSlotDuration = useCallback(
    (mins: number) => {
      setSlotMinutesState(mins);
      slotStorage.set(canchaId, mins);
      toast.success(`Turno de ${mins < 60 ? mins + " min" : mins / 60 + "h"} configurado.`);
    },
    [canchaId],
  );

  const saveSchedule = useCallback(async () => {
    setSavingSchedule(true);
    const { error } = await upsertCanchaSchedules(supabase, canchaId, schedule);
    if (error) toast.error(error);
    else toast.success("Horarios guardados. Se aplican automáticamente cada semana.");
    setSavingSchedule(false);
  }, [canchaId, schedule]);

  return {
    cancha,
    schedule,
    loadingCancha,
    savingSchedule,
    slotMinutes,
    updateDay,
    applyPreset,
    applyToGroup,
    changeSlotDuration,
    saveSchedule,
  };
}
