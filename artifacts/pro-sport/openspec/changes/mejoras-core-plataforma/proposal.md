# Change Proposal: mejoras-core-plataforma

## Intent

La plataforma pro-sport tiene un MVP funcional pero presenta tres problemas que bloquean el lanzamiento estable a 1000 usuarios iniciales:

1. **Deuda arquitectónica heterogénea**: 17 páginas usan `createClient()` a nivel módulo con queries inline en `useEffect`, mientras que los módulos más nuevos (canchas, tournaments) siguen el patrón limpio `src/lib/{module}/api.ts` con retornos tipados `{ data, error }`. Esta inconsistencia hace que cada bug en una "página dios" (ej. `NewMatchPage.tsx` con 811 líneas) requiera leer cientos de líneas y arriesgue regresiones en flujos críticos.
2. **Módulos a medio terminar**: el módulo de **torneos** tiene capa de datos sólida pero la UI muestra "Jugador abc123" / "Equipo abc123" (UUIDs sin resolver) y carece de botones para que el promotor avance estados (publicar → cerrar inscripciones → finalizar). El **perfil de jugador** tiene tipos definidos para `ProfileMorpho`, `ProfileConditional`, `ProfileTechnicalFootball` y controles de visibilidad pero **sin formularios de edición**. El módulo de **dueño de cancha** tiene `RecurringBooking` declarado en `db.ts` pero **no existe `recurring-api.ts` ni UI**.
3. **Riesgo operativo a escala**: sin paginación en feeds, listados de matches y agendas, el primer usuario con +200 registros notará lentitud o fallos de render. Sin Skeletons consistentes, las cargas se ven como pantallas en blanco.

Este cambio cierra la deuda crítica antes del lanzamiento, completa los tres módulos al nivel de producto vendible y deja la plataforma lista para soportar 1000 usuarios sin re-trabajo arquitectónico.

## Goals

1. **Unificar el patrón de acceso a datos**: 100% de las páginas que tocan Supabase consumen funciones tipadas desde `src/lib/{module}/api.ts` con el contrato `{ data: T | null, error: string | null }`. Eliminar `createClient()` a nivel módulo en componentes de página.
2. **Reducir páginas dios**: ninguna página > 400 líneas tras la refactorización (objetivo de las 5 páginas identificadas: `NewMatchPage`, `EditMatchPage`, `FeedPage`, `CanchaAgendaPage`, `ChatDetailPage`).
3. **Cerrar el ciclo de torneos**: un promotor puede crear → publicar → cerrar inscripciones → generar fixture → marcar resultados → finalizar un torneo desde la UI, y un jugador ve nombres reales (no UUIDs) en standings y matches.
4. **Completar el perfil del jugador**: un jugador puede editar morfología, condicional, técnico-futbolístico y configurar la visibilidad por sección (público / promotores / privado).
5. **Habilitar reservas recurrentes para canchas**: un dueño de cancha puede crear, editar y cancelar reservas recurrentes (semanal / quincenal / mensual) desde la agenda.
6. **Garantizar performance a escala**: feeds, listados de matches y agendas con paginación cursor-based o infinite scroll; todas las pantallas con `Skeleton` durante carga inicial.
7. **Mantener cero regresiones funcionales** verificables manualmente con un checklist de QA por rol antes de merge a `main`.

## Non-Goals

- **No** introducir un framework de testing (Jest/Vitest/Playwright). Se difiere a un cambio posterior; el alcance actual ya es amplio y la prioridad es estabilizar funcionalidad observable.
- **No** migrar a Next.js, Remix u otro framework. Se mantiene Vite + Wouter.
- **No** crear una capa nueva `/services/` ni introducir patrones DDD/Clean Architecture formales. Se consolida el patrón existente `src/lib/{module}/api.ts`.
- **No** rediseñar el sistema de notificaciones, chat o autenticación; permanecen como están salvo extracciones puntuales de queries inline.
- **No** agregar nuevas librerías UI. Todo se construye con shadcn/ui + Radix + Framer Motion ya instalados.
- **No** implementar internacionalización (i18n). El producto sigue en español.
- **No** cambiar el modelo de roles (`is_player`, `is_promoter`, `is_cancha`).
- **No** implementar pagos online (Stripe/MercadoPago) — fuera de alcance de este cambio.

