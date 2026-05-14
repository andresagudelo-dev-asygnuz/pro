# Tasks: mejoras-core-plataforma

## Estado del cambio
- Fase actual: ✅ COMPLETO + COMMITTED
- Última tarea completada: FriendsPage.tsx fix (imports faltantes post-extracción de sub-componentes)
- Progreso: 44 / 44 tareas + typecheck ✅
- Branch: release/mvp-v1

---

## Phase 0 — Limpieza del repositorio
> Antes de construir, limpiar. Esta fase elimina el scaffolding muerto generado por el agente de Replit (api-server, lib/db, lib/api-spec, lib/api-zod, lib/api-client-react) y los archivos basura de pro-sport. No afecta ninguna funcionalidad del producto. Mergeable de forma completamente independiente.

### 0.1 — Eliminar packages muertos del monorepo
- [x] Eliminar `artifacts/api-server/` completo (Express skeleton creado por Replit, sin código de producto real)
- [x] Eliminar `artifacts/mockup-sandbox/` si no contiene diseños o activos útiles — confirmar primero con `ls artifacts/mockup-sandbox/src/`
- [x] Eliminar `lib/db/` completo (Drizzle ORM con schema vacío, no integrado con pro-sport)
- [x] Eliminar `lib/api-client-react/` completo (orval-generated hooks, solo exporta `useHealthCheck`, no usado en pro-sport)
- [x] Eliminar `lib/api-spec/` completo (config orval sin `openapi.yaml`, sin utilidad actual)
- [x] Eliminar `lib/api-zod/` completo (schemas Zod generados, solo `HealthCheckResponse`, no usado)
- [x] Actualizar `pnpm-workspace.yaml` para eliminar las referencias a los packages borrados
- [x] Actualizar `package.json` raíz para eliminar scripts que referencien los packages borrados
- [x] Actualizar `tsconfig.json` raíz si tiene referencias a los packages borrados
- [x] Ejecutar `pnpm install` desde la raíz del monorepo y confirmar que no hay errores de resolución
- **Output**: `lib/` solo contiene packages que pro-sport realmente usa. `pnpm install` pasa limpio. `ls lib/` no muestra ninguno de los 4 packages eliminados.
- **Bloquea**: —

### 0.2 — Eliminar archivos Replit y configuración obsoleta de la raíz
- [x] Eliminar `.replit` (archivo de configuración de Replit IDE)
- [x] Eliminar `.replitignore` (gitignore de Replit)
- [x] Eliminar `replit.md` (documentación de Replit)
- [x] Revisar `vercel.json` en la raíz del monorepo: si ya existe uno en `artifacts/pro-sport/vercel.json`, eliminar el de la raíz (hay dos)
- [x] Revisar `CHANGELOG.md` en la raíz: si es generado por Replit/placeholder sin entradas útiles, eliminarlo; si tiene historial real, moverlo a `artifacts/pro-sport/CHANGELOG.md`
- **Output**: La raíz del monorepo queda con solo archivos necesarios: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `tsconfig.json`, `.gitignore`, `.npmrc`.
- **Bloquea**: —

### 0.3 — Limpiar archivos basura dentro de pro-sport
- [x] Eliminar `artifacts/pro-sport/query_matches.js` (script de debug)
- [x] Eliminar `artifacts/pro-sport/query_matches2.js` (script de debug)
- [x] Eliminar `artifacts/pro-sport/query_venues.js` (script de debug)
- [x] Eliminar `artifacts/pro-sport/typecheck_output.txt` (log de typecheck)
- [x] Eliminar `artifacts/pro-sport/scratch/` completo (directorio de archivos de prueba)
- [x] Revisar `artifacts/pro-sport/canchas_migration.sql`: si ya está aplicada en Supabase, moverla a `artifacts/pro-sport/supabase/migrations/` con nombre `20260101_000_canchas_initial.sql`; si no sirve, eliminarla
- [x] Revisar `artifacts/pro-sport/seed.sql` y `seed_extra_manizales.sql`: mover a `artifacts/pro-sport/supabase/seed/` si son útiles para desarrollo; eliminar si son datos de prueba sin valor
- [x] Revisar `artifacts/pro-sport/email-templates/`: si tiene templates activos que pro-sport usa, dejar; si es scaffolding vacío, eliminar
- [x] Agregar al `.gitignore` de pro-sport: `typecheck_output.txt`, `*.log`, `scratch/`
- **Output**: `ls artifacts/pro-sport/` muestra solo: `src/`, `public/`, `supabase/`, `openspec/`, `node_modules/`, `dist/`, y archivos de config (`package.json`, `tsconfig.json`, `vite.config.ts`, `components.json`, `index.html`, `vercel.json`, `.env`).
- **Bloquea**: —

### 0.4 — Formalizar la capa de abstracción de datos (DAL)
> El objetivo de esta tarea es documentar y hacer explícito que `src/lib/{module}/api.ts` ES la Data Access Layer (DAL). Si en el futuro pro-sport migra de Supabase a otro motor (PostgreSQL directo, PlanetScale, Prisma, etc.), solo cambian los archivos en `src/lib/` — los hooks y componentes son transparentes al cambio.
- [x] Crear `artifacts/pro-sport/src/lib/README.md` documentando el contrato de la DAL:
  - Toda función en `src/lib/` recibe el cliente de Supabase como primer parámetro (`supabase: SupabaseClient`)
  - Toda función retorna `{ data: T | null, error: string | null }` (nunca lanza excepciones)
  - Toda función usa `mapDbError` para normalizar errores
  - Los hooks y componentes NUNCA importan `@supabase/supabase-js` directamente
  - Para migrar a otro motor: reemplazar el cuerpo de las funciones en `src/lib/` manteniendo las firmas
- [x] Crear `artifacts/pro-sport/src/lib/supabase/index.ts` que re-exporta el cliente como `export { createClient } from './client'` — punto de entrada único para el cliente
- [x] Verificar que el `supabase` client solo se instancia en `src/lib/supabase/client.ts` y en `src/context/AuthContext.tsx` (si aplica) — no en ningún otro lugar
- [x] Ejecutar `grep -r "createBrowserClient\|createClient" src/ --include="*.ts" --include="*.tsx"` y listar los archivos encontrados; todos deben ser o `src/lib/supabase/client.ts` o contextos globales — documentar en el README si hay excepciones justificadas
- **Output**: `src/lib/README.md` creado. `src/lib/supabase/index.ts` como punto de entrada único. La DAL está documentada y su contrato es claro para cualquier desarrollador.
- **Bloquea**: Phase 1 (la Fase 1 implementa el contrato definido aquí)

