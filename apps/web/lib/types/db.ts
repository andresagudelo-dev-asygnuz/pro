// Tipos TS de la DB del MVP. Mantener sincronizado con
// apps/web/supabase/migrations/*_init_mvp.sql
//
// Cuando se quiera, podés regenerar con:
//   supabase gen types typescript --project-id <ref> > lib/types/db.ts
// pero para el MVP los mantenemos a mano para no depender de CLI linked.

export type SkillLevel = "principiante" | "intermedio" | "avanzado" | "pro";

export type MatchStatus =
  | "open"
  | "full"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ParticipantStatus = "joined" | "left" | "attended" | "no_show" | "requested" | "invited";

export type AgeVerificationStatus =
  | "pendiente"
  | "aprobada"
  | "rechazada"
  | "menor_edad";

export interface AgeVerification {
  id: string;
  user_id: string;
  status: AgeVerificationStatus;
  storage_path: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Sport {
  id: string;
  name: string;
  icon: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  primary_sport_id: string | null;
  primary_skill_level: SkillLevel | null;
  rating_avg: number;
  rating_count: number;
  matches_played: number;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  organizer_id: string;
  sport_id: string;
  title: string;
  description: string | null;
  skill_level: SkillLevel | null;
  city: string;
  location: string;
  starts_at: string;
  duration_minutes: number;
  max_players: number;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
}

export interface MatchParticipant {
  match_id: string;
  user_id: string;
  status: ParticipantStatus;
  joined_at: string;
}

export interface Rating {
  id: string;
  match_id: string;
  rater_id: string;
  rated_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
  { value: "pro", label: "Pro" },
];

// ---------------------------------------------------------------------------
// Perfil tipo ficha (HU-003 / Sprint 2). Mantener sincronizado con
// apps/web/supabase/migrations/20260417140000_g4_sprint2_profiles.sql
// ---------------------------------------------------------------------------

export type VisibilityLevel = "publico" | "promotores" | "privado";

export type Laterality = "diestro" | "zurdo" | "ambos";
export type Somatotype = "ectomorfo" | "mesomorfo" | "endomorfo" | "mixto";
export type FootballPosition =
  | "arquero"
  | "defensa"
  | "mediocampista"
  | "delantero";
export type DominantFoot = "derecho" | "izquierdo" | "ambos";

export type ProfileBloque =
  | "identity"
  | "morpho"
  | "conditional"
  | "technical.football";

export type SkillTagCategory =
  | "soft"
  | "strength"
  | "speed"
  | "endurance"
  | "flexibility";

export interface SkillTag {
  id: string;
  category: SkillTagCategory;
  label: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VisibilityField {
  field_key: string;
  bloque: ProfileBloque;
  default_level: VisibilityLevel;
  label: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileCore {
  user_id: string;
  full_name: string;
  birth_date: string; // YYYY-MM-DD
  city: string;
  region: string | null;
  country: string; // ISO alpha-2
  primary_sport_id: string;
  interests: string[];
  soft_skills_text: string | null;
  soft_skills_tags: string[];
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileFieldVisibility {
  user_id: string;
  field_key: string;
  level: VisibilityLevel;
  created_at: string;
  updated_at: string;
}

export const VISIBILITY_LEVELS: {
  value: VisibilityLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "publico",
    label: "Público",
    description: "Cualquiera puede verlo, incluso sin iniciar sesión.",
  },
  {
    value: "promotores",
    label: "Promotores",
    description: "Sólo organizadores de torneos y usuarios autenticados.",
  },
  {
    value: "privado",
    label: "Privado",
    description: "Sólo vos podés verlo.",
  },
];

export const IDENTITY_FIELD_KEYS = [
  "identity.full_name",
  "identity.city",
  "identity.region",
  "identity.country",
  "identity.primary_sport",
  "identity.interests",
  "identity.soft_skills",
] as const;

export type IdentityFieldKey = (typeof IDENTITY_FIELD_KEYS)[number];

// ---------------------------------------------------------------------------
// Bloque 2 · Morfológico / Biométrico
// ---------------------------------------------------------------------------

export interface ProfileMorpho {
  user_id: string;
  height_m: number | null; // numeric(3,2) — 1.00..2.50
  weight_kg: number | null; // numeric(5,2) — 30..200
  wingspan_m: number | null; // numeric(3,2) — 1.00..2.80
  laterality: Laterality | null;
  somatotype: Somatotype | null;
  created_at: string;
  updated_at: string;
}

export const MORPHO_FIELD_KEYS = [
  "morpho.height_m",
  "morpho.weight_kg",
  "morpho.wingspan_m",
  "morpho.laterality",
  "morpho.somatotype",
] as const;

export type MorphoFieldKey = (typeof MORPHO_FIELD_KEYS)[number];

// ---------------------------------------------------------------------------
// Bloque 3 · Capacidades Condicionales
// ---------------------------------------------------------------------------

export interface ProfileConditional {
  user_id: string;
  strength_tags: string[];
  strength_notes: string | null;
  speed_tags: string[];
  speed_notes: string | null;
  endurance_tags: string[];
  endurance_notes: string | null;
  flexibility_tags: string[];
  flexibility_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const CONDITIONAL_FIELD_KEYS = [
  "conditional.strength",
  "conditional.speed",
  "conditional.endurance",
  "conditional.flexibility",
] as const;

export type ConditionalFieldKey = (typeof CONDITIONAL_FIELD_KEYS)[number];

// ---------------------------------------------------------------------------
// Bloque 4 · Destrezas Técnicas Fútbol
// ---------------------------------------------------------------------------

export interface ProfileTechnicalFootball {
  user_id: string;
  position: FootballPosition;
  dominant_foot: DominantFoot;
  performance_notes: string | null;
  tactical_role_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const TECHNICAL_FOOTBALL_FIELD_KEYS = [
  "technical.football.position",
  "technical.football.dominant_foot",
  "technical.football.performance_notes",
  "technical.football.tactical_role_notes",
] as const;

export type TechnicalFootballFieldKey =
  (typeof TECHNICAL_FOOTBALL_FIELD_KEYS)[number];

// ---------------------------------------------------------------------------
// Union of all profile field keys (used by FieldWithVisibility + schemas)
// ---------------------------------------------------------------------------

export const ALL_PROFILE_FIELD_KEYS = [
  ...IDENTITY_FIELD_KEYS,
  ...MORPHO_FIELD_KEYS,
  ...CONDITIONAL_FIELD_KEYS,
  ...TECHNICAL_FOOTBALL_FIELD_KEYS,
] as const;

export type ProfileFieldKey = (typeof ALL_PROFILE_FIELD_KEYS)[number];

// Enum value arrays for selects
export const LATERALITY_VALUES = ["diestro", "zurdo", "ambos"] as const satisfies readonly Laterality[];
export const SOMATOTYPE_VALUES = [
  "ectomorfo",
  "mesomorfo",
  "endomorfo",
  "mixto",
] as const satisfies readonly Somatotype[];
export const FOOTBALL_POSITION_VALUES = [
  "arquero",
  "defensa",
  "mediocampista",
  "delantero",
] as const satisfies readonly FootballPosition[];
export const DOMINANT_FOOT_VALUES = [
  "derecho",
  "izquierdo",
  "ambos",
] as const satisfies readonly DominantFoot[];