## Affected Roles

| Rol | Impacto |
|-----|---------|
| **Jugador (`is_player`)** | Gana edición completa de perfil (morfología, condicional, técnico, visibilidad). Ve nombres reales en standings/matches de torneos. Mejora percepción de velocidad por Skeletons y paginación en feed. |
| **Promotor (`is_promoter`)** | Gana flujo end-to-end de torneo: publicar, cerrar inscripciones, generar fixture, registrar resultados, finalizar. Ve nombres reales de equipos/jugadores. |
| **Dueño de cancha (`is_cancha`)** | Gana CRUD de reservas recurrentes en la agenda. Recibe `CanchaAgendaPage` refactorizada (más rápida, menos bugs). Visualización de revenue mejora de tabla cruda a gráfico. |
| **Todos** | Beneficio transversal: páginas más pequeñas → menos bugs; errores estandarizados con `mapDbError`; navegación móvil consistente. |

## Scope

### Phase 1 — Foundation & Architecture

**Qué**:
- Auditar las 17 páginas que usan `createClient()` a nivel módulo y extraer sus queries a `src/lib/{module}/api.ts`.
- Crear los módulos faltantes en `src/lib/`: `feed/api.ts`, `matches/api.ts` (extender el existente si lo hay), `chat/api.ts`, `notifications/api.ts`.
- Refactorizar las 5 páginas dios identificadas dividiendo en sub-componentes (presentacionales) + custom hooks (`use{Feature}Data`, `use{Feature}Mutation`).
- Estandarizar manejo de errores: todas las funciones API usan `mapDbError` y retornan `{ data, error }`.
- Asegurar cleanup de subscripciones realtime con `return () => supabase.removeChannel(channel)` donde aplique.

**Por qué**: es prerrequisito para las fases 2-4. Sin este patrón consolidado, las nuevas funcionalidades heredarán la deuda. Además, reduce el riesgo de regresión al tocar código existente.

**Archivos afectados (no exhaustivo)**:
- `src/pages/NewMatchPage.tsx` (811 → ≤400)
- `src/pages/EditMatchPage.tsx` (757 → ≤400)
- `src/pages/FeedPage.tsx` (737 → ≤400)
- `src/pages/CanchaAgendaPage.tsx` (746 → ≤400) — coordina con Fase 4
- `src/pages/ChatDetailPage.tsx` (501 → ≤400)
- Nuevos: `src/lib/feed/api.ts`, `src/lib/matches/api.ts`, `src/lib/chat/api.ts`, `src/lib/notifications/api.ts`
- Nuevos hooks: `src/hooks/useFeedData.ts`, `src/hooks/useMatchForm.ts`, `src/hooks/useAgendaData.ts`, `src/hooks/useChatThread.ts`

### Phase 2 — Tournament Module Completion

**Qué**:
- **Resolución de nombres**: en `src/lib/tournaments/matches.ts` y `registrations.ts`, agregar joins a `profiles` y `teams` para retornar `player_name`, `team_name`. Adaptar las páginas `TournamentStandingsPage` y `TournamentMatchesPage` para consumir los nombres.
- **Transiciones de estado para promotor**: agregar UI en `TournamentDetailPage` (vista promotor) con botones:
  - "Publicar torneo" (`draft` → `published`)
  - "Cerrar inscripciones" (`published` → `registration_closed`)
  - "Generar fixture" (genera matches según formato — round-robin, knockout, grupos)
  - "Marcar resultado" (en cada match)
  - "Finalizar torneo" (computa standings finales y bloquea ediciones)
- **Generación de fixture**: nueva función `generateFixture(tournamentId, format)` en `src/lib/tournaments/fixtures.ts`. Soporta round-robin como mínimo viable; knockout y grupos pueden quedar como TODO declarado.
- **Confirmaciones**: cada transición destructiva (cerrar inscripciones, finalizar) usa `AlertDialog` de shadcn.