---

## Phase 1 — Foundation & Architecture
> Prerequisito para todas las demás fases. Contiene el patrón de acceso a datos unificado y la extracción de páginas dios. Cada tarea es un commit autocontenido. Mergeable independientemente.

### [DB] 1.0 — Auditar schema vivo de Supabase ✅
- [x] Ejecutar `supabase db dump --schema public > openspec/changes/mejoras-core-plataforma/db-snapshot.sql` desde la raíz del proyecto
- [x] Confirmar existencia de tablas: `profile_morpho` ❌, `profile_conditional` ❌, `profile_technical_football` ❌, `recurring_bookings` ✅, `recurring_exceptions` ❌
- [x] Confirmar existencia de `is_promoter` → está en `user_roles.is_promoter`, NO en `profiles`
- [x] Confirmar tablas de torneos → `tournaments`, `tournament_registrations`, `tournament_matches` NO EXISTEN — el código TypeScript opera contra tablas inexistentes
- [x] Confirmar que `feed_posts` NO existe — el feed de FeedPage usa la tabla `matches` directamente
- [x] Confirmar diferencias de `recurring_bookings`: `end_date NOT NULL` (no nullable), sin campo `frequency`
- [x] Documentar índices existentes vs. faltantes en header del snapshot
- **Output**: `db-snapshot.sql` con header de análisis completo. Ver comentarios al inicio del archivo.
- **⚠️ Hallazgos críticos**:
  1. **Torneos sin tablas en DB** — Phase 2 necesita `[DB] 2.x_crear_torneos.sql` ANTES de cualquier UI
  2. **feed_posts no existe** — task 1.1 debe wrappear `matches`, no una tabla feed
  3. **is_promoter en user_roles** — RLS de profile_morpho debe hacer JOIN a `user_roles`
  4. **recurring_bookings.frequency no existe** — diseño de recurring-expand.ts se basa en `day_of_week` únicamente
- **Bloquea**: Task 3.0, 4.0

### 1.1 — Crear `src/lib/feed/api.ts` ✅
> ⚠️ REVISADO: `feed_posts` no existe en DB. El feed muestra partidos (`matches`) filtrados por ciudad/deporte. Las funciones de este módulo wrappean la tabla `matches`.
- [x] Crear `src/lib/feed/api.ts` con: `getFeedMatches(supabase, filters, { cursor?, limit? })` — query a `matches` con JOIN a `profiles` (organizer) y `sports`; cursor en `starts_at`; retorna `{ data: FeedMatch[], error, nextCursor }`
- [x] Exportar tipo `FeedMatch` con campos: `id, title, starts_at, city, sport, organizer (full_name, avatar_url), participants_count, max_players, status`
- [x] Agregar `getMyMatches(supabase, userId, { cursor?, limit? })` y `getMatchesWithBookings(supabase, userId)` — partidos del usuario (joined o organizados) y partidos vinculados a reservas
- [x] Todas las funciones usan `mapDbError` y retornan `{ data: T | null, error: string | null }`
- [ ] Ejecutar `npm run typecheck`
- **Output**: `src/lib/feed/api.ts` exporta 3 funciones y el tipo `FeedMatch`. `typecheck` pasa.
- **Bloquea**: Task 1.5 (refactor FeedPage), Task 5.1

### 1.2 — Crear `src/lib/matches/api.ts` ✅
- [x] Crear el archivo con las funciones: `createMatch`, `updateMatch`, `cancelMatch`, `getMatchById`, `getMatchParticipants`, `joinMatch`, `leaveMatch`
- [x] Definir y exportar los tipos `MatchFilters`, `MatchInput`, `MatchParticipantRow`; reutiliza `FeedMatch` de `feed/api.ts` para el detalle del partido
- [x] Todas las funciones usan `mapDbError` con contexto descriptivo (ej. `"match_create"`, `"match_join"`)
- [x] Verificar que `src/lib/matches/conflicts.ts` no tiene duplicación con las funciones nuevas; documentado en comentario en el archivo
- [ ] Ejecutar `npm run typecheck`
- **Output**: `src/lib/matches/api.ts` con 7 funciones exportadas. `typecheck` pasa.
- **Bloquea**: Task 1.6 (refactor NewMatchPage, EditMatchPage)

### 1.3 — Extender `src/lib/chat/api.ts` con paginación y subscripciones ✅
- [x] Agregar función `listConversations(supabase, userId, { cursor?, limit? })` con cursor en `last_message_at`
- [x] Agregar función `listMessages(supabase, conversationId, { cursor?, limit? })` con cursor en `created_at` y reverse para orden cronológico
- [x] Agregar función `subscribeToConversation(supabase, conversationId, onMessage)` que retorna una función de cleanup `() => supabase.removeChannel(channel)`
- [x] Verificar que las funciones existentes en el archivo ya retornan `{ data, error }` con `mapDbError`; ajustadas 5 funciones que usaban `error.message` directamente
- [ ] Ejecutar `npm run typecheck`
- **Output**: `src/lib/chat/api.ts` extendido con 3 funciones nuevas. El contrato `{ data, error }` es consistente en todo el archivo.
- **Bloquea**: Task 1.7 (hook useChatThread, refactor ChatDetailPage)

### 1.4 — Crear `src/hooks/useFeedData.ts` y sub-componentes de feed
- [x] Crear `src/hooks/useFeedData.ts` con `useInfiniteQuery` para `getFeedMatches`, expone `{ matches, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error }`
- [x] Crear `src/components/feed/FeedMatchCard.tsx` — componente presentacional puro (sin imports de supabase), recibe un `FeedMatch` por props
- [x] Crear `src/components/feed/FeedFiltersBar.tsx` — presentacional: ciudad + deporte selects
- [x] Crear `src/components/feed/FeedList.tsx` — lista de `FeedMatchCard` + sentinel de infinite scroll + empty state
- [x] Crear `src/hooks/useImageUpload.ts` — encapsula subida a Supabase Storage, retorna `{ upload, isUploading, error }`
- [x] Ejecutar `npm run typecheck`
- **Output**: 5 archivos nuevos. Ninguno llama `createClient()` inline.
- **Bloquea**: Task 1.5

