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

export type PlayerPosition = "arquero" | "defensa" | "mediocampista" | "delantero";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  city: string | null;
  primary_sport_id: string | null;
  primary_skill_level: SkillLevel | null;
  rating_avg: number;
  rating_count: number;
  matches_played: number;
  tournament_goals: number;
  tournament_matches: number;
  position: PlayerPosition | null;
  preferred_foot: DominantFoot | null;
  skill_pace: number;
  skill_shooting: number;
  skill_passing: number;
  skill_dribbling: number;
  skill_defending: number;
  skill_physical: number;
  business_name: string | null;
  business_phone: string | null;
  business_whatsapp: string | null;
  business_website: string | null;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  sport_type: string;
  city: string;
  owner_id: string;
  is_public: boolean;
  max_members: number;
  header_color: string | null;
  jersey_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: "owner" | "captain" | "player";
  joined_at: string;
}

export const PLAYER_POSITIONS: { value: PlayerPosition; label: string; abbr: string }[] = [
  { value: "arquero", label: "Arquero / Portero", abbr: "POR" },
  { value: "defensa", label: "Defensa", abbr: "DEF" },
  { value: "mediocampista", label: "Mediocampista", abbr: "MED" },
  { value: "delantero", label: "Delantero", abbr: "DEL" },
];

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
  cancha_booking_id: string | null;
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
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export type ConversationType = "booking" | "match" | "tournament" | "friend" | "direct";

export interface Conversation {
  id: string;
  type: ConversationType;
  reference_id: string | null;
  title: string;
  subtitle: string | null;
  metadata: any;
  last_message_text: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
}

export type NotificationData = { [key: string]: unknown };

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  data: NotificationData;
  created_at: string;
  read_at: string | null;
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

export const PREFERRED_FOOT_OPTIONS: { value: DominantFoot; label: string }[] = [
  { value: "derecho", label: "Derecho" },
  { value: "izquierdo", label: "Izquierdo" },
  { value: "ambos", label: "Ambos" },
];

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
  visibility: VisibilityLevel;
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
  visibility: VisibilityLevel;
  created_at: string;
  updated_at: string;
}

export interface ProfileTechnicalFootball {
  user_id: string;
  position: FootballPosition | null;
  dominant_foot: DominantFoot | null;
  performance_notes: string | null;
  tactical_role_notes: string | null;
  visibility: VisibilityLevel;
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

// ─── Canchas ────────────────────────────────────────────────────────────────

export type CanchaSportType =
  | "futbol_11" | "futbol_9" | "futbol_5" | "futbol_sala"
  | "padel" | "tenis" | "basket" | "voleibol" | "otro";

export type BookingStatus = "pendiente" | "confirmada" | "cancelada";

export interface Cancha {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  sport_type: CanchaSportType;
  capacity: number;
  address: string;
  city: string;
  price_per_hour: number;
  discount_percent: number;
  is_active: boolean;
  phone: string | null;
  whatsapp: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanchaSchedule {
  id: string;
  cancha_id: string;
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_available: boolean;
}

export interface CanchaBooking {
  id: string;
  cancha_id: string;
  booked_by: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  match_id: string | null;
  total_price: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TimeSlot = {
  start: string;
  end: string;
  isAvailable: boolean;
};

export const SPORT_TYPE_LABELS: Record<CanchaSportType, string> = {
  futbol_11: "Fútbol 11",
  futbol_9: "Fútbol 9",
  futbol_5: "Fútbol 5",
  futbol_sala: "Fútbol Sala",
  padel: "Pádel",
  tenis: "Tenis",
  basket: "Básquet",
  voleibol: "Vóleibol",
  otro: "Otro",
};

export const SPORT_TYPE_ICONS: Record<CanchaSportType, string> = {
  futbol_11: "⚽",
  futbol_9: "⚽",
  futbol_5: "⚽",
  futbol_sala: "⚽",
  padel: "🎾",
  tenis: "🎾",
  basket: "🏀",
  voleibol: "🏐",
  otro: "🏟️",
};

export const CANCHAS_SPORT_OPTIONS: { value: CanchaSportType; label: string }[] = [
  { value: "futbol_5", label: "Fútbol 5" },
  { value: "futbol_9", label: "Fútbol 9" },
  { value: "futbol_11", label: "Fútbol 11" },
  { value: "futbol_sala", label: "Fútbol Sala" },
  { value: "padel", label: "Pádel" },
  { value: "tenis", label: "Tenis" },
  { value: "basket", label: "Básquet" },
  { value: "voleibol", label: "Vóleibol" },
  { value: "otro", label: "Otro" },
];

export const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export type RecurringBookingStatus = "pendiente" | "confirmada" | "cancelada" | "pausada";

export type RecurringBookingFrequency = "weekly" | "biweekly" | "monthly";

export interface RecurringBooking {
  id: string;
  cancha_id: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string | null; // null = indefinite (no end date)
  frequency: RecurringBookingFrequency;
  status: RecurringBookingStatus;
  price_per_session: number;
  notes: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RecurringExceptionAction = "cancelled" | "modified";

export interface RecurringException {
  id: string;
  recurring_id: string;
  original_date: string; // "YYYY-MM-DD"
  action: RecurringExceptionAction;
  new_start: string | null;
  new_end: string | null;
  new_price: number | null;
  notes: string | null;
  created_at: string;
}

export type ClientTagType = "vip" | "frecuente" | "bloqueado";

export interface CanchaClientTag {
  cancha_id: string;
  user_id: string;
  tag: ClientTagType;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const SPORT_ID_TO_CANCHA_TYPES: Record<string, CanchaSportType[]> = {
  futbol:  ["futbol_5", "futbol_9", "futbol_11", "futbol_sala"],
  padel:   ["padel"],
  tenis:   ["tenis"],
  basket:  ["basket"],
  voley:   ["voleibol"],
  running: [],
};

export const ENABLED_CITIES: string[] = [
  "Manizales",
  "Bogotá",
  "Medellín",
  "Cali",
  "Barranquilla",
  "Cartagena",
  "Bucaramanga",
  "Pereira",
  "Santa Marta",
  "Ibagué",
  "Cúcuta",
  "Villavicencio",
  "Armenia",
  "Pasto",
  "Montería",
  "Valledupar",
  "Neiva",
  "Popayán",
  "Tunja",
  "Sincelejo",
];

export type FriendshipStatus = "pending" | "accepted" | "rejected" | "blocked";

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface MatchWaitlist {
  id: string;
  match_id: string;
  user_id: string;
  joined_at: string;
}

export type MatchInvitationStatus = "pending" | "accepted" | "rejected";

export interface MatchInvitation {
  id: string;
  match_id: string;
  inviter_id: string;
  invitee_id: string;
  status: MatchInvitationStatus;
  created_at: string;
  updated_at: string;
}
