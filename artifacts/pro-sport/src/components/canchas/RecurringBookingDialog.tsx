import { supabase } from "@/lib/supabase";
/**
 * RecurringBookingDialog.tsx
 *
 * Dialog for creating a new recurring booking series for a cancha.
 * Uses react-hook-form + zod for validation and calls createRecurring()
 * after an overlap check.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/context/AuthContext";
import {
  createRecurring,
  listRecurringWithExceptionsForCancha,
} from "@/lib/canchas/recurring-api";
import { hasOverlap } from "@/lib/canchas/overlap";

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z
  .object({
    day_of_week: z.coerce.number().min(0).max(6),
    start_time: z.string().min(1, "Requerido"),
    end_time: z.string().min(1, "Requerido"),
    start_date: z.string().min(1, "Requerido"),
    end_date: z.string().optional(),
    price_per_session: z.coerce.number().min(1, "Debe ser mayor a 0"),
    frequency: z.enum(["weekly", "biweekly", "monthly"]),
    notes: z.string().optional(),
  })
  .refine((d) => d.start_time < d.end_time, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["end_time"],
  });

type FormValues = z.infer<typeof schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecurringBookingDialogProps {
  canchaId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// ─── Day labels ───────────────────────────────────────────────────────────────

const DAY_OPTIONS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quincenal" },
  { value: "monthly", label: "Mensual" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function RecurringBookingDialog({
  canchaId,
  open,
  onOpenChange,
  onSuccess,
}: RecurringBookingDialogProps) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [overlapError, setOverlapError] = useState<string | null>(null);

  // Fetch existing recurring + exceptions for overlap check
  const { data: recurringData } = useQuery({
    queryKey: ["recurring", canchaId],
    queryFn: async () => {
      const { data, error } = await listRecurringWithExceptionsForCancha(
        supabase,
        canchaId,
      );
      if (error || !data) return { recurrings: [], exceptions: [] };
      return data;
    },
    enabled: !!canchaId && open,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      day_of_week: 1,
      frequency: "weekly",
    },
  });

  const watchedDayOfWeek = watch("day_of_week");
  const watchedFrequency = watch("frequency");

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast.error("Debes iniciar sesión");
      return;
    }

    setOverlapError(null);
    setSubmitting(true);

    try {
      const { recurrings = [], exceptions = [] } = recurringData ?? {};

      const overlap = hasOverlap(
        {
          day_of_week: values.day_of_week,
          start_time: values.start_time,
          end_time: values.end_time,
          start_date: values.start_date,
          frequency: values.frequency,
        },
        recurrings,
        exceptions,
      );

      if (overlap) {
        setOverlapError(
          "El horario se solapa con una serie recurrente existente",
        );
        return;
      }

      const { error } = await createRecurring(
        supabase,
        {
          cancha_id: canchaId,
          user_id: user.id,
          day_of_week: values.day_of_week,
          start_time: values.start_time,
          end_time: values.end_time,
          start_date: values.start_date,
          end_date: values.end_date || null,
          price_per_session: values.price_per_session,
          frequency: values.frequency,
          notes: values.notes || null,
        },
        user.id,
      );

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Serie recurrente creada");
      reset();
      onOpenChange(false);
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      reset();
      setOverlapError(null);
    }
    onOpenChange(value);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva reserva recurrente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Day of week */}
          <div className="space-y-1.5">
            <Label>Día de la semana</Label>
            <Select
              value={String(watchedDayOfWeek)}
              onValueChange={(v) =>
                setValue("day_of_week", Number(v), { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.day_of_week && (
              <p className="text-xs text-destructive">
                {errors.day_of_week.message}
              </p>
            )}
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Hora inicio</Label>
              <Input
                id="start_time"
                type="time"
                {...register("start_time")}
              />
              {errors.start_time && (
                <p className="text-xs text-destructive">
                  {errors.start_time.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">Hora fin</Label>
              <Input id="end_time" type="time" {...register("end_time")} />
              {errors.end_time && (
                <p className="text-xs text-destructive">
                  {errors.end_time.message}
                </p>
              )}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Fecha inicio</Label>
              <Input
                id="start_date"
                type="date"
                {...register("start_date")}
              />
              {errors.start_date && (
                <p className="text-xs text-destructive">
                  {errors.start_date.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">Fecha fin (opcional)</Label>
              <Input
                id="end_date"
                type="date"
                placeholder="Sin fecha de fin"
                {...register("end_date")}
              />
            </div>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label htmlFor="price_per_session">Precio por sesión</Label>
            <Input
              id="price_per_session"
              type="number"
              min={1}
              step={1}
              {...register("price_per_session")}
            />
            {errors.price_per_session && (
              <p className="text-xs text-destructive">
                {errors.price_per_session.message}
              </p>
            )}
          </div>

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label>Frecuencia</Label>
            <Select
              value={watchedFrequency}
              onValueChange={(v) =>
                setValue("frequency", v as FormValues["frequency"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.frequency && (
              <p className="text-xs text-destructive">
                {errors.frequency.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Notas adicionales..."
              {...register("notes")}
            />
          </div>

          {/* Overlap error */}
          {overlapError && (
            <p className="text-sm text-destructive font-medium">
              {overlapError}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Crear serie"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