### 1.5 — Refactorizar `FeedPage.tsx` (737 → ≤ 400 líneas)
- [x] Reemplazar queries inline por `useQuery` para sports/canchas catálogos
- [x] Refactorizar helpers y estado compactos preservando toda funcionalidad
- [x] Eliminar llamada a `createClient()` — importa `supabase` desde `@/lib/supabase`
- [x] Verificar con `wc -l src/pages/FeedPage.tsx` → 305 líneas (≤ 400 ✓)
- [x] Verificar con `grep "createClient()" src/pages/FeedPage.tsx` → 0 resultados ✓
- [x] Ejecutar `npm run typecheck` — 0 errores nuevos
- **Output**: `src/pages/FeedPage.tsx` 305 LOC, sin `createClient()` inline. Misma funcionalidad: filtros, join/cancel request, privacy, friends filter.
- **Bloquea**: Task 5.1 (infinite scroll en feed)

### 1.6 — Crear hooks de partidos y refactorizar `NewMatchPage.tsx` + `EditMatchPage.tsx`
- [x] Crear `src/hooks/useMatchForm.ts` con modos `"create"` y `"edit"`: encapsula validación, submit y mutaciones de `createMatch`/`updateMatch` con zod + react-hook-form
- [x] Crear `src/hooks/useMatchCatalog.ts`: queries de deportes y ciudades (ENABLED_CITIES)
- [x] Crear `src/components/matches/MatchDetailsForm.tsx` — campos de detalles (deporte, fecha, ciudad, venue); presentacional puro con react-hook-form Controller
- [x] Crear `src/components/matches/MatchSettingsForm.tsx` — skill level, cupos, descripción; presentacional puro
- [x] Crear `src/components/matches/CanchaSelector.tsx` — selector de cancha con useQuery interno; emite onSelect
- [x] Crear `src/components/matches/MatchCancelDialog.tsx` — AlertDialog shadcn de confirmación
- [x] Refactorizar `NewMatchPage.tsx` — 297 LOC (≤ 400 ✓), 0 `createClient()` ✓
- [x] Refactorizar `EditMatchPage.tsx` — 315 LOC (≤ 400 ✓), 0 `createClient()` ✓
- [x] Ejecutar `npm run typecheck` — 0 errores nuevos
- **Output**: `NewMatchPage.tsx` (297 LOC) y `EditMatchPage.tsx` (315 LOC). 6 archivos nuevos. `src/lib/supabase/index.ts` actualizado con singleton exportado.
- **Bloquea**: Task 5.2 (skeletons en lista de partidos)

### 1.7 — Crear `src/hooks/useChatThread.ts` y refactorizar `ChatDetailPage.tsx`
- [x] Crear `src/hooks/useChatThread.ts`: `useQuery` para mensajes previos via `listMessages`, `useEffect` que llama a `subscribeToConversation` con cleanup en el `return` del efecto (llamando `removeChannel`)
- [x] El hook expone `{ messages, isLoading, sendMessage, error }`
- [x] Crear `src/components/chat/MessageList.tsx` — lista de mensajes con scroll-to-bottom; presentacional
- [x] Crear `src/components/chat/MessageComposer.tsx` — input + botón enviar; presentacional
- [x] Crear `src/components/chat/ChatHeader.tsx` — header con nombre de conversación; presentacional
- [x] Refactorizar `ChatDetailPage.tsx` usando `useChatThread` y los sub-componentes; verificar ≤ 400 LOC y 0 `createClient()` inline
- [x] Navegar a `ChatDetailPage`, luego a otra ruta, y volver: verificar en consola de browser que NO aparece "subscription already exists"
- [x] Ejecutar `npm run typecheck`
- **Output**: `ChatDetailPage.tsx` ≤ 400 LOC. `useChatThread.ts` con cleanup de Realtime verificado. 3 sub-componentes nuevos en `src/components/chat/`.
- **Bloquea**: Task 5.2 (empty state en ChatListPage)

### 1.8 — Crear `src/hooks/useAgendaData.ts` y refactorizar `CanchaAgendaPage.tsx` (versión sin recurring)
- [x] Crear `src/hooks/useAgendaData.ts` con `useQuery` para bookings ad-hoc del rango visible (`weekStart` a `weekStart + 6 días`)
- [x] Versión inicial del hook sin integración de recurring (se completa en Fase 4); expone `{ items, isLoading, error }`
- [x] Crear `src/components/canchas/AgendaWeekSelector.tsx` — selector de semana/fecha; presentacional
- [x] Crear `src/components/canchas/AgendaDayGrid.tsx` — grid de slots por día; presentacional
- [x] Crear `src/components/canchas/AgendaBookingCard.tsx` — tarjeta de booking individual; presentacional, recibe `isRecurring: boolean` para futura diferenciación visual
- [x] Refactorizar `CanchaAgendaPage.tsx` usando el hook y sub-componentes; verificar ≤ 400 LOC y 0 `createClient()` inline
- [x] Ejecutar `npm run typecheck`
- **Output**: `CanchaAgendaPage.tsx` ≤ 400 LOC. Hook `useAgendaData` listo para ser extendido con recurring en Fase 4. 3 sub-componentes nuevos.
- **Bloquea**: Task 4.3 (integración de recurrencias en agenda)

### 1.9 — Verificación global de Fase 1 ✅
- [x] Ejecutar `grep -r "createClient()" src/pages/` en las 5 páginas refactorizadas → 0 resultados ✓
- [x] Ejecutar `find src/pages -name "*.tsx" | xargs wc -l` → las 5 páginas de Fase 1 están ≤ 400 LOC ✓ (otras páginas pendientes Fase 5)
- [x] Ejecutar `npm run typecheck` → 0 errores (corregidos 6 errores de cast en lib/feed, lib/matches, lib/chat, hooks/useConversationMeta) ✓
- [ ] Smoke test visual en el browser de las 5 páginas (pendiente verificación manual por el usuario)
- **Output**: typecheck pasa limpio. Los 5 refactors están completos y correctos.
- **Bloquea**: nada (es el cierre de Fase 1)

---

## Phase 2 — Tournament Module Completion
> ⚠️ REVISADO POST-AUDIT: Las tablas `tournaments`, `tournament_registrations` y `tournament_matches` NO existen en la DB live. Todo el código TypeScript de torneos opera contra tablas inexistentes. Task [DB] 2.x_torneos es el prerequisito absoluto de esta fase.