**Por qué**: hoy el módulo es inutilizable end-to-end. Un promotor no puede operar un torneo real desde la app — falta la mitad del flujo y los nombres son UUIDs.

**Archivos afectados**:
- `src/lib/tournaments/matches.ts` (extender query con join a `profiles`/`teams`)
- `src/lib/tournaments/registrations.ts` (extender query con join)
- `src/lib/tournaments/api.ts` (nuevas funciones `publishTournament`, `closeRegistrations`, `finalizeTournament`)
- Nuevo: `src/lib/tournaments/fixtures.ts`
- `src/pages/TournamentStandingsPage.tsx` (consumir nombres reales)
- `src/pages/TournamentMatchesPage.tsx` (consumir nombres reales)
- `src/pages/TournamentDetailPage.tsx` (agregar acciones del promotor)
- Nuevo: `src/components/tournaments/TournamentStateActions.tsx`
- Nuevo: `src/components/tournaments/MatchResultDialog.tsx`

**DB changes**: ninguna columna nueva. **Sí** posibles cambios de RLS para permitir lectura de `profiles.full_name` y `teams.name` por usuarios no miembros del torneo (ver tabla DB Changes).

### Phase 3 — Player Profile Completion

**Qué**:
- Crear formularios de edición para los tres bloques ya tipados pero sin UI:
  - **Morfología** (`ProfileMorpho`): altura, peso, envergadura, lateralidad (diestro/zurdo/ambidiestro), somatotipo (ectomorfo/mesomorfo/endomorfo).
  - **Condicional** (`ProfileConditional`): VO2max estimado, velocidad 30m, salto vertical, resistencia, fuerza percibida (escala 1-10).
  - **Técnico-futbolístico** (`ProfileTechnicalFootball`): posiciones preferidas (multi-select), pierna hábil (ya existe `preferred_foot`), estilo de juego, debilidades autodeclaradas.
- **Controles de visibilidad por sección**: cada bloque tiene un selector `publico | promotores | privado`. Por defecto: skills FIFA y técnico = `publico`; morfología y condicional = `promotores`.
- Integrar en `ProfileEditPage` como tabs o accordions (mobile-first).
- Actualizar `ProfilePage` (vista pública) para respetar visibilidad según el `viewer_role` (jugador anónimo, promotor, dueño del perfil).

**Por qué**: el perfil deportivo es el activo principal del jugador y diferenciador competitivo de la plataforma. Hoy queda en 6 sliders FIFA — insuficiente para que un promotor evalúe seriamente.

**Archivos afectados**:
- `src/lib/profiles/api.ts` (extender o crear funciones `updateMorpho`, `updateConditional`, `updateTechnicalFootball`, `updateVisibility`)
- `src/pages/ProfileEditPage.tsx` (agregar tabs/accordions con los 3 nuevos bloques)
- `src/pages/ProfilePage.tsx` (filtrar bloques según visibilidad y rol del visitante)
- Nuevos: `src/components/profile/MorphoForm.tsx`, `ConditionalForm.tsx`, `TechnicalFootballForm.tsx`, `VisibilityToggle.tsx`
- `src/lib/types/db.ts` (verificar que tipos coincidan con el schema real)

**DB changes**: confirmar existencia de tablas `profile_morpho`, `profile_conditional`, `profile_technical_football` y columnas de visibilidad. Si no existen, crear migración (ver tabla DB Changes).

### Phase 4 — Court Owner: Recurring Bookings

**Qué**:
- Crear `src/lib/canchas/recurring-api.ts` con CRUD: `createRecurring`, `updateRecurring`, `cancelRecurring`, `listRecurringByCancha`, `expandToBookings(recurringId, fromDate, toDate)`.
- Definir el patrón de "expansión": un `RecurringBooking` no genera filas en `bookings` por adelantado; se expande on-demand cuando se consulta la agenda en un rango. Excepciones (cancelaciones puntuales, cambios) se almacenan en una tabla `recurring_exceptions` o como columna JSON en el recurring.
- UI:
  - En `CanchaAgendaPage`, agregar acción "Crear reserva recurrente" (botón + dialog).
  - Render diferenciado en agenda: bookings recurrentes muestran ícono distintivo y, al click, ofrecen "editar esta ocurrencia" vs "editar serie".
  - Vista lista en nueva ruta `/cancha/agenda/recurrentes` para gestionar series existentes.
