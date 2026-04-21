"use client";

import { useState } from "react";
import type {
  ConditionalFieldKey,
  IdentityFieldKey,
  MorphoFieldKey,
  ProfileConditional,
  ProfileCore,
  ProfileFieldKey,
  ProfileMorpho,
  ProfileTechnicalFootball,
  TechnicalFootballFieldKey,
  VisibilityLevel,
} from "@/lib/types/db";

type Audience = "publico" | "promotores" | "privado";

type Props = {
  core: ProfileCore | null;
  morpho: ProfileMorpho | null;
  conditional: ProfileConditional | null;
  technicalFootball: ProfileTechnicalFootball | null;
  visibility: Record<ProfileFieldKey, VisibilityLevel>;
  sportsById: Record<string, string>;
  softSkillsById: Record<string, string>;
  strengthTagsById: Record<string, string>;
  speedTagsById: Record<string, string>;
  enduranceTagsById: Record<string, string>;
  flexibilityTagsById: Record<string, string>;
};

const AUDIENCE_ORDER: Audience[] = ["publico", "promotores", "privado"];

const AUDIENCE_LABELS: Record<Audience, string> = {
  publico: "Público",
  promotores: "Promotores",
  privado: "Yo (privado)",
};

const AUDIENCE_HINTS: Record<Audience, string> = {
  publico: "Cualquier visitante sin iniciar sesión.",
  promotores: "Organizadores autenticados — ven público + promotores.",
  privado: "Vos como dueño — ves todos los campos, incluido privado.",
};

function canSee(level: VisibilityLevel, audience: Audience): boolean {
  if (audience === "privado") return true;
  if (audience === "promotores") return level !== "privado";
  return level === "publico";
}

function fmtNumber(n: number | null | undefined, suffix = ""): string | null {
  if (n === null || n === undefined) return null;
  return `${n}${suffix}`;
}

function fmtLocation(city: string | null, region: string | null, country: string | null): string | null {
  const parts = [city, region, country].filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(", ");
}

function joinLabels(ids: string[] | null | undefined, map: Record<string, string>): string | null {
  if (!ids || ids.length === 0) return null;
  return ids.map((id) => map[id] ?? id).join(" · ");
}

/**
 * Vista previa del perfil filtrada por audiencia (HU-003 PR C).
 *
 * Refleja exactamente lo que verá cada tipo de visor según el catálogo
 * `profile_field_visibility`. Replica la lógica que usará la vista pública
 * `/u/[slug]` en PR D — mantener ambas consistentes al modificar.
 */