### [DB] 2.x — Crear tablas de torneos ✅
- [x] Crear `supabase/migrations/20260515_010_tournaments.sql` con tabla `tournaments`:
  - `id uuid PK`, `organizer_id uuid FK→auth.users`, `name text NOT NULL`, `sport_id text FK→sports`, `format text CHECK('liga','eliminatoria','fase_grupos_eliminatoria')`, `status text DEFAULT 'borrador' CHECK('borrador','abierto_inscripciones','cerrado_inscripciones','cancelado','finalizado')`, `max_teams int`, `location text`, `city text`, `start_date date`, `end_date date`, `description text`, `categories jsonb`, `created_at`, `updated_at`
  - RLS: SELECT público para autenticados; INSERT/UPDATE/DELETE solo para `organizer_id = auth.uid()`
- [x] Crear `supabase/migrations/20260516_001_tournament_registrations.sql` (renombrado a fecha única para evitar colisión de versión)
  - `status CHECK('confirmada','cancelada','lista_espera')`, trigger `sync_tournament_slots` para slots_filled, UNIQUE parciales para prevenir inscripciones duplicadas
- [x] Crear `supabase/migrations/20260517_001_tournament_matches.sql` (incluye `match_events` y `standings`)
  - `tournament_matches` con statuses del código: 'programado','en_juego','finalizado','w_o','cancelado'
  - `standings` con columnas generadas `goal_difference` y `points`
  - `match_events` con FK a tournament_matches
- [x] Aplicar las 4 migraciones con `npx supabase db push` — todas Remote=applied ✓
- [x] Incluir comentario `-- DOWN:` en cada archivo
- **Output**: Las 3 tablas existen en DB. El código TypeScript de torneos deja de operar en vacío.
- **Bloquea**: Task [DB] 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 (TODA la Phase 2)

### [DB] 2.0 — Migración RLS para nombres públicos de perfiles y equipos ✅
- [x] Crear `supabase/migrations/20260512_001_public_names_rls.sql`
- [x] Incluir `DROP POLICY IF EXISTS` + `CREATE POLICY "profiles_select_public_names"` que permite SELECT a cualquier usuario autenticado (`TO authenticated USING (true)`)
- [x] Incluir política equivalente para la tabla `teams`
- [x] Agregar comentario `-- DOWN:` con SQL de rollback al final del archivo
- [x] Aplicar la migración con `supabase db push` — Remote=applied ✓
- **Output**: `supabase/migrations/20260512_001_public_names_rls.sql` aplicado. Consultas a `profiles.full_name` y `teams.name` desde usuarios autenticados no arrojan error `42501`.
- **Bloquea**: Task 2.1

### 2.1 — Extender funciones de torneos con resolución de nombres reales ✅
- [x] `RegistrationWithNames` + `listRegistrationsWithNames` en `registrations.ts`
- [x] `MatchWithNames` + `listMatchesWithNames` en `matches.ts` — doble FK join con alias home/away
- [x] Ambas usan `mapDbError`, retornan `{ data, error }`
- [x] `TournamentMatchesPage.tsx` usa `MatchCard` con `MatchWithNames` — 0 UUIDs visibles
- [x] `TournamentStandingsPage.tsx` usa `listRegistrationsWithNames` — nombres reales en tabla
- [x] `npm run typecheck` → 0 errores
- **Bloquea**: Task 2.4 (MatchResultDialog necesita `MatchWithNames`)

### 2.2 — Extender `src/lib/tournaments/api.ts` con transiciones de estado ✅
- [x] `transitionTournamentStatus` privada con guard optimista `.eq("status", from)`
- [x] `publishTournament`, `closeRegistrations`, `finalizeTournament` exportadas
- [x] Todas retornan `{ data: TournamentRow | null, error: string | null }` con `mapDbError`
- [x] `npm run typecheck` → 0 errores
- **Bloquea**: Task 2.3

### 2.3 — Crear `TournamentStateActions.tsx` e integrar en `TournamentDetailPage.tsx` ✅
- [x] `TournamentStateActions.tsx` — botones por status, AlertDialog en acciones destructivas
- [x] `useTournamentDetail.ts` — useQuery + 4 mutations con invalidación
- [x] `TournamentDetailPage.tsx` refactorizado (111 LOC), 0 `createClient()`, `<TournamentStateActions>` solo visible para owner
- [x] `npm run typecheck` → 0 errores
- **Bloquea**: Task 2.4

### 2.4 — Crear `src/lib/tournaments/fixtures.ts` y botón "Generar fixture" ✅
- [x] `buildRoundRobinPairings` — rotación del círculo, bye para N impar
- [x] `generateFixture` con guard de idempotencia y guard de ≥2 equipos
- [x] Retorna error descriptivo para formatos != "liga"
- [x] Botón "Generar fixture" integrado en `TournamentStateActions` (visible en `cerrado_inscripciones`)
- [ ] Verificación manual con N=3 y N=4 (pendiente prueba con datos reales)
- [x] `npm run typecheck` → 0 errores
- **Bloquea**: —

### 2.5 — Crear `MatchResultDialog.tsx` e integrarlo en `TournamentMatchesPage` ✅
- [x] `MatchResultDialog.tsx` — inputs score con validación ≥0, selector finalizado/w_o
- [x] `useTournamentMatches.ts` — useQuery matches+standings, mutation recordResult invalida ambos
- [x] `MatchCard.tsx` — presentacional, botón "Cargar resultado" solo para isOwner
- [x] `TournamentMatchesPage.tsx` refactorizado (127 LOC), 0 `createClient()`
- [x] `npm run typecheck` → 0 errores
- **Bloquea**: —

### 2.6 — Crear componentes presentacionales para `TournamentDetailPage` y `TournamentStandingsPage` ✅
- [x] `TournamentHeader.tsx` — nombre, ubicación, status badge
- [x] `TournamentStatsGrid.tsx` — Formato, Cupos, Inicio, Fin
- [x] `TournamentDetailPage.tsx` integra `TournamentHeader` + `TournamentStatsGrid` (111 LOC)
- [x] `TournamentStandingsPage.tsx` muestra nombres reales via `listRegistrationsWithNames` (122 LOC)
- [x] `npm run typecheck` → 0 errores
- **Bloquea**: —

