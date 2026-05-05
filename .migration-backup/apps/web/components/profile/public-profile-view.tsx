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
  core: ProfileCore;
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
  audience: Audience;
};

function canSee(level: VisibilityLevel | undefined, audience: Audience): boolean {
  const l = level || "privado";
  if (audience === "privado") return true;
  if (audience === "promotores") return l !== "privado";
  return l === "publico";
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
 * Ficha pública del deportista (HU-003 PR D).
 *
 * Muestra los datos filtrados por la audiencia resuelta en el servidor.
 * Reutiliza la lógica de filtrado de ProfilePreview pero sin el selector
 * de audiencia (ya que esta es una vista fija para el visitante).
 */
export function PublicProfileView(props: Props) {
  const { audience, visibility: v } = props;

  type Row = { label: string; value: string | null; key: ProfileFieldKey };

  const identityRows: Row[] = [
    {
      key: "identity.full_name" as IdentityFieldKey,
      label: "Nombre completo",
      value: props.core.full_name,
    },
    {
      key: "identity.birth_date" as IdentityFieldKey,
      label: "Fecha de nacimiento",
      value: props.core.birth_date,
    },
    {
      key: "identity.city" as IdentityFieldKey,
      label: "Ubicación",
      value: fmtLocation(
        props.core.city ?? null,
        props.core.region ?? null,
        props.core.country ?? null,
      ),
    },
    {
      key: "identity.primary_sport" as IdentityFieldKey, // Corregido key según migration
      label: "Disciplina principal",
      value: props.core.primary_sport_id
        ? props.sportsById[props.core.primary_sport_id] ?? props.core.primary_sport_id
        : null,
    },
    {
      key: "identity.interests" as IdentityFieldKey,
      label: "Intereses",
      value:
        props.core.interests && props.core.interests.length > 0
          ? props.core.interests.join(", ")
          : null,
    },
    {
      key: "identity.soft_skills" as IdentityFieldKey,
      label: "Habilidades blandas",
      value:
        [
          joinLabels(props.core.soft_skills_tags ?? null, props.softSkillsById),
          props.core.soft_skills_text ?? null,
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
    <div className="flex flex-col gap-6">
      {sections.map((sec) => {
        const visible = sec.rows.filter(
          (r) => canSee(v[r.key], audience) && r.value !== null,
        );

        if (visible.length === 0) return null;

        return (
          <section
            key={sec.title}
            className="rounded-lg border bg-background p-4"
          >
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              {sec.title}
            </h3>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
              {visible.map((r) => (
                <div key={r.key} className="contents">
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd className="text-foreground">{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
