// ── Domain status constants — single source of truth ─────────────────────────
// All string literals for DB status fields live here.
// Import from this file; never hard-code status strings in components or hooks.

export const BOOKING_STATUS = {
  PENDING:   "pendiente",
  CONFIRMED: "confirmada",
  CANCELLED: "cancelada",
  REJECTED:  "rechazada",
} as const;
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const MATCH_STATUS = {
  OPEN:      "open",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;
export type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS];

export const PARTICIPANT_STATUS = {
  JOINED:    "joined",
  REQUESTED: "requested",
  LEFT:      "left",
  ATTENDED:  "attended",
} as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUS)[keyof typeof PARTICIPANT_STATUS];

export const FRIENDSHIP_STATUS = {
  PENDING:  "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;
export type FriendshipStatus = (typeof FRIENDSHIP_STATUS)[keyof typeof FRIENDSHIP_STATUS];

export const TOURNAMENT_STATUS = {
  DRAFT:       "draft",
  OPEN:        "open",
  IN_PROGRESS: "in_progress",
  COMPLETED:   "completed",
  CANCELLED:   "cancelled",
} as const;
export type TournamentStatus = (typeof TOURNAMENT_STATUS)[keyof typeof TOURNAMENT_STATUS];

export const REGISTRATION_STATUS = {
  PENDING:  "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUS)[keyof typeof REGISTRATION_STATUS];

export const VERIFICATION_STATUS = {
  PENDING:    "pendiente",
  APPROVED:   "aprobada",
  REJECTED:   "rechazada",
  UNDER_AGE:  "menor_edad",
} as const;
export type VerificationStatus = (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];