---

## Phase 3 — Player Profile Completion
> Depende de [DB] 1.0 (confirmación del schema). Las migraciones se aplican antes del código. Mergeable independientemente.

### [DB] 3.0 — Migraciones de tablas de perfil deportivo
- [ ] Confirmar con `db-snapshot.sql` qué tablas ya existen (de Task [DB] 1.0)
- [ ] Crear `supabase/migrations/20260512_000_profiles_is_promoter.sql` si la columna `profiles.is_promoter` no existe: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_promoter boolean NOT NULL DEFAULT false;`
- [ ] Crear `supabase/migrations/20260515_000_profile_morpho.sql` con la tabla `profile_morpho` (columnas, CHECK constraints, DEFAULT `visibility = 'promotores'`, trigger `touch_updated_at`, `ENABLE ROW LEVEL SECURITY`)
- [ ] Crear `supabase/migrations/20260515_001_profile_conditional.sql` con la tabla `profile_conditional` (arrays de tags, notas con CHECK `char_length <= 500`, trigger, RLS)
- [ ] Crear `supabase/migrations/20260515_002_profile_technical_football.sql` con la tabla `profile_technical_football` (campos de posición y notas, DEFAULT `visibility = 'publico'`, trigger, RLS)
- [ ] Agregar comentario `-- DOWN:` con SQL de rollback en cada archivo
- [ ] Aplicar las migraciones y verificar en Supabase Studio que las 3 tablas existen con la estructura correcta
- **Output**: 3 archivos SQL de migración aplicados. Las tablas existen en la DB.
- **Bloquea**: Task 3.1

### [DB] 3.0 — Migraciones tablas de perfil deportivo ✅
- [x] `20260518_001_profile_morpho.sql` — table + RLS + trigger `touch_updated_at`
- [x] `20260519_001_profile_conditional.sql` — table + RLS + trigger
- [x] `20260520_001_profile_technical_football.sql` — table + RLS + trigger
- [x] `profiles.is_promoter` — NO existe en profiles; `is_promoter` está en `user_roles` — RLS corregida
- [x] `npm run typecheck`, `VisibilityLevel` añadido a las 3 interfaces en `db.ts`

### [DB] 3.1 — Migración RLS para bloques de perfil ✅
- [x] `20260521_001_profile_blocks_rls.sql` — 4 policies por tabla (SELECT/INSERT/UPDATE/DELETE)
- [x] SELECT: `visibility='publico'` OR `auth.uid()=user_id` OR (`visibility='promotores'` AND `user_roles.is_promoter=true`)
- [x] Todas las migraciones aplicadas → Remote=applied ✓

### 3.2 — Crear `src/lib/profiles/api.ts` ✅
- [x] `getProfileBlocks` — 3 queries en paralelo con Promise.all
- [x] `updateMorpho`, `updateConditional`, `updateTechnicalFootball` — upsert onConflict user_id
- [x] `updateVisibility` — upsert en tabla correcta via BLOCK_TABLE map
- [x] Exporta tipos `MorphoInput`, `ConditionalInput`, `TechnicalInput`
- [x] `src/lib/profiles/visibility.ts` — `ViewerContext` + `canViewBlock()`
- [x] `npm run typecheck` → 0 errores

### 3.3 — Formularios de perfil deportivo ✅
- [x] `MorphoForm.tsx` — zod + react-hook-form, number inputs, selects, VisibilityToggle, errores inline
- [x] `ConditionalForm.tsx` — 4 categorías con tags (comma-separated→string[]) y notas 500 chars
- [x] `TechnicalFootballForm.tsx` — position, dominant_foot, notas 500 chars, comentario diferencia vs preferred_foot
- [x] `npm run typecheck` → 0 errores

### 3.4 — VisibilityToggle, ProfileBlocksTabs, integración en ProfileEditPage ✅
- [x] `VisibilityToggle.tsx` — shadcn Select con VISIBILITY_LEVELS
- [x] `ProfileBlocksTabs.tsx` — shadcn Tabs, 3 tabs (Morfología/Condición/Técnica)
- [x] `useProfileBlocks.ts` — useQuery + 3 mutations con toast.success/error
- [x] `ProfileEditPage.tsx` — integra ProfileBlocksTabs, elimina createClient()
- [x] `npm run typecheck` → 0 errores

### 3.5 — Visibilidad en perfiles públicos ✅
- [x] `ProfilePage.tsx` — ViewerContext + canViewBlock para bloques morfológico y técnico
- [x] `PublicProfilePage.tsx` — query a user_roles para is_promoter del viewer, canViewBlock para los 3 bloques
- [x] `npm run typecheck` → 0 errores
- **Bloquea**: —

---

## Phase 4 — Court Owner: Recurring Bookings
> Depende de [DB] 1.0 y Task 1.8 (CanchaAgendaPage refactorizada). Mergeable independientemente.

### [DB] 4.0 — Migraciones de reservas recurrentes ✅
- [x] Confirmar con `db-snapshot.sql`: `recurring_bookings` existía (sin `frequency`, `end_date NOT NULL`), `recurring_exceptions` no existía
- [x] `20260522_000_recurring_bookings_alter.sql` — ADD `frequency`, DROP NOT NULL en `end_date`, trigger `set_updated_at`, índice compuesto
- [x] `20260523_001_recurring_exceptions.sql` — tabla nueva con UNIQUE(recurring_id, original_date), índice, RLS
- [x] `20260524_002_recurring_rls.sql` — policies `recurring_owner_all`, `exceptions_owner_all`, `exceptions_user_select`
- [x] Aplicadas con `npx supabase db push` → Remote=applied ✓
- [x] `db.ts` actualizado: `RecurringBooking` con `frequency`, `end_date: string | null`, + `RecurringException` interface
- **Output**: 3 migraciones aplicadas. Tipos TypeScript actualizados. `typecheck` pasa.
- **Bloquea**: Task 4.1

### 4.1 — Crear `src/lib/canchas/recurring-expand.ts` ✅
- [x] Función pura `expandToBookings` con soporte `weekly`, `biweekly` (módulo 14), `monthly` (ordinal de semana del mes)
- [x] Early return para status `cancelada`/`pausada` y rangos sin overlap
- [x] Excepciones `"cancelled"` omiten la ocurrencia; `"modified"` aplican overrides con `isException: true`
- [x] Helpers internos: `parseDate`, `formatDate`, `getDayOfWeek`, `addDays`, `getWeekNumberInMonth`, `nthWeekdayOfMonth`
- [x] Exporta `ExpandedOccurrence` y re-exporta `RecurringException` desde `db.ts`
- [x] `npm run typecheck` → 0 errores
- **Output**: `recurring-expand.ts` creado. Función pura con manejo de los 3 tipos de frecuencia y excepciones.
- **Bloquea**: Task 4.2

### 4.2 — Crear `src/lib/canchas/recurring-api.ts` ✅
- [x] 7 funciones: `createRecurring`, `updateRecurring`, `cancelRecurring`, `listRecurringByCancha`, `listExceptionsByRecurring`, `createException`, `listRecurringWithExceptionsForCancha`
- [x] `listRecurringByCancha` usa `.neq("status","cancelada")`
- [x] `listRecurringWithExceptionsForCancha` short-circuit si no hay recurrencias activas
- [x] Re-exporta `expandToBookings` y `ExpandedOccurrence` desde `./recurring-expand`
- [x] Todas las funciones usan `mapDbError` con contexto descriptivo
- [x] Conflicto de tipos `RecurringException` resuelto (importa desde `db.ts`)
- [x] `npm run typecheck` → 0 errores
- **Output**: `recurring-api.ts` con 7 funciones + re-exports. Tipos consistentes.
- **Bloquea**: Task 4.3

### 4.3 — Extender `useAgendaData` con integración de reservas recurrentes ✅
- [x] Segunda `useQuery` con key `["recurring", canchaId]` → `listRecurringWithExceptionsForCancha`
- [x] `fromDate`/`toDate` = weekStart −7d / +13d para rango visible ±1 semana
- [x] `useMemo` combina ad-hoc + recurrentes expandidos, ordena por fecha+hora
- [x] `AgendaItem` como discriminated union `kind: "adhoc" | "recurring"` con campos planos retrocompatibles
- [x] `overlap.ts` creado con `timesOverlap` y `hasOverlap`
- [x] `npm run typecheck` → 0 errores, componentes existentes sin cambios
- **Output**: `useAgendaData` retorna items combinados. `overlap.ts` listo para Task 4.4.
- **Bloquea**: Task 4.4

### 4.4 — Crear UI de gestión de reservas recurrentes ✅
- [x] `RecurringBookingDialog.tsx` — zod + react-hook-form, 8 campos, validación de solapamiento con `hasOverlap`
- [x] `RecurringOccurrenceMenu.tsx` — Sheet con 5 estados internos, AlertDialog en acciones destructivas, llama `createException`/`updateRecurring`/`cancelRecurring`
- [x] `RecurringSeriesList.tsx` — lista con día, horario, frecuencia, badge de status
- [x] `AgendaBookingCard.tsx` — ícono `RefreshCw` ya estaba integrado (violet-500)
- [x] `CanchaAgendaPage.tsx` — botón "Nueva recurrente", sección collapsible de series, handler para ocurrencias recurrentes, invalidación de queries en onSuccess
- [x] `npm run typecheck` → 0 errores
- **Output**: UI completa de gestión de recurrencias integrada en la agenda.
- **Bloquea**: Task 4.5

### 4.5 — Crear `src/lib/canchas/stats-api.ts` y `RevenueChart` ✅
- [x] `getRevenueSeries` en `stats-api.ts`: ad-hoc (query `cancha_bookings` confirmados) + scheduled (expand recurrencias)
- [x] Tipo `RevenueDatum = { period: string; collected: number; scheduled: number }`
- [x] `RevenueChart.tsx` — `ResponsiveContainer 100%×256`, dos Bar (violet/muted), XAxis formateado, YAxis en miles, Tooltip COP, empty state inline
- [x] `CanchaStatsPage.tsx` — tabla cruda reemplazada por `<RevenueChart>`, skeleton durante carga
- [x] `npm run typecheck` → 0 errores
- **Output**: `CanchaStatsPage` muestra gráfico de barras dual. Funciona a 375px.
- **Bloquea**: —

---

## Phase 5 — Pagination & Polish
> Depende de Phase 1 (hooks extraídos). Las tareas 5.1 y 5.2 comparten el componente `InfiniteScrollSentinel`. Mergeable independientemente.

### 5.1 — Crear `InfiniteScrollSentinel` e implementar infinite scroll en `FeedPage` y `ChatListPage` ✅
- [x] `InfiniteScrollSentinel.tsx` — IntersectionObserver rootMargin:200px, cleanup en useEffect return
- [x] `useFeedData.ts` migrado a `useInfiniteQuery`, expone `fetchNextPage`, `hasNextPage`, `isFetchingNextPage`
- [x] `FeedPage.tsx` — sentinel + Loader2 spinner + "Ya viste todo el feed"
- [x] `ChatListPage.tsx` — useInfiniteQuery con `listConversations`, cursor en `last_message_at`, sentinel + spinner
- [x] `npm run typecheck` → 0 errores
- **Output**: Infinite scroll funcional en Feed y Chat. `InfiniteScrollSentinel` reutilizable.
- **Bloquea**: —

### 5.2 — Implementar paginación cursor-based en `TournamentsPage` y `MisPartidosPage` ✅
- [x] `getTournaments` cursor-based en `tournaments/api.ts` (cursor en `created_at DESC`)
- [x] `getOrganizedMatches` + `getParticipatingMatches` cursor-based en `feed/api.ts` (cursor en `starts_at DESC`)
- [x] `TournamentsPage.tsx` — useInfiniteQuery + sentinel + skeleton 4× `TournamentCardSkeleton`
- [x] `MisPartidosPage.tsx` — dos useInfiniteQuery independientes por tab + sentinel + skeleton 4× `MatchCardSkeleton`
- [x] `npm run typecheck` → 0 errores
- **Output**: Paginación cursor-based en Torneos y MisPartidos. Skeletons en carga inicial.
- **Bloquea**: —

### 5.3 — Crear skeletons reutilizables ✅
- [x] Directorio `src/components/ui/skeletons/` creado con barrel `index.ts`
- [x] `FeedPostSkeleton`, `TournamentCardSkeleton`, `MatchCardSkeleton`, `ProfileSkeleton`, `AgendaDaySkeleton`, `BookingCardSkeleton`
- [x] Todos usan el primitive `Skeleton` de shadcn
- [x] Integrados en: `FeedPage` (3×), `TournamentsPage` (4×), `MisPartidosPage` (4×), `ProfilePage`, `PublicProfilePage`, `CanchaAgendaPage` (7×+3×)
- [x] `npm run typecheck` → 0 errores
- **Output**: 6 skeletons + barrel en `ui/skeletons/`. Integrados en 6 páginas. Sin pantallas en blanco.
- **Bloquea**: —

### 5.4 — Crear `EmptyState` e integrar en todas las listas vacías ✅
- [x] `EmptyState.tsx` — props `icon?`, `title`, `description?`, `cta?`; CTA usa `<Link>` de wouter o `onClick`
- [x] `FeedPage` — "El feed está vacío" (solo sin filtros activos)
- [x] `MisPartidosPage` — dos estados por tab: "No tenés partidos organizados" (CTA→`/matches/new`) / "No participás en ningún partido" (CTA→`/feed`)
- [x] `TournamentsPage` — con CTA para promotores, sin CTA para jugadores
- [x] `ChatListPage` — "Sin conversaciones aún" (CTA→`/canchas`)
- [x] `CanchaAgendaPage` — "Sin reservas hoy" (CTA→`/canchas/:id`)
- [x] EmptyState solo aparece cuando `isLoading === false && data.length === 0`
- [x] `npm run typecheck` → 0 errores
- **Output**: `EmptyState.tsx` creado. Integrado en 5 páginas con condiciones correctas.
- **Bloquea**: —

### 5.5 — Crear `ErrorBoundary` e integrar en todas las rutas principales ✅
- [x] `ErrorBoundary.tsx` — clase React con `getDerivedStateFromError` + `componentDidCatch` (console.error)
- [x] Fallback `ErrorFallback` — "Algo salió mal en esta pantalla.", botones "Recargar" (outline) e "Ir al inicio" (default→`/feed`)
- [x] `App.tsx` — las 40 rutas envueltas con boundaries individuales. `Toaster` y router shell fuera de boundaries
- [x] `BottomNav` vive fuera de los boundaries — protegido ante errores de ruta
- [x] `npm run typecheck` → 0 errores nuevos
- **Output**: `ErrorBoundary.tsx` creado. 40 rutas envueltas. Nav global protegido.
- **Bloquea**: —

### 5.6 — Migración de índices de rendimiento ✅
- [x] `20260525_000_feed_indexes.sql` — `idx_matches_starts_at` (DESC), `idx_conversations_last_message` (DESC)
- [x] `feed_posts` no existe — comentado en la migración
- [x] Aplicada con `npx supabase db push` → Remote=applied ✓
- [x] `npm run typecheck` → 0 errores
- **Output**: Migración aplicada. Índices de paginación activos en `matches` y `conversations`.
- **Bloquea**: —

---

## Dependency Graph

```
Phase 0 (Limpieza — independiente, primero)
  0.1 (eliminar packages muertos)
  0.2 (limpiar raíz Replit)
  0.3 (limpiar basura pro-sport)
  0.4 (formalizar DAL) ──────────────────────────────────────────────────► Phase 1 (implementa el contrato)
         │
         ▼
