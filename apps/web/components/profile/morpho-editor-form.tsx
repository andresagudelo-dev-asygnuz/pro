"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldWithVisibility } from "@/components/profile/field-with-visibility";
import {
  saveMorphologicalBlock,
  type SaveMorphoState,
} from "@/lib/profiles/morpho-actions";
import type {
  MorphoFieldKey,
  ProfileMorpho,
  VisibilityLevel,
} from "@/lib/types/db";
import {
  LATERALITY_VALUES,
  SOMATOTYPE_VALUES,
} from "@/lib/types/db";

type Props = {
  profile: ProfileMorpho | null;
  visibility: Record<MorphoFieldKey, VisibilityLevel>;
};

const initialState: SaveMorphoState = {};

const selectCls =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50";

function numberValue(v: number | null): string {
  return v === null || v === undefined ? "" : String(v);
}

/**
 * Bloque 2 · Morfológico (HU-003 PR C).
 *
 * Todos los campos son opcionales. Inputs no controlados; el único estado
 * UI que reseteamos post-submit es el pending flag vía `useActionState`.
 */
export function MorphoEditorForm({ profile, visibility }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    saveMorphologicalBlock,
    initialState,
  );

  const fieldErrors = state.fieldErrors ?? {};

  // Re-render defaults al recargar datos post-save (p. ej. cambiaste valor y
  // el server persistió). No usamos reset() porque los defaultValues se
  // regeneran con el prop `profile` al revalidar la ruta.
  useEffect(() => {
    if (state.savedAt) {
      // noop: el revalidatePath del server action hace que el server
      // component padre re-fetchee profile y re-monte este form.
    }
  }, [state.savedAt]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      <FieldWithVisibility
        fieldKey="morpho.height_m"
        label="Estatura (m)"
        htmlFor="height_m"
        visibility={visibility["morpho.height_m"]}
        hint="Entre 1.00 y 2.50 metros. Ej: 1.88"
        error={fieldErrors.height_m}
        disabled={pending}
      >
        <Input
          id="height_m"
          name="height_m"
          type="number"
          step="0.01"
          min="1.00"
          max="2.50"
          inputMode="decimal"
          defaultValue={numberValue(profile?.height_m ?? null)}
          placeholder="1.88"
          disabled={pending}
        />
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="morpho.weight_kg"
        label="Peso competitivo (kg)"
        htmlFor="weight_kg"
        visibility={visibility["morpho.weight_kg"]}
        hint="Entre 30 y 200 kg. Ej: 82"
        error={fieldErrors.weight_kg}
        disabled={pending}
      >
        <Input
          id="weight_kg"
          name="weight_kg"
          type="number"
          step="0.1"
          min="30"
          max="200"
          inputMode="decimal"
          defaultValue={numberValue(profile?.weight_kg ?? null)}
          placeholder="82"
          disabled={pending}
        />
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="morpho.wingspan_m"
        label="Envergadura / Cobertura (m)"
        htmlFor="wingspan_m"
        visibility={visibility["morpho.wingspan_m"]}
        hint="Alcance total de brazos. Entre 1.00 y 2.80 metros."
        error={fieldErrors.wingspan_m}
        disabled={pending}
      >
        <Input
          id="wingspan_m"
          name="wingspan_m"
          type="number"
          step="0.01"
          min="1.00"
          max="2.80"
          inputMode="decimal"
          defaultValue={numberValue(profile?.wingspan_m ?? null)}
          placeholder="1.95"
          disabled={pending}
        />
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="morpho.laterality"
        label="Lateralidad"
        htmlFor="laterality"
        visibility={visibility["morpho.laterality"]}
        error={fieldErrors.laterality}
        disabled={pending}
      >
        <select
          id="laterality"
          name="laterality"
          defaultValue={profile?.laterality ?? ""}
          disabled={pending}
          className={selectCls}
        >
          <option value="">(sin especificar)</option>
          {LATERALITY_VALUES.map((v) => (
            <option key={v} value={v}>
              {v[0].toUpperCase() + v.slice(1)}
            </option>
          ))}
        </select>
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="morpho.somatotype"
        label="Somatotipo"
        htmlFor="somatotype"
        visibility={visibility["morpho.somatotype"]}
        hint="Mesomorfo: muscular · Ectomorfo: delgado · Endomorfo: robusto · Mixto"
        error={fieldErrors.somatotype}
        disabled={pending}
      >
        <select
          id="somatotype"
          name="somatotype"
          defaultValue={profile?.somatotype ?? ""}
          disabled={pending}
          className={selectCls}
        >
          <option value="">(sin especificar)</option>
          {SOMATOTYPE_VALUES.map((v) => (
            <option key={v} value={v}>
              {v[0].toUpperCase() + v.slice(1)}
            </option>
          ))}
        </select>
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
          {pending ? "Guardando…" : "Guardar bloque morfológico"}
        </Button>
      </div>
    </form>
  );
}
