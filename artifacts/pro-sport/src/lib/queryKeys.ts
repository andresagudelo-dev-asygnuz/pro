/**
 * Centralized React Query key factory.
 * All useQuery / useMutation calls must use keys from this file.
 * Benefits: refetch-by-key, type-safe invalidation, no string duplication.
 */
export const KEYS = {
  // ── Auth / Profiles ─────────────────────────────────────────────
  profile: (userId: string) => ["profile", userId] as const,
  profilePublic: (slug: string) => ["profile", "public", slug] as const,
  profileBlocks: (userId: string) => ["profile", "blocks", userId] as const,
  userRoles: (userId: string) => ["user-roles", userId] as const,

  // ── Players ─────────────────────────────────────────────────────
  players: (filters?: Record<string, unknown>) =>
    filters ? (["players", filters] as const) : (["players"] as const),

  // ── Matches ─────────────────────────────────────────────────────
  match: (id: string) => ["match", id] as const,
  matchParticipants: (matchId: string) => ["match", matchId, "participants"] as const,
  matchInvitations: (matchId: string) => ["match", matchId, "invitations"] as const,
  matchWaitlist: (matchId: string) => ["match", matchId, "waitlist"] as const,
  myMatches: (userId: string, filter?: "organized" | "participating") => 
    filter ? ["my-matches", filter, userId] as const : ["my-matches", userId] as const,
  feed: (filters?: Record<string, unknown>) =>
    filters ? (["feed", filters] as const) : (["feed"] as const),

  // ── Chat ────────────────────────────────────────────────────────
  conversations: (userId: string) => ["conversations", userId] as const,
  conversationMeta: (convId: string, userId: string) =>
    ["conversation-meta", convId, userId] as const,
  messages: (convId: string) => ["messages", convId] as const,

  // ── Notifications ────────────────────────────────────────────────
  notifications: (userId: string) => ["notifications", userId] as const,
  notificationsUnread: (userId: string) => ["notifications", userId, "unread"] as const,

  // ── Sports ──────────────────────────────────────────────────────
  sports: ["sports"] as const,

  // ── Canchas ─────────────────────────────────────────────────────
  canchas: (filters?: Record<string, unknown>) =>
    filters ? (["canchas", filters] as const) : (["canchas"] as const),
  cancha: (id: string) => ["cancha", id] as const,
  myCanchas: (userId: string) => ["my-canchas", userId] as const,
  canchaAgenda: (canchaId: string, date: string) => ["cancha-agenda", canchaId, date] as const,
  canchaClients: (canchaId: string) => ["cancha-clients", canchaId] as const,
  canchaClientDetail: (canchaId: string, userId: string) =>
    ["cancha-client", canchaId, userId] as const,
  ownerPendingBookings: (userId: string) => ["owner-pending-bookings", userId] as const,
  ownerDashboard: (userId: string) => ["owner-dashboard", userId] as const,
  ownerAdmins: (userId: string) => ["owner-admins", userId] as const,
  ownerProfile: (userId: string) => ["owner-profile", userId] as const,

  // ── Bookings ────────────────────────────────────────────────────
  myReservas: (userId: string) => ["my-reservas", userId] as const,
  booking: (id: string) => ["booking", id] as const,

  // ── Teams ───────────────────────────────────────────────────────
  teams: (filters?: Record<string, unknown>) =>
    filters ? (["teams", filters] as const) : (["teams"] as const),
  team: (id: string) => ["team", id] as const,
  myTeams: (userId: string) => ["my-teams", userId] as const,

  // ── Tournaments ─────────────────────────────────────────────────
  tournaments: (filters?: Record<string, unknown>) =>
    filters ? (["tournaments", filters] as const) : (["tournaments"] as const),
  tournament: (id: string) => ["tournament", id] as const,
  tournamentRegistrations: (id: string, userId?: string) =>
    ["tournament-registrations", id, userId] as const,
  tournamentStandings: (id: string) => ["tournament-standings", id] as const,
  tournamentMatches: (id: string) => ["tournament-matches", id] as const,
  myTournaments: (userId: string) => ["my-tournaments", userId] as const,

  // ── Venues ──────────────────────────────────────────────────────
  venues: (filters?: Record<string, unknown>) =>
    filters ? (["venues", filters] as const) : (["venues"] as const),
  venue: (id: string) => ["venue", id] as const,

  // ── Admin ───────────────────────────────────────────────────────
  adminVenues: ["admin-venues"] as const,
  adminVerifications: ["admin-verifications"] as const,

  // ── Friendships ─────────────────────────────────────────────────
  friends: (userId: string) => ["friends", userId] as const,
  friendRequests: (userId: string) => ["friend-requests", userId] as const,

  // ── Misc ────────────────────────────────────────────────────────
  feedback: ["feedback"] as const,
} as const;

/** Default stale times by data category */
export const STALE = {
  /** Static/rarely-changes: sports list, venues, public profiles */
  static: 1_000 * 60 * 60,       // 1 hour
  /** Semi-static: user profiles, team details, tournament info */
  slow: 1_000 * 60 * 5,          // 5 minutes
  /** Dynamic: matches, notifications, bookings */
  normal: 1_000 * 60,            // 1 minute
  /** Real-time backed: messages, live match status */
  realtime: 1_000 * 30,          // 30 seconds
} as const;
