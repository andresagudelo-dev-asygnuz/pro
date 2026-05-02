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
  tournament_goals: number;
  tournament_matches: number;
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
  venue_id: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchParticipant {
  match_id: string;
  user_id: string;
  status: ParticipantStatus;
  joined_at: string;
  confirmed_at: string | null;
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

export type VisibilityLevel = "publico" | "promotores" | "privado";
export type Laterality = "diestro" | "zurdo" | "ambos";
export type Somatotype = "ectomorfo" | "mesomorfo" | "endomorfo" | "mixto";
export type FootballPosition = "arquero" | "defensa" | "mediocampista" | "delantero";
export type DominantFoot = "derecho" | "izquierdo" | "ambos";

export interface SkillTag {
  id: string;
  category: string;
  label: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileCore {
  user_id: string;
  full_name: string;
  birth_date: string;
  city: string;
  region: string | null;
  country: string;
  primary_sport_id: string;
  interests: string[];
  soft_skills_text: string | null;
  soft_skills_tags: string[];
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileMorpho {
  user_id: string;
  height_m: number | null;
  weight_kg: number | null;
  wingspan_m: number | null;
  laterality: Laterality | null;
  somatotype: Somatotype | null;
  created_at: string;
  updated_at: string;
}

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

export interface ProfileTechnicalFootball {
  user_id: string;
  position: FootballPosition;
  dominant_foot: DominantFoot;
  performance_notes: string | null;
  tactical_role_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const ALL_PROFILE_FIELD_KEYS = [
  "identity.full_name",
  "identity.city",
  "identity.region",
  "identity.country",
  "identity.primary_sport",
  "identity.interests",
  "identity.soft_skills",
  "morpho.height_m",
  "morpho.weight_kg",
  "morpho.wingspan_m",
  "morpho.laterality",
  "morpho.somatotype",
  "conditional.strength",
  "conditional.speed",
  "conditional.endurance",
  "conditional.flexibility",
  "technical.football.position",
  "technical.football.dominant_foot",
  "technical.football.performance_notes",
  "technical.football.tactical_role_notes",
] as const;

export type ProfileFieldKey = (typeof ALL_PROFILE_FIELD_KEYS)[number];

export const VISIBILITY_LEVELS: { value: VisibilityLevel; label: string; description: string }[] = [
  { value: "publico", label: "Público", description: "Cualquiera puede verlo." },
  { value: "promotores", label: "Promotores", description: "Solo organizadores." },
  { value: "privado", label: "Privado", description: "Solo vos." },
];
