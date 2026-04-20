"use client";

import { VISIBILITY_LEVELS, type VisibilityLevel } from "@/lib/types/db";

type Props = {
  /**
   * Nombre del input. Para el form global del Bloque 1 usamos
   * `visibility[<field_key>]`; `identity-actions.ts` lo parsea.
   */
  name: string;
  defaultValue?: VisibilityLevel;
  disabled?: boolean;
  /** aria-describedby para vincular con el help text del field contenedor. */
  describedBy?: string;
};

/**
 * Dropdown nativo de visibilidad por campo (HU-003 §1 / ADR-002).
 *
 * Uso nativo `<select>` por tres razones:
 *   - Integra con FormData sin estado controlado (robusto bajo Server
 *     Actions, evita race conditions como la de `verification-review-form`).
 *   - Accesibilidad built-in (teclado, lector de pantalla) sin librerías.
 *   - El shadcn `Select` de base-ui requiere controlled state + portal,
 *     overkill para un dropdown de 3 opciones que se replica N veces.
 *
 * Los labels con acento (`Público`) viven acá; los values en DB son ASCII
 * (`publico`) por decisión de la migración 20260417140000.
 */
export function VisibilitySelect({
  name,
  defaultValue = "publico",
  disabled = false,
  describedBy,
}: Props) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      disabled={disabled}
      aria-label="Visibilidad del campo"
      aria-describedby={describedBy}
      className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      {VISIBILITY_LEVELS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
