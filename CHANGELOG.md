# Changelog — PRO. Plataforma Deportiva

Todas las modificaciones notables de este proyecto están documentadas en este archivo.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).
Versionado siguiendo [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

> Próximos pasos: notificaciones en tiempo real (Supabase Realtime), avatar upload, rating de partidos, calendario de disponibilidad de canchas.

---

## [0.3.0] — 2026-05-03

### Agregado
- **Sistema de amigos completo**
  - Tabla `friendships` en Supabase (requester_id, addressee_id, status: pending/accepted/rejected/blocked) con RLS
  - Tabla `match_invitations` (match_id, inviter_id, invitee_id, status: pending/accepted/rejected) con RLS
  - API `src/lib/friends/api.ts`: searchUsers, getFriends, getPendingReceived/Sent, sendFriendRequest, accept/reject/removeFriend, sendMatchInvitations, getMyMatchInvitation, getMatchInvitations, respondToMatchInvitation
  - **FriendsPage** (`/amigos`): 3 tabs — Amigos, Solicitudes (recibidas + enviadas), Buscar usuarios
  - Botón de amistad contextual en `UserProfilePage` y `PublicProfilePage` (Add / Pendiente / Aceptar+Rechazar / Eliminar)
  - Step 3 en wizard de creación de partidos: selección de amigos a invitar antes de crear
  - Banner de invitación en `MatchDetailPage` para usuarios invitados (Aceptar / Rechazar)
  - Sección de invitaciones pendientes en `MatchDetailPage` visible solo al organizador
  - `NotificationsPage` reescrita: secciones de solicitudes de amistad + invitaciones a partidos con accept/reject inline
  - Navegación inferior actualizada: 🔔 Notif → 👥 Amigos en todas las páginas
  - Link "Amigos" en AppNav desktop
  - Tipos `Friendship`, `FriendshipStatus`, `MatchInvitation`, `MatchInvitationStatus` en `src/lib/types/db.ts`

- **Templates de correo con branding PRO.**
  - 4 templates HTML diseñados con identidad visual de PRO. (violeta `#6B46C1`, header oscuro `#1C1535`)
  - Aplicados via Supabase Management API en el proyecto `ewzpwldtaeaxtesimjau`
  - `confirmation.html` — "Activá tu cuenta en PRO. ⚡": bienvenida, franja de features, botón CTA
  - `recovery.html` — "Restablecé tu contraseña · PRO.": aviso de seguridad, expiración 1 hora
  - `email-change.html` — "Confirmá tu nuevo email · PRO.": muestra email anterior y nuevo
  - `invite.html` — "¡Te invitaron a PRO.! 🏆": showcase de funciones de la plataforma
  - Subjects en español para todos los tipos de correo de auth
  - Archivos fuente en `artifacts/pro-sport/email-templates/`

### Cambiado
- `NewMatchPage` reescrita como wizard de 3 pasos: Info → Lugar/Fecha → Invitar amigos
- `App.tsx`: ruta `/amigos` protegida agregada

---

## [0.2.0] — 2026-05-02

### Agregado
- **Gestión de canchas y reservas**
  - `AdminVenuesPage`: crear y administrar venues y courts deportivas
  - Filtrado de canchas disponibles por deporte seleccionado al crear partido
  - Flujo de reserva con aprobación del dueño de cancha requerida
  - Canchas deportivas de Manizales pre-cargadas en la base de datos

- **Torneos completos**
  - Reestructura de páginas de torneo con datos de prueba
  - `TournamentMatchesPage`, `TournamentStandingsPage`, `TournamentRegisterPage`, `TournamentRegistrationsPage`
  - Guard de creación de torneos: requiere rol `is_promoter`
  - Corrección de error al visualizar torneos propios

- **Autenticación y perfiles**
  - `AuthProvider` + `useAuth()` hook con `user`, `session`, `profile`, `roles`
  - Rutas protegidas con `ProtectedRoute` en toda la app
  - `ProfileEditPage`: edición de full_name, username, city, skill level, bio
  - Roles `is_player` / `is_promoter` sembrados via trigger DB al signup
  - Banner en `ProfilePage` para auto-upgrade a rol Promotor
  - Recuperación de contraseña (`/recuperar-contrasena`) — flujo completo con Supabase

- **Mejoras al formulario de partidos**
  - Wizard de 2 pasos para creación de partido
  - Separación de selección de fecha y hora
  - Corrección de error al crear partido

- **Infraestructura**
  - Configuración de Vercel: Root Directory → `artifacts/pro-sport`, build/install commands corregidos
  - PR #34 abierto en GitHub con branch MVP
  - Single Supabase client para evitar pérdida de sesión
  - Migración de llamadas directas a Supabase → `AuthContext`

### Corregido
- Error de sesión perdida al navegar entre páginas (cliente Supabase duplicado)
- Error al crear partido con usuario sin perfil completo
- Error al ver torneos propios
- Typecheck errors en componentes UI

---

## [0.1.0] — 2026-05-01

### Agregado
- **Base del proyecto**
  - Monorepo pnpm con workspaces TypeScript
  - Migración de Vercel/Next.js → Replit Vite + React (`artifacts/pro-sport`)
  - API auxiliar Express 5 (`artifacts/api-server`) en puerto 8080
  - Routing client-side con Wouter
  - Supabase PostgreSQL como base de datos + auth
  - Tailwind CSS + shadcn/ui
  - Componentes UI faltantes resueltos (`Button`, `Input`, `Card`, etc.)

- **Páginas iniciales**
  - `LandingPage`: countdown banner, hero, features, formulario de registro
  - `LoginPage` / `SignupPage`: auth email/password Supabase
  - `OnboardingPage`: configuración inicial de perfil post-registro
  - `FeedPage`: listado de partidos abiertos con bottom nav
  - Navegación consistente en todas las páginas autenticadas
  - Layout unificado aplicado a páginas de torneos y administración
  - `FeedbackPage`: formulario de encuesta (público, diseño dark)
  - `VerificationPage`: carga de documento de verificación de edad
  - `AdminVerificationsPage`: revisión de verificaciones de edad

---

## Trazabilidad de cambios

### Base de datos (Supabase — proyecto `ewzpwldtaeaxtesimjau`)

| Tabla | Agregada en | Descripción |
|-------|-------------|-------------|
| `profiles` | v0.1.0 | Perfil de usuario (username, full_name, city, skill_level, bio) |
| `user_roles` | v0.1.0 | Roles por usuario (is_player, is_promoter), trigger at signup |
| `matches` | v0.1.0 | Partidos deportivos |
| `match_participants` | v0.1.0 | Participantes de cada partido |
| `tournaments` | v0.1.0 | Torneos |
| `tournament_participants` | v0.1.0 | Equipos/jugadores inscritos |
| `tournament_matches` | v0.1.0 | Partidos de torneo |
| `venues` | v0.2.0 | Sedes / instalaciones deportivas |
| `courts` | v0.2.0 | Canchas dentro de una sede |
| `match_chat` | v0.2.0 | Chat inline de partido |
| `notifications` | v0.2.0 | Notificaciones de actividad |
| `friendships` | v0.3.0 | Relaciones de amistad entre usuarios |
| `match_invitations` | v0.3.0 | Invitaciones a partidos |

### Supabase Auth — Email templates

| Template | Modificado en | Asunto actual |
|----------|--------------|---------------|
| `confirmation` | v0.3.0 | Activá tu cuenta en PRO. ⚡ |
| `recovery` | v0.3.0 | Restablecé tu contraseña · PRO. |
| `email_change` | v0.3.0 | Confirmá tu nuevo email · PRO. |
| `invite` | v0.3.0 | ¡Te invitaron a PRO.! 🏆 |

### Rutas de la aplicación

| Ruta | Agregada en | Componente |
|------|-------------|------------|
| `/` | v0.1.0 | LandingPage |
| `/login`, `/registro` | v0.1.0 | LoginPage, SignupPage |
| `/onboarding` | v0.1.0 | OnboardingPage |
| `/feed` | v0.1.0 | FeedPage |
| `/feedback` | v0.1.0 | FeedbackPage |
| `/perfil` | v0.1.0 | ProfilePage |
| `/perfil/editar` | v0.2.0 | ProfileEditPage |
| `/notificaciones` | v0.2.0 | NotificationsPage |
| `/verificacion` | v0.2.0 | VerificationPage |
| `/matches/new` | v0.1.0 (reescrito v0.3.0) | NewMatchPage |
| `/matches/:id` | v0.1.0 (actualizado v0.3.0) | MatchDetailPage |
| `/u/:slug` | v0.2.0 | PublicProfilePage |
| `/profile/:id` | v0.2.0 | UserProfilePage |
| `/tournaments` | v0.2.0 | TournamentsPage |
| `/tournaments/new` | v0.2.0 | NewTournamentPage |
| `/tournaments/mine` | v0.2.0 | MyTournamentsPage |
| `/tournaments/:id` | v0.2.0 | TournamentDetailPage |
| `/admin/venues` | v0.2.0 | AdminVenuesPage |
| `/admin/verificaciones` | v0.2.0 | AdminVerificationsPage |
| `/amigos` | v0.3.0 | FriendsPage |