export function ProfilePreview(props: Props) {
  const [audience, setAudience] = useState<Audience>("publico");
  const v = props.visibility;

  // Helper para listar campos visibles por bloque.
  type Row = { label: string; value: string | null; key: ProfileFieldKey };

  const identityRows: Row[] = [
    {
      key: "identity.full_name" as IdentityFieldKey,
      label: "Nombre completo",
      value: props.core?.full_name ?? null,
    },
    {
      key: "identity.birth_date" as IdentityFieldKey,
      label: "Fecha de nacimiento",
      value: props.core?.birth_date ?? null,
    },
    {
      key: "identity.city" as IdentityFieldKey,
      label: "Ubicación",
      value: fmtLocation(
        props.core?.city ?? null,
        props.core?.region ?? null,
        props.core?.country ?? null,
      ),
    },
    {
      key: "identity.primary_sport_id" as IdentityFieldKey,
      label: "Disciplina principal",
      value: props.core?.primary_sport_id
        ? props.sportsById[props.core.primary_sport_id] ?? props.core.primary_sport_id
        : null,
    },
    {
      key: "identity.interests" as IdentityFieldKey,
      label: "Intereses",
      value:
        props.core?.interests && props.core.interests.length > 0
          ? props.core.interests.join(", ")
          : null,
    },
    {
      key: "identity.soft_skills" as IdentityFieldKey,
      label: "Habilidades blandas",
      value:
        [
          joinLabels(props.core?.soft_skills_tags ?? null, props.softSkillsById),
          props.core?.soft_skills_text ?? null,
        ]
          .filter(Boolean)
          .join(" — ") || null,
    },
  ];

  const morphoRows: Row[] = [
    {
      key: "morpho.height_m" as MorphoFieldKey,
      label: "Estatura",
      value: fmtNumber(props.morpho?.height_m ?? null, " m"),
    },
    {
      key: "morpho.weight_kg" as MorphoFieldKey,
      label: "Peso competitivo",
      value: fmtNumber(props.morpho?.weight_kg ?? null, " kg"),
    },
    {
      key: "morpho.wingspan_m" as MorphoFieldKey,
      label: "Envergadura",
      value: fmtNumber(props.morpho?.wingspan_m ?? null, " m"),
    },
    {
      key: "morpho.laterality" as MorphoFieldKey,
      label: "Lateralidad",
      value: props.morpho?.laterality ?? null,
    },
    {
      key: "morpho.somatotype" as MorphoFieldKey,
      label: "Somatotipo",
      value: props.morpho?.somatotype ?? null,
    },
  ];

  const conditionalRows: Row[] = [
    {
      key: "conditional.strength" as ConditionalFieldKey,
      label: "Fuerza",
      value:
        [
          joinLabels(props.conditional?.strength_tags ?? null, props.strengthTagsById),
          props.conditional?.strength_notes ?? null,
        ]
          .filter(Boolean)
          .join(" — ") || null,
    },
    {
      key: "conditional.speed" as ConditionalFieldKey,
      label: "Velocidad",
      value:
        [
          joinLabels(props.conditional?.speed_tags ?? null, props.speedTagsById),
          props.conditional?.speed_notes ?? null,
        ]
          .filter(Boolean)
          .join(" — ") || null,
    },
    {
      key: "conditional.endurance" as ConditionalFieldKey,
      label: "Resistencia",
      value:
        [
          joinLabels(props.conditional?.endurance_tags ?? null, props.enduranceTagsById),
          props.conditional?.endurance_notes ?? null,
        ]
          .filter(Boolean)
          .join(" — ") || null,
    },
    {
      key: "conditional.flexibility" as ConditionalFieldKey,
      label: "Flexibilidad",
      value:
        [
          joinLabels(props.conditional?.flexibility_tags ?? null, props.flexibilityTagsById),
          props.conditional?.flexibility_notes ?? null,
        ]
          .filter(Boolean)
          .join(" — ") || null,
    },
  ];

  const technicalRows: Row[] = [
    {
      key: "technical.football.position" as TechnicalFootballFieldKey,
      label: "Posición",
      value: props.technicalFootball?.position ?? null,
    },
    {
      key: "technical.football.dominant_foot" as TechnicalFootballFieldKey,
      label: "Pierna dominante",
      value: props.technicalFootball?.dominant_foot ?? null,
    },
    {
      key: "technical.football.performance_notes" as TechnicalFootballFieldKey,
      label: "Rendimiento individual y marcas",
      value: props.technicalFootball?.performance_notes ?? null,
    },
    {
      key: "technical.football.tactical_role_notes" as TechnicalFootballFieldKey,
      label: "Rendimiento colectivo y rol táctico",
      value: props.technicalFootball?.tactical_role_notes ?? null,
    },
  ];

  const sections: { title: string; rows: Row[] }[] = [
    { title: "1 · Identidad", rows: identityRows },
    { title: "2 · Morfológico y biométrico", rows: morphoRows },
    { title: "3 · Capacidades condicionales", rows: conditionalRows },
    { title: "4 · Destrezas técnicas (fútbol)", rows: technicalRows },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Audiencia de la vista previa"
        className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted p-1"
      >
        {AUDIENCE_ORDER.map((a) => {
          const isActive = a === audience;
          return (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setAudience(a)}
              className={
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                (isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {AUDIENCE_LABELS[a]}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{AUDIENCE_HINTS[audience]}</p>

      <div className="flex flex-col gap-6">
        {sections.map((sec) => {
          const visible = sec.rows.filter(
            (r) => canSee(v[r.key], audience) && r.value !== null,
          );
          const hidden = sec.rows.filter(
            (r) => !canSee(v[r.key], audience),
          );

          return (
            <section
              key={sec.title}
              className="rounded-lg border bg-background p-4"
            >
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                {sec.title}
              </h3>
              {visible.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Esta audiencia no ve ningún campo de este bloque.
                </p>
              ) : (
                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
                  {visible.map((r) => (
                    <div key={r.key} className="contents">
                      <dt className="text-muted-foreground">{r.label}</dt>
                      <dd className="text-foreground">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {hidden.length > 0 && audience !== "privado" ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Oculto para esta audiencia:{" "}
                  {hidden.map((r) => r.label).join(", ")}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