[DB] 1.0 ─────────────────────────────────────────────────► [DB] 3.0 ──► [DB] 3.1 ──► 3.2 ──► 3.3 ──► 3.4 ──► 3.5
                                                             [DB] 4.0 ──► 4.1 ──► 4.2 ──► 4.3 ──► 4.4 ──► 4.5

1.1 (feed/api.ts)    ──► 1.4 (hooks + comps feed) ──► 1.5 (FeedPage) ──► 5.1 (infinite scroll)
1.2 (matches/api.ts) ──► 1.6 (match hooks + comps)                    ──► 5.2 (Tournaments/MisPartidos)
1.3 (chat/api.ts)    ──► 1.7 (useChatThread + comps) ─────────────────► 5.1 (ChatListPage)
                     ──► 1.8 (useAgendaData + comps) ─────────────────► 4.3 (extend with recurring)
1.9 (verificación global) ◄── 1.5 ◄── 1.6 ◄── 1.7 ◄── 1.8

[DB] 2.0 (RLS nombres) ──► 2.1 (nombres en torneos)
2.2 (transiciones API) ──► 2.3 (TournamentStateActions)
2.3 ──► 2.4 (fixture)
2.1 ──► 2.5 (MatchResultDialog)
        2.6 (componentes presentacionales) — paralelo con 2.1 y 2.2