- Integrar con el cálculo de revenue: las recurrencias proyectadas cuentan como "revenue programado" diferenciado del "revenue cobrado".
- **Mejora del gráfico de revenue**: convertir la tabla cruda a un gráfico de líneas/barras usando `recharts` (ya en stack de shadcn).

**Por qué**: las reservas recurrentes son la principal demanda de dueños de cancha en operación real (equipos que reservan los martes 8pm cada semana). Sin esto, el módulo es solo "bookings ad-hoc" y los dueños cargan manualmente cada semana.

**Archivos afectados**:
- Nuevo: `src/lib/canchas/recurring-api.ts`
- Nuevo: `src/components/canchas/RecurringBookingDialog.tsx`
- Nuevo: `src/components/canchas/RecurringSeriesList.tsx`
- Nuevo: `src/pages/CanchaRecurringPage.tsx`
- Nuevo: `src/components/canchas/RevenueChart.tsx` (con `recharts`)
- `src/pages/CanchaAgendaPage.tsx` (integración + refactor de Fase 1)
- `src/pages/CanchaStatsPage.tsx` (integrar `RevenueChart`)
- `src/lib/types/db.ts` (asegurar tipo `RecurringBooking` y `RecurringException`)

**DB changes**: tabla `recurring_bookings` (verificar existencia) + nueva tabla `recurring_exceptions` + RLS (ver tabla).

### Phase 5 — Pagination & Polish

**Qué**:
- **Paginación cursor-based** en:
  - `FeedPage` (posts, infinite scroll con `useInfiniteQuery` de TanStack Query)
  - `MatchesListPage` y filtros de matches por usuario
  - `CanchaAgendaPage` (limitar carga a rango visible ±2 semanas)
  - Listados de torneos (`TournamentsPage`)
  - `ChatListPage` (paginar conversaciones; mensajes ya paginan)
- **Skeletons** consistentes en todas las pantallas durante `isLoading`. Patrones reutilizables en `src/components/ui/skeletons/` (ej. `MatchCardSkeleton`, `TournamentCardSkeleton`, `ProfileSkeleton`).
- **Empty states**: cada lista vacía muestra ilustración o ícono + CTA contextual ("No tienes partidos. Crear uno →").
- **Error boundaries**: agregar `<ErrorBoundary>` por ruta principal con fallback amigable.
- **QA checklist por rol**: documento `openspec/changes/mejoras-core-plataforma/qa-checklist.md` con flujos críticos para validar antes de merge.

**Por qué**: a 1000 usuarios, un feed sin paginación carga 1000+ posts. Los skeletons son cosméticos pero críticos para percepción de calidad. Los empty states evitan UX rotos en cuentas nuevas.

**Archivos afectados**:
- Hooks: agregar `useInfiniteQuery` en `useFeedData`, `useMatchesList`, `useAgendaData`
- `src/components/ui/skeletons/` (nuevo directorio con ~6 componentes)
- `src/components/ui/EmptyState.tsx` (nuevo, parametrizable)
- `src/components/ErrorBoundary.tsx` (nuevo)
- `src/App.tsx` (envolver rutas en `ErrorBoundary`)

## Architecture Decisions

### Decision 1: No introducir una capa `/services/`

**Decisión**: mantener la estructura `src/lib/{module}/api.ts` que ya existe en canchas y tournaments. No crear `src/services/` ni adoptar Clean Architecture formal.

**Rationale**:
- El proyecto es de un solo desarrollador + AI assistant, no un equipo grande que se beneficie de capas estrictas.
- `src/lib/{module}/api.ts` ya prueba ser suficiente: las funciones encapsulan la query, normalizan errores y devuelven tipos. Agregar un `service` sería ceremonial sin ganancia funcional para 1000 usuarios.
- Migrar 17 páginas a un patrón nuevo es mucho más barato que migrarlas a dos patrones nuevos (lib + services).
- Si en el futuro la lógica de negocio crece (ej. validaciones cross-módulo), se puede agregar `src/lib/{module}/service.ts` como evolución incremental sin romper nada.

