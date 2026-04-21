"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldWithVisibility } from "@/components/profile/field-with-visibility";
import {
  saveTechnicalFootballBlock,
  type SaveTechnicalFootballState,
} from "@/lib/profiles/technical-football-actions";
import type {
  ProfileTechnicalFootball,
  TechnicalFootballFieldKey,
  VisibilityLevel,
} from "@/lib/types/db";
import {
  DOMINANT_FOOT_VALUES,
  FOOTBALL_POSITION_VALUES,
} from "@/lib/types/db";

type Props = {
  profile: ProfileTechnicalFootball | null;
  visibility: Record<TechnicalFootballFieldKey, VisibilityLevel>;
};

const initialState: SaveTechnicalFootballState = {};

const selectCls =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";

const POSITION_LABELS: Record<(typeof FOOTBALL_POSITION_VALUES)[number], string> =
  {
    arquero: "Arquero (GK)",
    defensa: "Defensa (DEF)",
    mediocampista: "Mediocampista (MED)",
    delantero: "Delantero (DEL)",
  };

const DOMINANT_FOOT_LABELS: Record<(typeof DOMINANT_FOOT_VALUES)[number], string> =
  {
    derecho: "Derecho",
    izquierdo: "Izquierdo",
    ambos: "Ambidiestro",
  };

/**
 * Bloque 4 · Destrezas Técnicas Fútbol (HU-003 PR C).
 *
 * `position` y `dominant_foot` son requeridos (NOT NULL en DB). Los textos
 * (rendimiento individual, rol colectivo) son opcionales 0..1000 chars.
 */
export function TechnicalFootballEditorForm({ profile, visibility }: Props) {
  const [state, formAction, pending] = useActionState(
    saveTechnicalFootballBlock,
    initialState,
  );
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FieldWithVisibility
        fieldKey="technical.football.position"
        label="Posición principal"
        htmlFor="position"
        visibility={visibility["technical.football.position"]}
        required
        error={fieldErrors.position}
        disabled={pending}
      >
        <select
          id="position"
          name="position"
          required
          defaultValue={profile?.position ?? ""}
          disabled={pending}
          className={selectCls}
        >
          <option value="" disabled>
            Elegí una posición
          </option>
          {FOOTBALL_POSITION_VALUES.map((v) => (
            <option key={v} value={v}>
              {POSITION_LABELS[v]}
            </option>
          ))}
        </select>
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="technical.football.dominant_foot"
        label="Pierna dominante"
        htmlFor="dominant_foot"
        visibility={visibility["technical.football.dominant_foot"]}
        required
        error={fieldErrors.dominant_foot}
        disabled={pending}
      >
        <select
          id="dominant_foot"
          name="dominant_foot"
          required
          defaultValue={profile?.dominant_foot ?? ""}
          disabled={pending}
          className={selectCls}
        >
          <option value="" disabled>
            Elegí una opción
          </option>
          {DOMINANT_FOOT_VALUES.map((v) => (
            <option key={v} value={v}>
              {DOMINANT_FOOT_LABELS[v]}
            </option>
          ))}
        </select>
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="technical.football.performance_notes"
        label="Rendimiento individual y marcas"
        htmlFor="performance_notes"
        visibility={visibility["technical.football.performance_notes"]}
        hint="Describí alcance, récords personales, números de referencia (máx 1000)."
        error={fieldErrors.performance_notes}
        disabled={pending}
      >
        <Textarea
          id="performance_notes"
          name="performance_notes"
          rows={4}
          maxLength={1000}
          defaultValue={profile?.performance_notes ?? ""}
          placeholder="Alcance máximo en remate de 3.20 m y récord personal de saques efectivos."
          disabled={pending}
        />
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="technical.football.tactical_role_notes"
        label="Rendimiento colectivo y rol táctico"
        htmlFor="tactical_role_notes"
        visibility={visibility["technical.football.tactical_role_notes"]}
        hint="Describí tu rol dentro del equipo (máx 1000)."
        error={fieldErrors.tactical_role_notes}
        disabled={pending}
      >
        <Textarea
          id="tactical_role_notes"
          name="tactical_role_notes"
          rows={4}
          maxLength={1000}
          defaultValue={profile?.tactical_role_notes ?? ""}
          placeholder="Rol de atacante externo con gran efectividad en bloqueos y apoyo defensivo en segunda línea."
          disabled={pending}
        />
      </FieldWithVisibility>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" aria-live="polite" className="text-sm text-foreground">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3 border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar bloque técnico"}
        </Button>
      </div>
    </form>
  );
}