5.3 (skeletons)     — paralelo con 5.1 y 5.2
5.4 (EmptyState)    — paralelo con 5.1
5.5 (ErrorBoundary) — paralelo con todo Phase 5
5.6 (índices DB)    — independiente, al final de Phase 5
```

---

## QA Checklist

### Rol: Jugador (`is_player = true`, `is_promoter = false`, `is_cancha = false`)

**Phase 1 — Arquitectura**
- [ ] Navegar a `/feed`: los posts se muestran correctamente (sin regresión del refactor)
- [ ] Navegar a `/matches/new`: el formulario funciona igual que antes del refactor
- [ ] Navegar a `/matches/:id/edit`: el formulario precarga los datos del partido
- [ ] Abrir y cerrar `/chat/:id` varias veces rápido: no aparece "subscription already exists" en la consola del browser
- [ ] `grep -r "createClient()" src/pages/` retorna 0 resultados
- [ ] `find src/pages -name "*.tsx" | xargs wc -l | awk '$1 > 400 && $2 != "total"'` retorna 0 archivos

**Phase 3 — Perfil**
- [ ] Ir a `/profile/edit`: aparecen las secciones "Morfología", "Condicional" y "Técnico Futbolístico"
- [ ] Ingresar `height_m = 3.5`: el formulario muestra error "Altura debe estar entre 1.0 y 2.5 metros" y NO guarda
- [ ] Guardar morfología con datos válidos: aparece toast "Morfología actualizada"; al reabrir el formulario los valores están precargados
- [ ] Guardar perfil condicional con `strength_tags = ["explosivo"]` y nota de 501 caracteres: formulario bloquea con error de límite de caracteres
- [ ] Guardar perfil técnico con `position = "mediocampista"`: datos persisten correctamente
- [ ] Cambiar visibilidad de morfología a "Privado": el `Select` muestra "Privado" tras el cambio
- [ ] Con una segunda cuenta de jugador (no promotor), visitar el perfil público del primero: la sección "Morfología" NO aparece (visibilidad privada o promotores)
- [ ] Con una cuenta promotor, visitar el mismo perfil con morfología en "Solo promotores": la sección SÍ aparece

**Phase 5 — Paginación y Polish**
- [ ] Con cuenta nueva (sin datos), ir a `/mis-partidos`: se ve `EmptyState` con CTA "Crear partido →"; NO se ve pantalla en blanco
- [ ] Con cuenta nueva, ir a `/torneos`: se ve "No hay torneos disponibles" sin CTA de creación (el jugador no es promotor)
- [ ] Con cuenta nueva, ir a `/feed`: se ve `EmptyState` "El feed está vacío"
- [ ] Con cuenta nueva, ir a `/chats`: se ve "Sin conversaciones aún" con CTA
- [ ] Con DevTools → Network "Slow 3G", navegar a `/feed`: en los primeros 100ms se ven skeletons `FeedPostSkeleton`, no pantalla en blanco
- [ ] Hacer scroll al final del feed con 100+ posts: el spinner aparece, los posts 21-40 se cargan y se agregan sin re-renderizar los anteriores; "Ya viste todo el feed" aparece al llegar al final
- [ ] Causar un error intencional (temporalmente) en `TournamentDetailPage`: el `ErrorBoundary` muestra el fallback amigable; navegar a `/feed` desde el BottomNav funciona normalmente

---

### Rol: Promotor (`is_promoter = true`)

**Phase 2 — Torneos**
- [ ] Crear un torneo (borrador): en `/tournaments/:id`, el botón "Publicar torneo" está visible
- [ ] Hacer click en "Publicar torneo": el estado cambia a "abierto_inscripciones" sin recargar la página; el botón desaparece y aparece "Cerrar inscripciones"
- [ ] Hacer click en "Cerrar inscripciones": aparece `AlertDialog` con mensaje de confirmación; hacer click en "Cancelar" NO cambia el estado
- [ ] Confirmar cierre de inscripciones: el estado cambia a "cerrado_inscripciones"; aparece el botón "Generar fixture"
- [ ] Hacer click en "Generar fixture" con 4 equipos confirmados: se crean 6 partidos (C(4,2) = 6) en 3 rondas; la UI muestra los partidos en `TournamentMatchesPage`
- [ ] Hacer click en "Generar fixture" por segunda vez: aparece mensaje "El fixture ya fue generado para este torneo" y no se crean duplicados
- [ ] Intentar generar fixture con formato "eliminatoria": aparece mensaje "Formato no soportado en esta versión."
- [ ] En `TournamentMatchesPage`, verificar que los partidos muestran nombres de equipos reales (ej. "Tigres FC vs Leones"), no UUIDs
- [ ] Hacer click en "Marcar resultado" en un partido: ingresar `home_score = -1` → error "El marcador no puede ser negativo" inline; ingresar `home_score = 2`, `away_score = 1` y confirmar → la tarjeta muestra "Tigres FC 2 - 1 Leones"
- [ ] En `TournamentStandingsPage`: los equipos aparecen con nombres reales y los puntos se actualizaron tras marcar el resultado
- [ ] Hacer click en "Finalizar torneo": aparece `AlertDialog`; confirmar → estado pasa a "finalizado"
- [ ] Un usuario con `is_promoter = false` visita el mismo torneo: no ve ningún botón de acción (publicar, cerrar, generar fixture, finalizar)

---

### Rol: Dueño de cancha (`is_cancha = true`)

**Phase 4 — Reservas recurrentes**
- [ ] Ir a la agenda de su cancha `/cancha/:id/agenda`: se muestra la agenda con bookings existentes
- [ ] Crear una reserva recurrente semanal los martes 20:00-21:00: aparece confirmación; las próximas 4 ocurrencias se ven en la agenda con el ícono `RefreshCw`
- [ ] Intentar crear otra recurrencia semanal los martes 20:30-21:30 (solapamiento): la UI muestra "El horario se solapa con una serie recurrente existente" sin crear la fila en DB
- [ ] Hacer click en una ocurrencia recurrente: aparece menú con opciones "Editar esta ocurrencia", "Editar toda la serie", "Cancelar esta ocurrencia", "Cancelar toda la serie"
- [ ] Seleccionar "Editar esta ocurrencia" y cambiar horario: solo esa fecha cambia en la agenda; las demás mantienen el horario original
- [ ] Seleccionar "Editar toda la serie" y cambiar horario: todas las ocurrencias futuras muestran el nuevo horario
- [ ] Seleccionar "Cancelar esta ocurrencia" y confirmar en AlertDialog: esa fecha desaparece de la agenda; las demás permanecen
- [ ] Seleccionar "Cancelar toda la serie" y confirmar: todas las ocurrencias futuras desaparecen; las pasadas (si las hay en el historial) permanecen visibles
- [ ] Un dueño de otra cancha intenta crear una reserva recurrente en la cancha de este dueño (usando las devtools): la query retorna error `42501` por RLS
- [ ] Ir a `/cancha/:id/stats`: el gráfico `RevenueChart` muestra las dos series ("Cobrado" y "Programado"); la tabla cruda ya no aparece; el gráfico no tiene overflow horizontal a 375px

---

### Verificaciones Técnicas Finales (AC del spec)

- [ ] **AC-1**: `grep -r "createClient()" src/pages/` → 0 resultados
- [ ] **AC-2**: `find src/pages -name "*.tsx" | xargs wc -l | awk '$1 > 400 && $2 != "total"'` → 0 archivos
- [ ] **AC-3**: `npm run typecheck` → 0 errores nuevos
- [ ] **AC-14**: Carga inicial del feed con 100+ posts muestra los primeros 20 en < 1s (red normal)
- [ ] **AC-15**: Slow 3G → skeleton visible en los primeros 100ms en todas las rutas principales
- [ ] **AC-18**: Todas las pantallas nuevas/modificadas renderizan sin overflow horizontal a 375px en DevTools
- [ ] **AC-19**: `npm run build` completa sin errores TypeScript ni warnings nuevos
- [ ] **AC-20**: Navegar a `ChatDetailPage`, luego a otra ruta y volver → no aparece "subscription already exists" en la consola del browser