### Decision 2: TanStack Query para todo el server state, Context solo para auth y notificaciones

**Decisión**: cualquier lectura que llegue a Supabase pasa por `useQuery` / `useInfiniteQuery` / `useMutation`. No agregar Zustand, Redux ni otros stores. Mantener `AuthContext` y `NotificationsContext` como están.

**Rationale**:
- Ya hay TanStack Query instalado y usado parcialmente; consolidar es más barato que introducir un store nuevo.
- TanStack Query resuelve cache, dedup, refetch y paginación — exactamente lo que necesitamos en Fase 5.
- Context para auth/notifs está bien porque son globales y cambian poco; meterlos a un store sería overengineering.

### Decision 3: Refactor por extracción incremental, no rewrite

**Decisión**: para las 5 páginas dios, refactorizar extrayendo sub-componentes y hooks **manteniendo el archivo original como orquestador**. No reescribir desde cero.

**Rationale**:
- Sin tests automatizados, un rewrite es alto riesgo. La extracción incremental permite verificar visualmente paso a paso.
- Permite commits pequeños (un sub-componente por commit) y rollback granular.
- El archivo original termina como un componente delgado de composición, no desaparece — preserva las URLs y el routing existente.

### Decision 4: Generación de fixture solo round-robin en MVP

**Decisión**: la primera versión de `generateFixture` soporta solo round-robin. Knockout y grupos quedan como TODO documentado en código y en el spec.

**Rationale**:
- Round-robin cubre el caso más común (ligas locales pequeñas).
- Knockout requiere lógica de seeding y bracket; grupos requiere fase de grupos + clasificación. Cada uno duplica el alcance de la fase 2.
- Diferir es seguro: se puede agregar en un cambio posterior sin afectar lo construido.

### Decision 5: Reservas recurrentes con expansión on-demand, no materialización

**Decisión**: `recurring_bookings` no genera filas en `bookings` por adelantado. La agenda expande las recurrencias en cliente al consultar un rango.

**Rationale**:
- Materializar 52 semanas × N recurrencias por cancha infla la tabla `bookings` y complica conflictos (ej. cancelar una serie deja huérfanos).
- La expansión on-demand mantiene `bookings` solo para reservas reales (ad-hoc o instancias modificadas/excepciones).
- Trade-off: la query de agenda es ligeramente más compleja, pero es local (un solo módulo) y los rangos son acotados (la agenda muestra una semana o un mes a la vez).

### Decision 6: Visibilidad de perfil enforced en cliente con verificación en RLS

**Decisión**: la visibilidad por bloque (`publico | promotores | privado`) se filtra en cliente al renderizar, **y** en políticas RLS de Supabase para evitar que un cliente mal intencionado lea bloques privados vía API directa.

**Rationale**:
- Filtrar solo en cliente es inseguro (cualquiera con la key anon puede consultar la tabla).
- RLS policy: lectura permitida si `visibility = 'publico'` OR (`visibility = 'promotores'` AND `auth.uid()` está en perfiles con `is_promoter = true`) OR `auth.uid() = profile_id`.
- Es la forma correcta en Supabase y el costo de implementar RLS es bajo si se hace junto a la migración de los bloques.

## DB Changes Required

Se requiere primero **auditar el schema vivo** en Supabase (Dashboard o `supabase db dump`) para confirmar qué tablas/columnas ya existen. La tabla siguiente lista lo necesario asumiendo el peor caso (no existen).

