# PRO. — Plataforma Deportiva

## Overview

pnpm workspace monorepo using TypeScript. Migration from Vercel/Next.js → Replit Vite+React artifact.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (`artifacts/pro-sport`) — main sports platform
- **API**: Express 5 (`artifacts/api-server`) — auxiliary API server on port 8080
- **Auth**: Supabase (email/password, `@supabase/ssr` `createBrowserClient`)
- **Routing**: Wouter (client-side, replaces Next.js router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase PostgreSQL (accessed via Supabase JS client directly from frontend)
- **Build**: Vite (ESM, `import.meta.env.BASE_URL` for path prefix)

## Environment Variables

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key

## Key Architecture

### Auth
- `src/context/AuthContext.tsx` — `AuthProvider` + `useAuth()` hook. Exposes `user`, `session`, `profile`, `roles` (is_player/is_promoter from `user_roles` table), `loading`, `signOut`, `refreshProfile`.
- `src/components/ProtectedRoute.tsx` — Wraps authenticated routes; redirects to `/login` if no session.
- All protected routes in `App.tsx` use `<ProtectedRoute component={Page} />`.
- **Roles**: `user_roles` table seeded at signup via DB trigger `handle_new_user_roles()`. SignupForm sends `is_player`/`is_promoter` booleans in `options.data` to Supabase. Tournament creation requires `is_promoter = true` (RLS policy).

### Tournament Creation Guard
- `NewTournamentPage` checks `roles?.is_promoter` before rendering the form. Non-promoters see a "Se requiere rol de Promotor" screen with a link to their profile.
- `ProfilePage` shows role badges (Jugador/Promotor) and a banner allowing existing users to self-upgrade to the Promotor role via `user_roles` UPDATE.

### Error Handling
- `src/lib/errors/map-db-error.ts` — maps Supabase/PostgREST error codes to Spanish messages. `PGRST205` (schema cache/permissions) maps to "No tenés permisos para hacer esto."

### Routes
| Path | Component | Auth |
|------|-----------|------|
| `/` | LandingPage | Public |
| `/login` | LoginPage | Public |
| `/registro` or `/signup` | SignupPage | Public |
| `/feedback` | FeedbackPage | Public |
| `/u/:slug` | PublicProfilePage | Public |
| `/feed` | FeedPage | Protected |
| `/perfil` | ProfilePage | Protected |
| `/perfil/editar` | ProfileEditPage | Protected |
| `/onboarding` | OnboardingPage | Protected |
| `/notificaciones` | NotificationsPage | Protected |
| `/verificacion` | VerificationPage | Protected |
| `/amigos` | FriendsPage | Protected |
| `/matches/new` | NewMatchPage | Protected |
| `/matches/:id` | MatchDetailPage | Protected |
| `/tournaments` | TournamentsPage | Protected |
| `/tournaments/new` | NewTournamentPage | Protected |
| `/tournaments/mine` | MyTournamentsPage | Protected |
| `/tournaments/:id` | TournamentDetailPage | Protected |
| `/tournaments/:id/matches` | TournamentMatchesPage | Protected |
| `/tournaments/:id/standings` | TournamentStandingsPage | Protected |
| `/tournaments/:id/register` | TournamentRegisterPage | Protected |
| `/tournaments/:id/registrations` | TournamentRegistrationsPage | Protected |
| `/mis-partidos` | MisPartidosPage | Protected |
| `/mis-reservas` | MisReservasPage | Protected |
| `/mis-canchas` | MisCanchasPage | Protected |
| `/canchas` | CanchasPage | Public |
| `/canchas/nueva` | NuevaCanchaPage | Protected |
| `/canchas/:id` | CanchaDetailPage | Public |
| `/canchas/:id/agenda` | CanchaAgendaPage | Protected |
| `/canchas/:id/editar` | EditCanchaPage | Protected |
| `/admin/venues` | AdminVenuesPage | Protected |
| `/admin/verificaciones` | AdminVerificationsPage | Protected |

### Friends System
- **DB tables**: `friendships` (requester_id, addressee_id, status: pending/accepted/rejected/blocked) + `match_invitations` (match_id, inviter_id, invitee_id, status: pending/accepted/rejected)
- **API**: `src/lib/friends/api.ts` — searchUsers, getFriends, getPendingReceived/Sent, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, sendMatchInvitations, getMyMatchInvitation, getMatchInvitations, respondToMatchInvitation
- **FriendsPage** (`/amigos`): 3 tabs — Amigos (list + remove), Solicitudes (received + sent), Buscar (live search)
- **Friend button**: on UserProfilePage + PublicProfilePage, shows state-aware button (Add / Pending / Accept+Reject / Remove)
- **NewMatchPage**: 3-step wizard — Step 3 lets organizer select friends to invite before creating the match
- **MatchDetailPage**: invitation banner (Accept/Reject) for invited users; pending invitations section for organizer
- **NotificationsPage**: shows pending friend requests + match invitations with inline accept/reject
- **Bottom nav**: all pages now show 👥 Amigos instead of 🔔 Notif

### Bottom Navigation (BottomNav.tsx)
- 5-tab fixed bottom nav: Inicio / Torneos / Crear (violet FAB) / Canchas / Perfil
- Active tab: violet bg pill + dot indicator below icon
- Integrated into AppLayout (covers all detail pages) + every standalone page
- Crear button always stays centered as a gradient violet rounded square button

### Canchas System
- **CanchasPage** — Browse all canchas with sport chip filters + city search, cancha cards with price/discount
- **CanchaDetailPage** — View cancha details, schedule availability picker, booking form
- **NuevaCanchaPage** — Register new cancha (is_cancha role required)
- **CanchaAgendaPage** — Owner manages weekly schedule + daily bookings (shows booker full_name + avatar)
- **EditCanchaPage** — Pre-filled edit form for all cancha fields (owner-only access)
- **MisCanchasPage** — Owner's cancha list with Agenda/Editar/Ver buttons + active toggle

### Pages summary
- **LandingPage** — Countdown banner, hero, features, registration form
- **LoginPage / SignupPage** — Supabase email/password auth; signup → onboarding redirect if session immediate
- **OnboardingPage** — Profile setup after signup (username, city, skill level)
- **FeedPage** — Open matches list; sport chip filters from DB + city dropdown filter; Mis Partidos shortcut
- **MatchDetailPage** — Join/leave match, participant list, confirmation, inline chat, invitation accept/reject; organizer can cancel match (status → cancelled)
- **NewMatchPage** — 3-step wizard: info (+ is_public toggle) → place/date → invite friends; is_public sent to DB
- **MisPartidosPage** — Two tabs: "Organizo" + "Participo"; sport icon + status badge per match
- **MisReservasPage** — Cancha bookings list; status badges (pendiente/confirmada/cancelada), grouped by active/cancelled
- **FriendsPage** — Search users, manage friends, handle requests
- **TournamentsPage** — List all tournaments with slots progress bar
- **TournamentDetailPage** — Tournament info, standings/matches links, register button
- **NewTournamentPage** — Create tournament form
- **TournamentMatchesPage** — Fixture; displayRegistration shows real player full_name via profiles join
- **TournamentRegistrationsPage** — Registrations with real full_name via profiles join + avatar initials
- **TournamentStandingsPage / RegisterPage / NewMatchPage / MatchResultPage** — Full tournament flow
- **ProfilePage** — FIFA-style PlayerCard in dark hero with ambient glow; stats bar (OVR/Partidos/Rating/Goles); unified-violet skills bars; teams section; activity nav rows with icons; role activation buttons; avatar upload via Supabase Storage (requires migration 003)
- **ProfileEditPage** — Edit full_name, username, city, skill level, bio, position + 6 skill sliders (pace/shooting/passing/dribbling/defending/physical)
- **UserProfilePage** (`/profile/:id`) — Other users' profile with friend button
- **PublicProfilePage** (`/u/:slug`) — Public profile by username slug with friend button
- **NotificationsPage** — Friend requests + match invitations with accept/reject + activity feed
- **VerificationPage** — Age verification document upload
- **AdminVenuesPage** — Create/manage venues and courts
- **AdminVerificationsPage** — Admin review of age verifications
- **FeedbackPage** — Survey form (dark gradient design, public)

### Email Templates (Supabase Auth)

Templates personalizados aplicados via Supabase Management API. Archivos fuente en `artifacts/pro-sport/email-templates/`.

| Template | Archivo | Asunto | Cuándo |
|----------|---------|--------|--------|
| Confirmación de registro | `confirmation.html` | Activá tu cuenta en PRO. ⚡ | Al crear cuenta |
| Recuperación de contraseña | `recovery.html` | Restablecé tu contraseña · PRO. | Al pedir reset |
| Cambio de email | `email-change.html` | Confirmá tu nuevo email · PRO. | Al cambiar email |
| Invitación de usuario | `invite.html` | ¡Te invitaron a PRO.! 🏆 | Al invitar usuario |

**Diseño:** Header oscuro (`#1C1535`), logo PRO. con punto violeta, franja degradada `#6B46C1 → #8B5CF6`, botón CTA con sombra, estilos inline (compatibilidad universal), en español. Variables Supabase usadas: `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`.

**Para re-aplicar:** `PATCH https://api.supabase.com/v1/projects/ewzpwldtaeaxtesimjau/config/auth` con `Authorization: Bearer <PAT>` y `User-Agent` header.

## Vercel Deployment

The project deploys via Vercel. The `vercel.json` at `artifacts/pro-sport/vercel.json` configures the build:

- **Build Command**: `cd ../.. && pnpm --filter @workspace/pro-sport run build`
- **Install Command**: `cd ../.. && pnpm install`
- **Output Directory**: `dist/public`
- **Framework**: vite

**Important — Vercel Dashboard Setting (must be set manually):**
In Vercel → Project → Settings → General → **Root Directory**, set it to:
```
artifacts/pro-sport
```
This was migrated from `apps/web` (old Next.js setup). If this setting is wrong, deploys will fail with "The specified Root Directory does not exist".

## Key Commands

- `pnpm --filter @workspace/pro-sport run dev` — run frontend dev server
- `pnpm --filter @workspace/api-server run dev` — run API server
- `pnpm --filter @workspace/pro-sport exec tsc --noEmit` — typecheck frontend

## Player Card Design System

`src/components/PlayerCard.tsx` — FIFA-style card with 4 level variants:
- **principiante**: amber/bronze gradient, `from-amber-600 via-orange-700 to-amber-950`
- **intermedio**: silver, `from-slate-300 via-slate-400 to-slate-600`
- **avanzado**: gold, `from-yellow-300 via-amber-400 to-yellow-700`
- **pro**: violet/elite, `from-violet-400 via-violet-700 to-purple-950`

OVR = avg of 6 skill stats. Aspect ratio 5/7. Avatar size-[120px]. Shimmer overlays + bottom vignette. Editable prop shows camera overlay on hover.

## Teams System (requires migration 003)

`src/lib/teams/api.ts` — createTeam, getMyTeams, getTeamById, joinTeam, leaveTeam with graceful degradation if table missing.  
Routes: `/equipos`, `/equipos/nuevo`, `/equipos/:id`.  
**Migration SQL**: `artifacts/pro-sport/supabase/migrations/003_teams_and_skills.sql` — run in Supabase Dashboard → SQL Editor.  
Creates: `teams`, `team_members` tables + RLS policies + skills columns on `profiles` + avatars storage bucket + policies.

## Next Steps (post-MVP)

- Run migration 003 in Supabase SQL Editor to enable avatar upload + teams
- Real-time notifications (Supabase Realtime subscriptions)
- Match rating system
- Venue booking / availability calendar
- Push notifications
