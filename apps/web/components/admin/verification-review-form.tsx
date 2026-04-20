"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  reviewVerification,
  type ReviewVerificationState,
} from "@/lib/admin/age-verification-actions";

const initialState: ReviewVerificationState = {};

/**
 * Formulario de revisión admin (HU-002 §6 / PR D Sprint 1).
 *
 * UX:
 *   - Botón "Aprobar" envía el form con `decision=aprobada` (via submitter).
 *   - Botón "Rechazar…" abre un textarea inline y, en el segundo click
 *     (ya desplegado), "Confirmar rechazo" envía con `decision=rechazada`
 *     + motivo requerido (via submitter).
 *   - Usamos `name`/`value` directamente en los botones submit para evitar
 *     race conditions de React: el submitter del form pone su par name/value
 *     en `FormData` sin depender de un re-render (comparar con
 *     `components/auth/verify-age-form.tsx`).
 *
 * Tras una respuesta exitosa (`reviewedAt` cambia) cerramos el panel de
 * rechazo. Re-usa el patrón `uploadedAt` del form de usuario para soportar
 * acciones consecutivas con mensajes idénticos.
 */
export function VerificationReviewForm({
  verificationId,
}: {
  verificationId: string;
}) {
  const [state, formAction, pending] = useActionState(
    reviewVerification,
    initialState,
  );
  const [rejectOpen, setRejectOpen] = useState(false);

  // Al confirmar una revisión (reviewedAt cambia) cerramos el textarea
  // para dejar el form listo para la siguiente fila.
  useEffect(() => {
    if (state.reviewedAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRejectOpen(false);
    }
  }, [state.reviewedAt]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="verification_id" value={verificationId} />

      {rejectOpen && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`reason-${verificationId}`}>Motivo del rechazo</Label>
          <Textarea
            id={`reason-${verificationId}`}
            name="rejection_reason"
            required
            minLength={2}
            maxLength={500}
            placeholder="Ej: El documento no muestra la fecha de nacimiento legible."
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            El usuario verá este texto al refrescar su estado de verificación.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!rejectOpen ? (
          <>
            <Button
              type="submit"
              name="decision"
              value="aprobada"
              disabled={pending}
            >
              Aprobar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => setRejectOpen(true)}
            >
              Rechazar…
            </Button>
          </>
        ) : (
          <>
            <Button
              type="submit"
              name="decision"
              value="rechazada"
              variant="destructive"
              disabled={pending}
            >
              Confirmar rechazo
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setRejectOpen(false)}
            >
              Cancelar
            </Button>
          </>
        )}
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.fieldErrors?.rejection_reason && (
        <p className="text-xs text-destructive">
          {state.fieldErrors.rejection_reason}
        </p>
      )}
      {state.message && (
        <p role="status" aria-live="polite" className="text-sm text-foreground">
          {state.message}
        </p>
      )}
    </form>
  );
}