| Tabla | Cambio | Tipo | Riesgo | Notas |
|-------|--------|------|--------|-------|
| `profile_morpho` | Crear tabla | Nueva tabla | Bajo | Columnas: `profile_id` (FK + PK), `height_cm`, `weight_kg`, `wingspan_cm`, `laterality`, `somatotype`, `visibility`, timestamps. RLS por `auth.uid()`. |
| `profile_conditional` | Crear tabla | Nueva tabla | Bajo | Columnas: `profile_id` (FK + PK), `vo2max`, `speed_30m`, `vertical_jump`, `endurance`, `strength`, `visibility`, timestamps. |
| `profile_technical_football` | Crear tabla | Nueva tabla | Bajo | Columnas: `profile_id` (FK + PK), `positions` (text[]), `play_style`, `weaknesses`, `visibility`, timestamps. (Pierna hábil ya existe en `profiles.preferred_foot`.) |
| `profiles` | Verificar columnas de visibilidad | Verificación | Bajo | Si la visibilidad es por bloque, vive en cada tabla de bloque. Verificar que no haya columnas de visibilidad sueltas. |
| `recurring_bookings` | Crear o verificar tabla | Nueva tabla / verificar | Medio | Columnas: `id`, `cancha_id` (FK), `customer_id` o `customer_name`, `day_of_week` (0-6), `start_time`, `end_time`, `frequency` (`weekly`/`biweekly`/`monthly`), `start_date`, `end_date` (nullable = indefinido), `price`, `notes`, timestamps. |
| `recurring_exceptions` | Crear tabla | Nueva tabla | Medio | Columnas: `id`, `recurring_id` (FK), `original_date`, `action` (`cancelled`/`modified`), `new_start`, `new_end`, `new_price` (nullables), timestamps. |
| `bookings` | Verificar columna `recurring_id` (FK opcional) | Posible nueva columna | Bajo | Si se quiere materializar instancias modificadas como bookings reales linkeados a la serie. |
| `tournaments` | Verificar enum/string `status` incluye `published`, `registration_closed`, `finalized` | Verificación / posible enum update | Medio | Si el enum es restringido, agregar valores requiere migración. |
| RLS: `profiles.full_name`, `teams.name` | Política de lectura más amplia | Nueva/ajuste de policy | Medio | Permitir SELECT de `full_name` y `name` para usuarios autenticados (no solo miembros del torneo). Considerar si hay implicación de privacidad. |
| RLS: `profile_morpho`, `profile_conditional`, `profile_technical_football` | Policy basada en `visibility` | Nuevas policies | Medio | Lectura: público / promotores / dueño según `visibility`. Escritura: solo dueño. |
| RLS: `recurring_bookings`, `recurring_exceptions` | Policy por `cancha.owner_id` | Nuevas policies | Bajo | Lectura/escritura solo para el dueño de la cancha. |

**Acción previa obligatoria**: antes de empezar Fase 3 o Fase 4, ejecutar `supabase db dump --schema public` (o equivalente) y commitear el snapshot a `openspec/changes/mejoras-core-plataforma/db-snapshot.sql` para confirmar qué migraciones son realmente necesarias.

## Rollback Plan

Estrategia general: cada fase merge a `release/mvp-v1` por PR independiente. Si una fase introduce regresiones, se revierte el merge sin afectar las demás.

| Fase | Estrategia de rollback |
|------|------------------------|
| **Fase 1 (Foundation)** | `git revert` del PR. Las extracciones a `src/lib/{module}/api.ts` son aditivas; revertir las páginas las regresa a queries inline funcionales. Los nuevos archivos en `src/lib/` quedan huérfanos pero no rompen. |
| **Fase 2 (Tournaments)** | `git revert` del PR. Si la migración RLS para `profiles.full_name`/`teams.name` ya está en producción, mantenerla (no es destructiva) o revertir vía SQL `DROP POLICY`. Las nuevas funciones de transición de estado son opt-in (botones nuevos), no afectan datos previos. |
| **Fase 3 (Profile)** | `git revert` del PR. Las migraciones de `profile_morpho`, `profile_conditional`, `profile_technical_football` son tablas nuevas — pueden mantenerse vacías o `DROP TABLE` si se quiere limpieza. Datos de jugadores no se pierden porque los bloques eran nuevos. |
| **Fase 4 (Recurring Bookings)** | `git revert` del PR. Las recurrencias creadas durante el periodo afectado quedan en `recurring_bookings` pero sin UI; se pueden listar/borrar manualmente desde Supabase Dashboard. Bookings ad-hoc no se ven afectados. |
| **Fase 5 (Pagination & Polish)** | `git revert` del PR. La paginación es aditiva; revertir vuelve a cargar todo de una. Skeletons y empty states son visuales puros. |

