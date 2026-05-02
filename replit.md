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
- `src/context/AuthContext.tsx` — `AuthProvider` + `useAuth()` hook. Single shared Supabase session across app.
- `src/components/ProtectedRoute.tsx` — Wraps authenticated routes; redirects to `/login` if no session.
- All protected routes in `App.tsx` use `<ProtectedRoute component={Page} />`.

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
| `/admin/venues` | AdminVenuesPage | Protected |
| `/admin/verificaciones` | AdminVerificationsPage | Protected |

### Pages summary
- **LandingPage** — Countdown banner, hero, features, registration form
- **LoginPage / SignupPage** — Supabase email/password auth; signup → onboarding redirect if session immediate
- **OnboardingPage** — Profile setup after signup (username, city, skill level)
- **FeedPage** — Open matches list with bottom nav
- **MatchDetailPage** — Join/leave match, participant list, confirmation, inline chat
- **NewMatchPage** — Create match form
- **TournamentsPage** — List all tournaments
- **TournamentDetailPage** — Tournament info, standings/matches links, register button
- **NewTournamentPage** — Create tournament form
- **TournamentMatchesPage / StandingsPage / RegisterPage / RegistrationsPage / NewMatchPage / MatchResultPage** — Full tournament flow
- **ProfilePage** — My profile: stats, edit button (→ `/perfil/editar`), quick actions
- **ProfileEditPage** — Edit full_name, username, city, skill level, bio
- **UserProfilePage** (`/profile/:id`) — Other users' profile
- **PublicProfilePage** (`/u/:slug`) — Public profile by username slug
- **NotificationsPage** — Notifications list with mark-all-read
- **VerificationPage** — Age verification document upload
- **AdminVenuesPage** — Create/manage venues and courts
- **AdminVerificationsPage** — Admin review of age verifications
- **FeedbackPage** — Survey form (dark gradient design, public)

## Key Commands

- `pnpm --filter @workspace/pro-sport run dev` — run frontend dev server
- `pnpm --filter @workspace/api-server run dev` — run API server
- `pnpm --filter @workspace/pro-sport exec tsc --noEmit` — typecheck frontend

## Next Steps (post-MVP)

- Avatar upload via Supabase Storage
- Real-time notifications (Supabase Realtime subscriptions)
- Match rating system
- Venue booking / availability calendar
- Push notifications
