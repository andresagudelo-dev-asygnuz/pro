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

## Next Steps (post-MVP)

- Avatar upload via Supabase Storage
- Real-time notifications (Supabase Realtime subscriptions)
- Match rating system
- Venue booking / availability calendar
- Push notifications
