import type { ReactNode } from "react";
import { VisibilitySelect } from "@/components/profile/visibility-select";
import type { ProfileFieldKey, VisibilityLevel } from "@/lib/types/db";

type Props = {
  /** `field_key` del catálogo `visibility_fields` (ADR-002). */
  fieldKey: ProfileFieldKey;
  /** Label visible del field, renderizado como `<label>` del input principal. */
  label: string;
  /** ID del input principal para vincular con el `<label>`. */
  htmlFor: string;
  /** Nivel de visibilidad actual (derivado de DB + defaults del catálogo). */
  visibility: VisibilityLevel;
  /** Texto auxiliar debajo del input. */
  hint?: ReactNode;
  /** Mensaje de error por campo (viene del estado de la Server Action). */
  error?: string;
  /** Marca el field como obligatorio en la UI (no cambia la validación). */
  required?: boolean;
  /** Deshabilita tanto el input como el selector de visibilidad. */
  disabled?: boolean;
  /** El input/textarea/select específico del campo. */
  children: ReactNode;
};

/**
 * Contenedor accesible que agrupa un input con su selector de visibilidad
 * al costado derecho (wireframe 03). Server Component: no hace falta
 * estado ni hooks; los children controlan su propia interactividad.
 */
export function FieldWithVisibility({
  fieldKey,
  label,
  htmlFor,
  visibility,
  hint,
  error,
  required = false,
  disabled = false,
  children,
}: Props) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-destructive">
              *
            </span>
          ) : null}
        </label>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Visibilidad</span>
          <VisibilitySelect
            name={`visibility[${fieldKey}]`}
            defaultValue={visibility}
            disabled={disabled}
            describedBy={describedBy}
          />
        </div>
      </div>
      {children}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
