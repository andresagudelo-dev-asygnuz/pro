"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldWithVisibility } from "@/components/profile/field-with-visibility";
import {
  saveIdentityBlock,
  type SaveIdentityState,
} from "@/lib/profiles/identity-actions";
import { slugifyName } from "@/lib/profiles/slug";
import type {
  IdentityFieldKey,
  ProfileCore,
  SkillTag,
  Sport,
  VisibilityLevel,
} from "@/lib/types/db";

type Props = {
  profile: ProfileCore | null;
  visibility: Record<IdentityFieldKey, VisibilityLevel>;
  sports: Pick<Sport, "id" | "name">[];
  softSkills: Pick<SkillTag, "id" | "label">[];
};

const initialState: SaveIdentityState = {};

/**
 * Formulario cliente de Bloque 1 Identidad (HU-003 PR B).
 *
 * Estado controlado sólo para (a) autogenerar el slug a partir del nombre
 * mientras el usuario no lo edite manualmente, (b) serializar los tags
 * seleccionados a un hidden input `soft_skills_tags_raw`. El resto queda
 * como inputs no controlados para que FormData se colecte sin depender de
 * timings de re-render (mismo patrón anti-race que aplicamos en PR #14).
 */
export function IdentityEditorForm({
  profile,
  visibility,
  sports,
  softSkills,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    saveIdentityBlock,
    initialState,
  );

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [slug, setSlug] = useState(profile?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(profile?.slug));
  const [selectedTags, setSelectedTags] = useState<string[]>(
    profile?.soft_skills_tags ?? [],
  );

  const fieldErrors = state.fieldErrors ?? {};

  useEffect(() => {
    if (!slugTouched) {
      const auto = fullName.trim().length > 0 ? slugifyName(fullName) : "";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSlug(auto);
    }
  }, [fullName, slugTouched]);

  // Post-save: re-sincronizar el estado controlado con los props nuevos
  // que llegan tras `revalidatePath`. Sin esto, chips y nombre mostrado
  // quedan con el valor pre-submit hasta F5.
  useEffect(() => {
    if (state.savedAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFullName(profile?.full_name ?? "");
      setSlug(profile?.slug ?? "");
      setSlugTouched(true);
      setSelectedTags(profile?.soft_skills_tags ?? []);
    }
  }, [state.savedAt, profile]);

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  const softSkillsLookup = useMemo(
    () => new Map(softSkills.map((t) => [t.id, t.label])),
    [softSkills],
  );

  // Re-mount del <form> tras save exitoso: los `<input defaultValue>` y
  // `<select defaultValue>` son uncontrolled; React sólo aplica
  // `defaultValue` en el mount inicial. Sin esta key los campos siguen
  // mostrando el valor pre-submit hasta un F5.
  const formKey = state.savedAt ?? "initial";

  return (
    <form
      key={formKey}
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-6"
      aria-describedby="identity-help"
    >
      <p id="identity-help" className="sr-only">
        Completá tus datos de identidad. Podés elegir a quién mostrar cada
        campo.
      </p>

      <FieldWithVisibility
        fieldKey="identity.full_name"
        label="Nombre completo"
        htmlFor="full_name"
        visibility={visibility["identity.full_name"]}
        required
        error={fieldErrors.full_name}
      >
        <Input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={profile?.full_name ?? ""}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Juan Pérez"
          disabled={pending}
        />
      </FieldWithVisibility>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="birth_date"
          className="text-sm font-medium text-foreground"
        >
          Fecha de nacimiento{" "}
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        </label>
        <Input
          id="birth_date"
          name="birth_date"
          type="date"
          required
          defaultValue={profile?.birth_date ?? ""}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Sólo se usa para calcular tu edad (≥18). No se muestra en tu perfil
          público.
        </p>
        {fieldErrors.birth_date ? (
          <p role="alert" className="text-xs text-destructive">
            {fieldErrors.birth_date}
          </p>
        ) : null}
      </div>

      <FieldWithVisibility
        fieldKey="identity.city"
        label="Ciudad"
        htmlFor="city"
        visibility={visibility["identity.city"]}
        required
        error={fieldErrors.city}
      >
        <Input
          id="city"
          name="city"
          type="text"
          autoComplete="address-level2"
          required
          minLength={2}
          maxLength={80}
          defaultValue={profile?.city ?? ""}
          placeholder="Manizales"
          disabled={pending}
        />
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="identity.region"
        label="Región / Departamento"
        htmlFor="region"
        visibility={visibility["identity.region"]}
        error={fieldErrors.region}
      >
        <Input
          id="region"
          name="region"
          type="text"
          autoComplete="address-level1"
          maxLength={80}
          defaultValue={profile?.region ?? ""}
          placeholder="Caldas"
          disabled={pending}
        />
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="identity.country"
        label="País (ISO alpha-2)"
        htmlFor="country"
        visibility={visibility["identity.country"]}
        required
        hint="Dos letras. Ej: CO (Colombia), AR (Argentina), MX (México)."
        error={fieldErrors.country}
      >
        <Input
          id="country"
          name="country"
          type="text"
          autoComplete="country"
          required
          minLength={2}
          maxLength={2}
          defaultValue={profile?.country ?? "CO"}
          className="uppercase"
          placeholder="CO"
          disabled={pending}
        />
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="identity.primary_sport"
        label="Disciplina principal"
        htmlFor="primary_sport_id"
        visibility={visibility["identity.primary_sport"]}
        required
        error={fieldErrors.primary_sport_id}
      >
        <select
          id="primary_sport_id"
          name="primary_sport_id"
          required
          defaultValue={profile?.primary_sport_id ?? "futbol"}
          disabled={pending}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sports
            .filter((s) => s.id === "futbol")
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="identity.interests"
        label="Intereses"
        htmlFor="interests_raw"
        visibility={visibility["identity.interests"]}
        hint="Separá por comas. Máx 10. Ej: senderismo, nutrición deportiva, psicología."
        error={fieldErrors.interests_raw}
      >
        <Input
          id="interests_raw"
          name="interests_raw"
          type="text"
          maxLength={400}
          defaultValue={(profile?.interests ?? []).join(", ")}
          disabled={pending}
        />
      </FieldWithVisibility>

      <FieldWithVisibility
        fieldKey="identity.soft_skills"
        label="Habilidades blandas"
        htmlFor="soft_skills_text"
        visibility={visibility["identity.soft_skills"]}
        hint="Elegí tags del catálogo y/o escribí una descripción (máx 1000 caracteres)."
        error={
          fieldErrors.soft_skills_text ?? fieldErrors.soft_skills_tags
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {softSkills.map((tag) => {
              const active = selectedTags.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(tag.id)}
                  disabled={pending}
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
          {selectedTags.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Seleccionadas:{" "}
              {selectedTags
                .map((id) => softSkillsLookup.get(id) ?? id)
                .join(", ")}
            </p>
          ) : null}
          <input
            type="hidden"
            name="soft_skills_tags_raw"
            value={selectedTags.join(",")}
          />
          <Textarea
            id="soft_skills_text"
            name="soft_skills_text"
            rows={4}
            maxLength={1000}
            defaultValue={profile?.soft_skills_text ?? ""}
            placeholder="Liderazgo positivo bajo presión, comunicación asertiva con el entrenador…"
            disabled={pending}
          />
        </div>
      </FieldWithVisibility>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="slug" className="text-sm font-medium text-foreground">
          URL pública{" "}
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
        </label>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">pro.app/u/</span>
          <Input
            id="slug"
            name="slug"
            type="text"
            required
            minLength={3}
            maxLength={80}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="juan-perez"
            className="flex-1"
            disabled={pending}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Se usa como tu URL pública. Podés cambiarla antes de guardar.
        </p>
        {fieldErrors.slug ? (
          <p role="alert" className="text-xs text-destructive">
            {fieldErrors.slug}
          </p>
        ) : null}
      </div>

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
          {pending ? "Guardando…" : "Guardar bloque 1"}
        </Button>
      </div>
    </form>
  );
}