**Migrations rollback**: cada migración SQL en `supabase/migrations/` debe tener un `down.sql` complementario o documentación clara de cómo revertir manualmente. Para tablas nuevas: `DROP TABLE IF EXISTS ... CASCADE`. Para policies: `DROP POLICY ...`.

**Backups**: antes de aplicar migrations en producción, hacer backup vía `supabase db dump` y guardar localmente.

## Success Criteria

Verificables manualmente, sin requerir tests automatizados:

1. **Arquitectura**: `grep -r "createClient()" src/pages/` retorna 0 resultados (todas las páginas consumen funciones de `src/lib/`).
2. **Tamaño de archivos**: `find src/pages -name "*.tsx" -exec wc -l {} \; | awk '$1 > 400'` retorna 0 archivos (ningún page > 400 líneas).
3. **Tournament flow** (manual, rol promotor):
   - Crear torneo en estado `draft` → publicar → ver en lista pública.
   - Cerrar inscripciones → no se aceptan más equipos.
   - Generar fixture round-robin → matches visibles en `TournamentMatchesPage`.
   - Marcar resultado de un match → standings se actualizan.
   - Finalizar torneo → standings finales bloqueados.
4. **Tournament names**: `TournamentStandingsPage` y `TournamentMatchesPage` muestran nombres reales de jugadores y equipos. `grep "abc123\|UUID stub"` en código de UI retorna 0 resultados.
5. **Player profile** (manual, rol jugador):
   - Editar morfología (altura, peso, envergadura, lateralidad, somatotipo) y persiste.
   - Editar condicional y persiste.
   - Editar técnico-futbolístico y persiste.
   - Cambiar visibilidad de morfología a "privado" → otro jugador no ve esos campos en `ProfilePage`.
   - Visibilidad "promotores" → un promotor ve, un jugador no.
6. **Recurring bookings** (manual, rol dueño de cancha):
   - Crear recurrente semanal → aparece en agenda los próximos 4+ lunes (o día seleccionado).
   - Editar una ocurrencia individual → solo esa fecha cambia.
   - Cancelar la serie → ocurrencias futuras desaparecen, pasadas permanecen.
   - Revenue chart muestra gráfica (no tabla cruda) en `CanchaStatsPage`.
7. **Performance**: cargar feed con cuenta de prueba que tenga 100+ posts → primera respuesta visible < 1s, scroll fluido sin congelarse.
8. **Skeletons**: navegar a cada ruta principal con DevTools → Network throttling "Slow 3G" → ninguna pantalla muestra blanco > 100ms; siempre Skeleton.
9. **Empty states**: cuenta nueva sin datos → cada lista (matches, torneos, agenda, feed) muestra empty state con CTA, no pantalla vacía.
10. **QA checklist completo**: el archivo `qa-checklist.md` tiene todos los flujos por rol marcados antes de merge a `main`.
11. **Build limpio**: `npm run build` sin errores ni warnings TypeScript nuevos.
12. **Mobile**: cada pantalla nueva o modificada renderiza correctamente a 375px de ancho (verificar en DevTools).

