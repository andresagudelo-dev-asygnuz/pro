"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  uploadAgeVerification,
  type VerifyAgeState,
} from "@/lib/auth/age-verification-actions";
import {
  AGE_VERIFICATION_ALLOWED_MIME,
  AGE_VERIFICATION_MAX_BYTES,
} from "@/lib/validation/schemas";

const initialState: VerifyAgeState = {};

const MAX_MB = Math.round(AGE_VERIFICATION_MAX_BYTES / (1024 * 1024));
const ACCEPT_ATTR = AGE_VERIFICATION_ALLOWED_MIME.join(",");

/**
 * Formulario de carga de documento (HU-002 / RF-007).
 *
 * Validación duplicada:
 *   - Cliente: bloquea submit si el archivo no pasa mime/size. Feedback
 *     inmediato sin round-trip.
 *   - Servidor: misma regla con Zod en la Server Action. Es la fuente de
 *     verdad; el cliente es UX.
 */
export function VerifyAgeForm({ disabled = false }: { disabled?: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    uploadAgeVerification,
    initialState,
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    name: string;
    sizeBytes: number;
  } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setSelected(null);
      return;
    }
    const allowed = (AGE_VERIFICATION_ALLOWED_MIME as readonly string[]).includes(
      file.type,
    );
    if (!allowed) {
      setClientError("Formato no permitido. Subí JPG, PNG o PDF.");
      setSelected(null);
      e.target.value = "";
      return;
    }
    if (file.size > AGE_VERIFICATION_MAX_BYTES) {
      setClientError(`El archivo supera los ${MAX_MB} MB.`);
      setSelected(null);
      e.target.value = "";
      return;
    }
    setSelected({ name: file.name, sizeBytes: file.size });
  }

  const submitDisabled = disabled || pending || !selected || !!clientError;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-4"
      aria-describedby="verify-age-help"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="document">Documento de identidad</Label>
        <input
          id="document"
          name="document"
          type="file"
          accept={ACCEPT_ATTR}
          required
          onChange={handleFileChange}
          disabled={disabled || pending}
          className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
        />
        <p id="verify-age-help" className="text-xs text-muted-foreground">
          JPG, PNG o PDF. Máximo {MAX_MB} MB. Tu documento sólo lo ven
          administradores; nunca se muestra en tu perfil público.
        </p>
        {selected && !clientError && (
          <p className="text-xs text-muted-foreground">
            Seleccionado:{" "}
            <span className="font-medium text-foreground">{selected.name}</span>{" "}
            ({formatSize(selected.sizeBytes)})
          </p>
        )}
      </div>

      {clientError && (
        <p role="alert" className="text-sm text-destructive">
          {clientError}
        </p>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.fieldErrors &&
        Object.entries(state.fieldErrors).map(([field, msg]) => (
          <p key={field} className="text-xs text-destructive">
            {field}: {msg}
          </p>
        ))}
      {state.message && (
        <p role="status" aria-live="polite" className="text-sm text-foreground">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={submitDisabled}>
        {pending ? "Subiendo…" : "Enviar para revisión"}
      </Button>
    </form>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
