import { supabase } from "@/lib/supabase";
/**
 * RecurringOccurrenceMenu.tsx
 *
 * Sheet menu that appears when the user taps on a recurring occurrence in the
 * agenda. Allows editing or cancelling this occurrence or the whole series.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createException,
  updateRecurring,
  cancelRecurring,
} from "@/lib/canchas/recurring-api";
import type { ExpandedOccurrence } from "@/lib/canchas/recurring-api";

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const occurrenceSchema = z
  .object({
    start_time: z.string().min(1, "Requerido"),
    end_time: z.string().min(1, "Requerido"),
    price: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
  })
  .refine((d) => d.start_time < d.end_time, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["end_time"],
  });

const seriesSchema = z
  .object({
    start_time: z.string().min(1, "Requerido"),
    end_time: z.string().min(1, "Requerido"),
    price_per_session: z.coerce.number().min(0, "Debe ser mayor o igual a 0"),
  })
  .refine((d) => d.start_time < d.end_time, {
    message: "La hora de fin debe ser posterior a la de inicio",
    path: ["end_time"],
  });

type OccurrenceFormValues = z.infer<typeof occurrenceSchema>;
type SeriesFormValues = z.infer<typeof seriesSchema>;

// ─── View state ───────────────────────────────────────────────────────────────

type ViewState =
  | "menu"
  | "edit-occurrence"
  | "edit-series"
  | "cancel-occurrence-confirm"
  | "cancel-series-confirm";

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecurringOccurrenceMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occurrence: ExpandedOccurrence;
  canchaId: string;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecurringOccurrenceMenu({
  open,
  onOpenChange,
  occurrence,
  onSuccess,
}: RecurringOccurrenceMenuProps) {
  const [view, setView] = useState<ViewState>("menu");
  const [submitting, setSubmitting] = useState(false);

  // ── Edit occurrence form ──────────────────────────────────────────────────
  const occForm = useForm<OccurrenceFormValues>({
    resolver: zodResolver(occurrenceSchema),
    defaultValues: {
      start_time: occurrence.start_time,
      end_time: occurrence.end_time,
      price: occurrence.price,
    },
  });

  // ── Edit series form ──────────────────────────────────────────────────────
  const seriesForm = useForm<SeriesFormValues>({
    resolver: zodResolver(seriesSchema),
    defaultValues: {
      start_time: occurrence.start_time,
      end_time: occurrence.end_time,
      price_per_session: occurrence.price,
    },
  });

  function handleClose() {
    setView("menu");
    onOpenChange(false);
  }

  // ── Submit: edit this occurrence ──────────────────────────────────────────
  async function handleEditOccurrence(values: OccurrenceFormValues) {
    setSubmitting(true);
    try {
      const { error } = await createException(supabase, {
        recurring_id: occurrence.recurringId,
        original_date: occurrence.date,
        action: "modified",
        new_start: values.start_time,
        new_end: values.end_time,
        new_price: values.price,
        notes: null,
      });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Ocurrencia modificada");
      handleClose();
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  // ── Submit: edit whole series ─────────────────────────────────────────────
  async function handleEditSeries(values: SeriesFormValues) {
    setSubmitting(true);
    try {
      const { error } = await updateRecurring(supabase, occurrence.recurringId, {
        start_time: values.start_time,
        end_time: values.end_time,
        price_per_session: values.price_per_session,
      });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Serie actualizada");
      handleClose();
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  // ── Submit: cancel this occurrence ────────────────────────────────────────
  async function handleCancelOccurrence() {
    setSubmitting(true);
    try {
      const { error } = await createException(supabase, {
        recurring_id: occurrence.recurringId,
        original_date: occurrence.date,
        action: "cancelled",
        new_start: null,
        new_end: null,
        new_price: null,
        notes: null,
      });

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Ocurrencia cancelada");
      handleClose();
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  // ── Submit: cancel entire series ──────────────────────────────────────────
  async function handleCancelSeries() {
    setSubmitting(true);
    try {
      const { error } = await cancelRecurring(supabase, occurrence.recurringId);

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("Serie cancelada");
      handleClose();
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Sheet open={open && view !== "cancel-occurrence-confirm" && view !== "cancel-series-confirm"} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base">
              {view === "menu" && "Reserva recurrente"}
              {view === "edit-occurrence" && "Editar esta ocurrencia"}
              {view === "edit-series" && "Editar toda la serie"}
            </SheetTitle>
            {view === "menu" && (
              <p className="text-xs text-muted-foreground">
                {occurrence.date} · {occurrence.start_time.substring(0, 5)}–{occurrence.end_time.substring(0, 5)}
              </p>
            )}
          </SheetHeader>

          {/* ── MENU ── */}
          {view === "menu" && (
            <div className="space-y-2 pb-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setView("edit-occurrence")}
              >
                Editar esta ocurrencia
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setView("edit-series")}
              >
                Editar toda la serie
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-amber-200"
                onClick={() => setView("cancel-occurrence-confirm")}
              >
                Cancelar esta ocurrencia
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => setView("cancel-series-confirm")}
              >
                Cancelar toda la serie
              </Button>
            </div>
          )}

          {/* ── EDIT OCCURRENCE ── */}
          {view === "edit-occurrence" && (
            <form
              onSubmit={occForm.handleSubmit(handleEditOccurrence)}
              className="space-y-4 pb-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="occ-start">Hora inicio</Label>
                  <Input
                    id="occ-start"
                    type="time"
                    {...occForm.register("start_time")}
                  />
                  {occForm.formState.errors.start_time && (
                    <p className="text-xs text-destructive">
                      {occForm.formState.errors.start_time.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="occ-end">Hora fin</Label>
                  <Input
                    id="occ-end"
                    type="time"
                    {...occForm.register("end_time")}
                  />
                  {occForm.formState.errors.end_time && (
                    <p className="text-xs text-destructive">
                      {occForm.formState.errors.end_time.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="occ-price">Precio</Label>
                <Input
                  id="occ-price"
                  type="number"
                  min={0}
                  step={1}
                  {...occForm.register("price")}
                />
                {occForm.formState.errors.price && (
                  <p className="text-xs text-destructive">
                    {occForm.formState.errors.price.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setView("menu")}
                  disabled={submitting}
                >
                  Atrás
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Guardando..." : "Confirmar"}
                </Button>
              </div>
            </form>
          )}

          {/* ── EDIT SERIES ── */}
          {view === "edit-series" && (
            <form
              onSubmit={seriesForm.handleSubmit(handleEditSeries)}
              className="space-y-4 pb-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ser-start">Hora inicio</Label>
                  <Input
                    id="ser-start"
                    type="time"
                    {...seriesForm.register("start_time")}
                  />
                  {seriesForm.formState.errors.start_time && (
                    <p className="text-xs text-destructive">
                      {seriesForm.formState.errors.start_time.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ser-end">Hora fin</Label>
                  <Input
                    id="ser-end"
                    type="time"
                    {...seriesForm.register("end_time")}
                  />
                  {seriesForm.formState.errors.end_time && (
                    <p className="text-xs text-destructive">
                      {seriesForm.formState.errors.end_time.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ser-price">Precio por sesión</Label>
                <Input
                  id="ser-price"
                  type="number"
                  min={0}
                  step={1}
                  {...seriesForm.register("price_per_session")}
                />
                {seriesForm.formState.errors.price_per_session && (
                  <p className="text-xs text-destructive">
                    {seriesForm.formState.errors.price_per_session.message}
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setView("menu")}
                  disabled={submitting}
                >
                  Atrás
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Guardando..." : "Actualizar serie"}
                </Button>
              </div>
            </form>
          )}
        </SheetContent>
      </Sheet>

      {/* ── CANCEL OCCURRENCE CONFIRM ── */}
      <AlertDialog
        open={view === "cancel-occurrence-confirm"}
        onOpenChange={(v) => { if (!v) setView("menu"); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta ocurrencia</AlertDialogTitle>
            <AlertDialogDescription>
              Se cancelará la reserva del {occurrence.date} (
              {occurrence.start_time.substring(0, 5)}–
              {occurrence.end_time.substring(0, 5)}). El resto de la serie
              continúa sin cambios.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setView("menu")} disabled={submitting}>
              No cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOccurrence}
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {submitting ? "Cancelando..." : "Cancelar ocurrencia"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── CANCEL SERIES CONFIRM ── */}
      <AlertDialog
        open={view === "cancel-series-confirm"}
        onOpenChange={(v) => { if (!v) setView("menu"); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar toda la serie</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cancelar toda la serie? Las reservas futuras desaparecerán de la
              agenda. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setView("menu")} disabled={submitting}>
              No cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSeries}
              disabled={submitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {submitting ? "Cancelando..." : "Cancelar serie"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