## Dependencies & Risks

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Las tablas `profile_morpho`, `profile_conditional`, `profile_technical_football` no existen en Supabase prod | Alta | Alto | Auditar schema antes de Fase 3. Crear migraciones explícitas y aplicar primero en entorno de dev/staging si existe; si no, en una ventana de bajo tráfico. |
| `recurring_bookings` declarado en `db.ts` pero sin tabla real | Alta | Alto | Mismo enfoque: auditar antes de Fase 4. Crear tabla y `recurring_exceptions` juntos. |
| RLS de `profiles.full_name` y `teams.name` actualmente restringido — muestra UUIDs porque la query falla silenciosamente | Media | Alto | Confirmar comportamiento actual con prueba directa en Supabase. Diseñar policy mínima necesaria sin abrir más datos de los requeridos. |
| Refactor de páginas dios introduce regresiones funcionales | Alta | Alto | Refactor por extracción incremental, no rewrite. QA checklist manual antes de merge. Commits pequeños. PRs por sub-feature, no por página completa. |
| Generación de fixture round-robin con número impar de equipos genera bye incorrectos | Media | Medio | Implementar algoritmo estándar (rotación con bye fijo). Probar manualmente con 3, 4, 5 y 8 equipos antes de marcar fase 2 completa. |
| Expansión de recurrencias on-demand causa solapamiento con bookings ad-hoc existentes | Media | Medio | Validar en cliente: al crear un booking ad-hoc, chequear si la franja choca con una recurrencia ya programada. Mismo chequeo al crear recurrencia (ver bookings existentes en el rango). |
| Paginación cursor-based requiere índice en columna de orden (ej. `created_at`) | Baja | Medio | Verificar índices en Supabase Dashboard. Si faltan, agregar `CREATE INDEX` en migración pequeña. |
| `recharts` aumenta el bundle size significativamente | Baja | Bajo | Verificar tamaño post-build. Si > 50KB gzip, considerar alternativa más liviana o lazy load del chart. |
| TanStack Query `useInfiniteQuery` mal usado causa loops infinitos | Media | Medio | Seguir patrón estándar: `getNextPageParam` retorna `undefined` cuando no hay más datos. Probar con dataset finito conocido. |
| Visibilidad de perfil filtrada solo en cliente — un cliente curioso ve datos privados vía API directa | Media | Alto | Implementar RLS policies en Fase 3 obligatoriamente; no diferir. Documentar en spec. |
| El alcance es grande para un solo desarrollador y se eterniza | Alta | Medio | Las 5 fases son secuenciales y cada una mergeable independientemente. Si el tiempo aprieta, se puede lanzar a producción tras Fase 1+2 y diferir 3-5 a un cambio sucesor. |
| Cambio de modelo de datos rompe sesiones activas / cache local de TanStack Query | Baja | Bajo | TanStack invalida queries por key. Usar versionado en queryKey si hay shape change. Limpiar `localStorage` de auth tras deploy si es necesario. |

## Out of Scope (Future Changes)

- **Tests automatizados**: Vitest unit tests + Playwright E2E. Justificación: el alcance actual ya es amplio; introducir testing infra como cambio dedicado posterior permite invertir tiempo en cobertura significativa, no superficial.
- **Generación de fixture knockout y grupos**: solo round-robin en este cambio. Los otros formatos requieren UI de seeding y bracket que duplica el scope de Fase 2.
- **Pagos online (Stripe / MercadoPago)**: las canchas hoy operan con pago manual / efectivo. Integrar pagos requiere cuenta merchant, webhooks, conciliación — proyecto independiente.
- **Notificaciones push (FCM / OneSignal)**: las notificaciones in-app ya funcionan vía Supabase Realtime. Push requiere infraestructura adicional (FCM keys, web push), se difiere.
- **App móvil nativa (React Native / Expo)**: hoy es web responsive; nativa es proyecto aparte.
- **Dashboard de analytics para promotores y dueños**: básico ya existe (`CanchaStatsPage`). Analytics avanzados (cohorts, retención, funnel) son evolución posterior.
- **Internacionalización**: producto solo en español por ahora. i18n cuando haya tracción fuera de Colombia.
- **Sistema de logros / gamificación de jugador**: hay sliders FIFA pero no badges, niveles, ni rankings globales. Diferido — requiere diseño de producto dedicado.
- **Chat de grupo (más de 1:1)**: chat actual es 1:1. Grupos requieren modelo distinto y UI de gestión de miembros.
- **Verificación de identidad / KYC para canchas y promotores**: hoy se confía en el rol declarado. KYC es relevante cuando se introduzcan pagos.
- **Renovación automática de reservas recurrentes con `end_date` indefinido**: este cambio soporta `end_date` nullable pero no implementa renovación de calendarios completos automática (la expansión es on-demand y suficiente para MVP).
