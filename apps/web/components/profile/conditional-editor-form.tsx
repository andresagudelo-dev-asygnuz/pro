"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FieldWithVisibility } from "@/components/profile/field-with-visibility";
import {
  saveConditionalBlock,
  type SaveConditionalState,
} from "@/lib/profiles/conditional-actions";
import type {
  ConditionalFieldKey,
  ProfileConditional,
  SkillTag,
  VisibilityLevel,
} from "@/lib/types/db";

type Props = {
  profile: ProfileConditional | null;
  visibility: Record<ConditionalFieldKey, VisibilityLevel>;
  strengthTags: SkillTag[];
  speedTags: SkillTag[];
  enduranceTags: SkillTag[];
  flexibilityTags: SkillTag[];
};

const initialState: SaveConditionalState = {};

/**
 * Bloque 3 · Capacidades Condicionales (HU-003 PR C).
 *
 * Cada subcampo (fuerza / velocidad / resistencia / flexibilidad) tiene:
 * - Chips seleccionables del catálogo `skill_tags` (categoría dedicada).
 * - Textarea con notas libres (máx 400 chars).
 *
 * El selector de visibilidad aplica al conjunto chips+nota por subcampo.
 */
export function ConditionalEditorForm({
  profile,
  visibility,
  strengthTags,
  speedTags,
  enduranceTags,
  flexibilityTags,
}: Props) {
  const [state, formAction, pending] = useActionState(
    saveConditionalBlock,
    initialState,
  );
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <TagGroup
        fieldKey="conditional.strength"
        label="Fuerza (explosiva / resistencia)"
        tags={strengthTags}
        initialTags={profile?.strength_tags ?? []}
        tagsRawName="strength_tags_raw"
        notesName="strength_notes"
        notesDefault={profile?.strength_notes ?? ""}
        visibility={visibility["conditional.strength"]}
        pending={pending}
        tagsError={fieldErrors.strength_tags_raw}
        notesError={fieldErrors.strength_notes}
        placeholder="Alta potencia en salto vertical y gran fuerza en tren inferior."
      />
      <TagGroup
        fieldKey="conditional.speed"
        label="Velocidad (reacción / desplazamiento)"
        tags={speedTags}
        initialTags={profile?.speed_tags ?? []}
        tagsRawName="speed_tags_raw"
        notesName="speed_notes"
        notesDefault={profile?.speed_notes ?? ""}
        visibility={visibility["conditional.speed"]}
        pending={pending}
        tagsError={fieldErrors.speed_tags_raw}
        notesError={fieldErrors.speed_notes}
        placeholder="Excelente tiempo de reacción ante estímulos visuales y gran velocidad de desplazamiento lateral."
      />
      <TagGroup
        fieldKey="conditional.endurance"
        label="Resistencia (aeróbica / anaeróbica)"
        tags={enduranceTags}
        initialTags={profile?.endurance_tags ?? []}
        tagsRawName="endurance_tags_raw"
        notesName="endurance_notes"
        notesDefault={profile?.endurance_notes ?? ""}
        visibility={visibility["conditional.endurance"]}
        pending={pending}
        tagsError={fieldErrors.endurance_tags_raw}
        notesError={fieldErrors.endurance_notes}
        placeholder="Capacidad anaeróbica alta para mantener esfuerzos explosivos cortos y repetidos."
      />
      <TagGroup
        fieldKey="conditional.flexibility"
        label="Flexibilidad (rango articular)"
        tags={flexibilityTags}
        initialTags={profile?.flexibility_tags ?? []}
        tagsRawName="flexibility_tags_raw"
        notesName="flexibility_notes"
        notesDefault={profile?.flexibility_notes ?? ""}
        visibility={visibility["conditional.flexibility"]}
        pending={pending}
        tagsError={fieldErrors.flexibility_tags_raw}
        notesError={fieldErrors.flexibility_notes}
        placeholder="Rango óptimo en articulaciones del hombro para el remate técnico."
      />

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
          {pending ? "Guardando…" : "Guardar capacidades condicionales"}
        </Button>
      </div>
    </form>
  );
}

function TagGroup(props: {
  fieldKey: ConditionalFieldKey;
  label: string;
  tags: SkillTag[];
  initialTags: string[];
  tagsRawName: string;
  notesName: string;
  notesDefault: string;
  visibility: VisibilityLevel;
  pending: boolean;
  tagsError?: string;
  notesError?: string;
  placeholder: string;
}) {
  const [selected, setSelected] = useState<string[]>(props.initialTags);
  const lookup = useMemo(
    () => new Map(props.tags.map((t) => [t.id, t.label])),
    [props.tags],
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <FieldWithVisibility
      fieldKey={props.fieldKey}
      label={props.label}
      htmlFor={props.notesName}
      visibility={props.visibility}
      hint="Elegí tags del catálogo y/o describí con tus palabras (máx 400)."
      error={props.tagsError ?? props.notesError}
      disabled={props.pending}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {props.tags.map((tag) => {
            const active = selected.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(tag.id)}
                disabled={props.pending}
                className={
                  "rounded-full border px-3 py-1 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
                  (active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground")
                }
              >
                {tag.label}
              </button>
            );
          })}
        </div>
        {selected.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Seleccionadas:{" "}
            {selected.map((id) => lookup.get(id) ?? id).join(", ")}
          </p>
        ) : null}
        <input type="hidden" name={props.tagsRawName} value={selected.join(",")} />
        <Textarea
          id={props.notesName}
          name={props.notesName}
          rows={3}
          maxLength={400}
          defaultValue={props.notesDefault}
          placeholder={props.placeholder}
          disabled={props.pending}
        />
      </div>
    </FieldWithVisibility>
  );
}
