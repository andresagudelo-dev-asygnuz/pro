# Especificación: mejoras-core-plataforma

## Overview

Este documento especifica los requisitos funcionales y de arquitectura para cerrar la deuda técnica crítica de la plataforma pro-sport antes del lanzamiento a 1000 usuarios. Cubre cinco fases secuenciales: unificación del patrón de acceso a datos (Fase 1), finalización del flujo completo de torneos (Fase 2), completar los formularios de edición del perfil deportivo del jugador (Fase 3), habilitar reservas recurrentes para dueños de cancha (Fase 4), y paginación cursor-based con polish de UX (Fase 5). Cada fase es mergeable de forma independiente a `release/mvp-v1`.

## Scope Reference

Ver `openspec/changes/mejoras-core-plataforma/proposal.md` — Phases 1–5.

Roles afectados: `is_player`, `is_promoter`, `is_cancha`.
Plataforma: Vite + React + Wouter + Supabase + TanStack Query + shadcn/ui.
Branch objetivo: `release/mvp-v1` → `main`.

---

## Phase 1 — Foundation & Architecture

### REQ-1.1: Patrón de acceso a datos unificado

Todas las páginas que realizan llamadas a Supabase DEBEN consumir funciones exportadas desde `src/lib/{module}/api.ts`. Ninguna página o componente MAY llamar `createClient()` a nivel módulo ni construir queries inline en `useEffect` directamente. Las funciones de API DEBEN retornar el contrato `{ data: T | null, error: string | null }`. Los módulos faltantes que DEBEN crearse son: `src/lib/feed/api.ts`, `src/lib/matches/api.ts`, `src/lib/chat/api.ts` (verificar si ya existe en `src/lib/chat/api.ts`). Cada función de API DEBE usar `mapDbError` de `src/lib/errors/map-db-error.ts` para normalizar errores de Supabase antes de retornarlos.

#### Scenario 1.1.1 — Extracción exitosa de query inline a api.ts

Dado que `NewMatchPage.tsx` (actualmente con 811 líneas) contiene una llamada a `createClient()` y un `useQuery` con la query inline,
Cuando se extrae la query a `src/lib/matches/api.ts` como `getMatchesByCity(supabase, city): Promise<{ data: Match[] | null, error: string | null }>` y `NewMatchPage.tsx` importa esa función,
Entonces `grep -r "createClient()" src/pages/NewMatchPage.tsx` devuelve 0 resultados, la función en `api.ts` retorna `{ data, error }` tipado, y la página renderiza los mismos datos sin cambio de comportamiento visible.

#### Scenario 1.1.2 — Manejo de error estandarizado desde api.ts

Dado que la función `getMatchesByCity` en `src/lib/matches/api.ts` recibe un error de Supabase con `code: "42501"` (permiso denegado),
Cuando el componente consumidor evalúa el retorno,
Entonces `error` contiene el string `"No tenés permisos para hacer esto."` (mapeado por `mapDbError`), `data` es `null`, y el componente muestra el mensaje de error en lugar de un crash de JavaScript.

#### Scenario 1.1.3 — Verificación global post-refactorización

Dado que la Fase 1 está completa,
Cuando se ejecuta `grep -r "createClient()" src/pages/` en la raíz del proyecto,
Entonces el comando devuelve 0 líneas (ningún archivo de página importa o instancia `createClient()` directamente).

---

### REQ-1.2: Reducción de páginas dios

Las cinco páginas identificadas DEBEN reducirse a 400 líneas o menos cada una, extrayendo sub-componentes presentacionales y custom hooks. La extracción DEBE ser incremental (no rewrite desde cero). Cada página DEBE mantenerse como componente orquestador que importa hooks y sub-componentes. Los sub-componentes creados DEBEN ser presentacionales (sin llamadas directas a Supabase). Los custom hooks DEBEN seguir el patrón `use{Feature}Data` para lectura y `use{Feature}Mutation` para escritura.

Páginas objetivo:
- `src/pages/NewMatchPage.tsx` (811 → ≤400 líneas)
- `src/pages/EditMatchPage.tsx` (757 → ≤400 líneas)
- `src/pages/FeedPage.tsx` (737 → ≤400 líneas)
- `src/pages/CanchaAgendaPage.tsx` (746 → ≤400 líneas) — coordina con Fase 4
- `src/pages/ChatDetailPage.tsx` (501 → ≤400 líneas)

Hooks nuevos a crear: `src/hooks/useFeedData.ts`, `src/hooks/useMatchForm.ts`, `src/hooks/useAgendaData.ts`, `src/hooks/useChatThread.ts`.

#### Scenario 1.2.1 — Página reducida exitosamente

Dado que `NewMatchPage.tsx` tiene 811 líneas antes del refactor,
Cuando se extrae el formulario de partido a `src/components/matches/MatchForm.tsx` y la lógica de datos a `src/hooks/useMatchForm.ts`,
Entonces `wc -l src/pages/NewMatchPage.tsx` devuelve un número ≤ 400, `MatchForm.tsx` no importa `supabase` ni `createClient`, y `useMatchForm.ts` encapsula toda la lógica de submit y validación.

#### Scenario 1.2.2 — Sub-componente presentacional sin lógica de datos

Dado que `src/components/matches/MatchForm.tsx` es un sub-componente extraído de `NewMatchPage.tsx`,
Cuando el componente se inspecciona,
Entonces NO contiene imports de `@supabase/supabase-js`, NO llama a `createClient()`, recibe todos sus datos como props o consume un custom hook que abstrae la capa de datos.

#### Scenario 1.2.3 — Build limpio después de refactorización

Dado que una página ha sido refactorizada,
Cuando se ejecuta `npm run typecheck`,
Entonces el comando termina sin errores de TypeScript nuevos introducidos por la refactorización.

---

### REQ-1.3: Manejo de errores estandarizado

Todas las funciones en `src/lib/{module}/api.ts` DEBEN usar `mapDbError` de `src/lib/errors/map-db-error.ts`. El contrato de retorno DEBE ser `{ data: T | null, error: string | null }` en todas las funciones de lectura y mutación. Las funciones SHOULD distinguir contextos de error distintos pasando el parámetro `context` a `mapDbError` (ej. `mapDbError(error, "create_booking")`). Los componentes MUST mostrar el mensaje de error al usuario cuando `error !== null`, ya sea en un `<Alert>` de shadcn, un toast, o texto inline.

#### Scenario 1.3.1 — Error de duplicado mostrado al usuario

Dado que un usuario intenta inscribir un equipo que ya está inscrito en un torneo,
Cuando la función `registerTeamToTournament` en `src/lib/tournaments/registrations.ts` recibe error `code: "23505"` de Supabase,
Entonces retorna `{ data: null, error: "Ese valor ya existe. Probá con otro." }` y el componente `TournamentRegisterPage` muestra ese mensaje en pantalla sin crash.

#### Scenario 1.3.2 — Error de RLS sin exponer detalles técnicos

Dado que un usuario sin permisos intenta modificar un torneo que no le pertenece,
Cuando la función `publishTournament` en `src/lib/tournaments/api.ts` recibe error `code: "42501"`,
Entonces retorna `{ data: null, error: "No tenés permisos para hacer esto." }` y el componente muestra ese mensaje sin exponer el SQL error original.

---

### REQ-1.4: Cleanup de subscripciones realtime

Cada componente que abra un canal Supabase Realtime con `supabase.channel(...)` o `supabase.from(...).on(...)` DEBE retornar una función de cleanup que llame a `supabase.removeChannel(channel)`. El cleanup MUST ejecutarse en el `return` del `useEffect` correspondiente. Los hooks `useChatThread` y cualquier otro hook que use Realtime DEBEN exponer el cleanup correctamente.

#### Scenario 1.4.1 — Cleanup al desmontar componente de chat

Dado que el usuario está en `ChatDetailPage` con una suscripción activa al canal `messages:conversation_id=abc`,
Cuando el usuario navega a otra ruta y `ChatDetailPage` se desmonta,
Entonces el `useEffect` cleanup llama a `supabase.removeChannel(channel)`, el canal queda cerrado, y no se producen memory leaks ni errores de "subscription already exists" al volver a la pantalla.

#### Scenario 1.4.2 — Sin subscripciones huérfanas en navigación rápida

Dado que el usuario navega rápidamente entre `ChatDetailPage` (conversación A) y `ChatDetailPage` (conversación B),
Cuando cada instancia del componente se monta y desmonta,
Entonces cada canal creado para la conversación anterior se elimina con `removeChannel` antes de crear el nuevo canal, sin acumulación de subscripciones activas en la sesión de Supabase.

---

## Phase 2 — Tournament Module Completion

### REQ-2.1: Resolución de nombres reales en torneo

Las funciones `listMatches` en `src/lib/tournaments/matches.ts` y `listRegistrations` en `src/lib/tournaments/registrations.ts` DEBEN retornar los nombres reales de equipos y jugadores mediante joins a las tablas `profiles` y `teams` (o a la tabla `tournament_registrations` con sus relaciones). Los tipos retornados DEBEN incluir campos `team_name: string | null` y `player_name: string | null`. Los componentes `TournamentStandingsPage` en `src/pages/TournamentStandingsPage.tsx` y `TournamentMatchesPage` en `src/pages/TournamentMatchesPage.tsx` DEBEN mostrar esos nombres. La RLS de las tablas `profiles` y `teams` DEBE permitir SELECT de `full_name` y `name` a cualquier usuario autenticado. Los UUIDs crudos NO DEBEN aparecer en la UI en ningún contexto de nombre de equipo o jugador.

#### Scenario 2.1.1 — Standings muestran nombres reales de equipos

Dado que existe un torneo con `id = "t1"` con 4 equipos registrados cuyos `team_name` son "Tigres FC", "Leones", "Condores" y "Aguilas",
Cuando el usuario (autenticado) navega a `/tournaments/t1/standings`,
Entonces `TournamentStandingsPage` muestra "Tigres FC", "Leones", "Condores" y "Aguilas" en la tabla de posiciones, sin UUIDs ni texto "Equipo abc123".

#### Scenario 2.1.2 — Matches muestran nombres de local y visitante

Dado que un partido en `tournament_matches` tiene `home_registration_id = "r1"` (equipo "Tigres FC") y `away_registration_id = "r2"` (equipo "Leones"),
Cuando el usuario navega a `/tournaments/t1/matches` y la función `listMatches` hace join a `tournament_registrations` → `teams.name`,
Entonces la tarjeta del partido muestra "Tigres FC vs Leones", no los UUIDs de registro.

#### Scenario 2.1.3 — RLS permite leer nombres sin ser miembro del torneo

Dado que un usuario autenticado que NO está inscrito en el torneo navega a `TournamentMatchesPage`,
Cuando `listMatches` ejecuta el join a `profiles.full_name` y `teams.name`,
Entonces la query retorna los nombres correctamente sin error `42501` de RLS.

#### Scenario 2.1.4 — Nombre nulo cuando registro es individual (no equipo)

Dado que un torneo permite inscripciones individuales y `tournament_registrations.team_id = null`,
Cuando `listRegistrations` intenta resolver el nombre del equipo,
Entonces `team_name` es `null` y la UI muestra el `player_name` (nombre del jugador individual) en su lugar.

---

### REQ-2.2: Transiciones de estado del promotor

El componente `TournamentDetailPage` en `src/pages/TournamentDetailPage.tsx` DEBE mostrar controles de acción para usuarios con `profile.is_promoter = true` que sean dueños del torneo (`tournaments.owner_id = auth.uid()`). Los botones de transición de estado DEBEN corresponder al estado actual del torneo según la columna `tournaments.status`. Las transiciones válidas son:
- `borrador` → `abierto_inscripciones` (botón "Publicar torneo")
- `abierto_inscripciones` → `cerrado_inscripciones` (botón "Cerrar inscripciones")
- `cerrado_inscripciones` → generar fixture (botón "Generar fixture")
- `cerrado_inscripciones` / con matches creados → `finalizado` (botón "Finalizar torneo")

Las transiciones destructivas ("Cerrar inscripciones" y "Finalizar torneo") DEBEN mostrar un `AlertDialog` de shadcn con confirmación antes de ejecutarse. Las funciones de transición DEBEN vivir en `src/lib/tournaments/api.ts`. El nuevo componente `src/components/tournaments/TournamentStateActions.tsx` DEBE encapsular toda la UI de acciones del promotor.

#### Scenario 2.2.1 — Promotor publica torneo en borrador

Dado que el usuario tiene `is_promoter = true` y es dueño del torneo con `status = "borrador"`,
Cuando navega a `/tournaments/:id` y hace click en "Publicar torneo",
Entonces `publishTournament(supabase, id, userId)` en `src/lib/tournaments/api.ts` actualiza `tournaments.status` a `"abierto_inscripciones"`, la UI refleja el nuevo estado sin recargar la página, y el botón "Publicar torneo" desaparece reemplazado por "Cerrar inscripciones".

#### Scenario 2.2.2 — AlertDialog previene cierre de inscripciones accidental

Dado que el torneo tiene `status = "abierto_inscripciones"` y hay 3 equipos inscriptos,
Cuando el promotor hace click en "Cerrar inscripciones",
Entonces aparece un `AlertDialog` que dice "¿Cerrar inscripciones? Esta acción no se puede deshacer. Los equipos ya inscritos quedan confirmados." con botones "Cancelar" y "Confirmar". Si el promotor hace click en "Cancelar", el estado del torneo NO cambia.

#### Scenario 2.2.3 — Jugador no ve controles del promotor

Dado que el usuario tiene `is_promoter = false` (es un jugador normal),
Cuando navega a `/tournaments/:id`,
Entonces el componente `TournamentStateActions` NO se renderiza y ningún botón de transición de estado es visible.

#### Scenario 2.2.4 — Error en transición mostrado al usuario

Dado que el servidor rechaza la transición de estado (ej. el torneo ya fue modificado por otra sesión),
Cuando `closeRegistrations(supabase, id, userId)` retorna `{ data: null, error: "Algo salió mal..." }`,
Entonces `TournamentDetailPage` muestra el mensaje de error en un toast o alert sin crash, y el estado del torneo se refresca desde Supabase.

---

### REQ-2.3: Generación de fixture round-robin

La función `generateFixture(supabase, tournamentId, format)` DEBE crearse en `src/lib/tournaments/fixtures.ts`. En esta fase, `format = "liga"` (round-robin) es el único formato completamente implementado; los formatos `"eliminatoria"` y `"fase_grupos_eliminatoria"` DEBEN retornar un error descriptivo `"Formato no soportado en esta versión."`. El algoritmo round-robin DEBE usar la rotación estándar con bye fijo para número impar de equipos (un equipo descansa por ronda). La función DEBE crear filas en la tabla `tournament_matches` para todos los partidos generados, asignando `round`, `home_registration_id`, `away_registration_id` y `fixture_order`. La función DEBE ser idempotente-guard: si ya existen matches para el torneo, DEBE retornar un error `"El fixture ya fue generado para este torneo."` sin crear duplicados.

#### Scenario 2.3.1 — Fixture round-robin con número par de equipos

Dado que el torneo `"t1"` tiene `format = "liga"`, `status = "cerrado_inscripciones"` y 4 equipos registrados con `registration_id` "r1", "r2", "r3", "r4",
Cuando el promotor hace click en "Generar fixture" y se llama `generateFixture(supabase, "t1", "liga")`,
Entonces se crean 6 partidos (C(4,2) = 6) en `tournament_matches` con todas las combinaciones únicas de equipos, agrupados en 3 rondas de 2 partidos cada una, y la función retorna `{ data: MatchRow[], error: null }`.

#### Scenario 2.3.2 — Fixture round-robin con número impar de equipos (bye)

Dado que el torneo tiene `format = "liga"` y 3 equipos registrados ("r1", "r2", "r3"),
Cuando se llama `generateFixture(supabase, id, "liga")`,
Entonces se crean 3 partidos (las 3 combinaciones posibles) distribuidos en 3 rondas, en cada ronda un equipo tiene "bye" (no juega), y ningún partido tiene `home_registration_id = away_registration_id`. El partido de "bye" NO se crea en `tournament_matches` — simplemente ese equipo no aparece en esa ronda.

#### Scenario 2.3.3 — Fixture ya existe — idempotencia

Dado que `tournament_matches` ya tiene partidos con `tournament_id = "t1"`,
Cuando el promotor intenta hacer click en "Generar fixture" nuevamente,
Entonces `generateFixture` retorna `{ data: null, error: "El fixture ya fue generado para este torneo." }` sin insertar filas adicionales, y la UI muestra ese mensaje al promotor.

#### Scenario 2.3.4 — Formato no soportado

Dado que el torneo tiene `format = "eliminatoria"`,
Cuando el promotor hace click en "Generar fixture",
Entonces `generateFixture` retorna `{ data: null, error: "Formato no soportado en esta versión." }` y la UI muestra ese mensaje.

---

### REQ-2.4: Flujo de resultados de partido

El componente `src/components/tournaments/MatchResultDialog.tsx` DEBE permitir al promotor ingresar `home_score`, `away_score` y cambiar el `status` del partido a `"finalizado"` o `"w_o"`. El dialog DEBE validar que los scores sean números enteros no negativos. La función `recordResult` en `src/lib/tournaments/matches.ts` ya existe y DEBE usarse. Tras guardar el resultado, `TournamentMatchesPage` DEBE revalidar la query de standings (invalidar `queryKey` correspondiente de TanStack Query). El promotor DEBE poder acceder al dialog desde la tarjeta de cada partido en `TournamentMatchesPage`.

#### Scenario 2.4.1 — Promotor registra resultado de partido

Dado que el promotor está en `/tournaments/t1/matches` y existe el partido "Tigres FC vs Leones" con `status = "programado"`,
Cuando hace click en "Marcar resultado", ingresa `home_score = 2`, `away_score = 1` y confirma,
Entonces `recordResult(supabase, { matchId, homeScore: 2, awayScore: 1, status: "finalizado" })` actualiza la fila en `tournament_matches`, la tarjeta muestra "Tigres FC 2 - 1 Leones", y el query de standings se invalida para reflejar los nuevos puntos.

#### Scenario 2.4.2 — Validación de score negativo

Dado que el promotor ingresa `home_score = -1` en el dialog de resultado,
Cuando intenta confirmar,
Entonces el formulario muestra el error "El marcador no puede ser negativo" inline bajo el campo y NO llama a `recordResult`.

#### Scenario 2.4.3 — Jugador no puede marcar resultados

Dado que un usuario con `is_promoter = false` visita `TournamentMatchesPage`,
Cuando el componente renderiza las tarjetas de partidos,
Entonces el botón "Marcar resultado" NO aparece en ninguna tarjeta (control renderizado condicionalmente por `is_promoter`).

---

## Phase 3 — Player Profile Completion

### REQ-3.1: Edición de perfil morfológico

El formulario `src/components/profile/MorphoForm.tsx` DEBE permitir editar los campos de la tabla `profile_morpho`: `height_m` (número decimal en metros, ej. 1.75), `weight_kg` (número decimal, ej. 72.5), `wingspan_m` (número decimal, nullable), `laterality` (enum `"diestro" | "zurdo" | "ambos"` — tipo `Laterality` de `src/lib/types/db.ts`), `somatotype` (enum `"ectomorfo" | "mesomorfo" | "endomorfo" | "mixto"` — tipo `Somatotype`). La función `updateMorpho(supabase, userId, data): Promise<{ data: ProfileMorpho | null, error: string | null }>` DEBE crearse en `src/lib/profiles/api.ts` y hacer upsert a la tabla `profile_morpho` (PK: `user_id`). El formulario DEBE integrarse en `src/pages/ProfileEditPage.tsx` como un accordion o tab. Al guardar exitosamente, se muestra un toast de confirmación.

#### Scenario 3.1.1 — Jugador edita altura y guarda

Dado que el jugador autenticado está en `/profile/edit`, sección "Morfología",
Cuando ingresa `height_m = 1.80`, `weight_kg = 75`, `laterality = "diestro"`, `somatotype = "mesomorfo"` y hace click en "Guardar morfología",
Entonces `updateMorpho(supabase, userId, { height_m: 1.80, weight_kg: 75, laterality: "diestro", somatotype: "mesomorfo" })` ejecuta upsert en `profile_morpho`, retorna `{ data: ProfileMorpho, error: null }`, y aparece un toast "Morfología actualizada".

#### Scenario 3.1.2 — Validación de altura fuera de rango

Dado que el jugador ingresa `height_m = 3.5` (valor irreal),
Cuando intenta guardar,
Entonces el formulario muestra el error "Altura debe estar entre 1.0 y 2.5 metros" bajo el campo y NO llama a `updateMorpho`.

#### Scenario 3.1.3 — Carga inicial de datos existentes

Dado que el jugador ya tiene datos en `profile_morpho` con `height_m = 1.75`, `weight_kg = 70`,
Cuando abre la sección "Morfología" en `ProfileEditPage`,
Entonces los campos del `MorphoForm` muestran los valores `1.75` y `70` precargados desde `updateMorpho` (la función de lectura correspondiente).

---

### REQ-3.2: Edición de perfil técnico-futbolístico

El formulario `src/components/profile/TechnicalFootballForm.tsx` DEBE permitir editar los campos de `profile_technical_football`: `position` (enum `FootballPosition`: `"arquero" | "defensa" | "mediocampista" | "delantero"`), `dominant_foot` (enum `DominantFoot`: `"derecho" | "izquierdo" | "ambos"`), `performance_notes` (textarea, nullable, máx. 500 caracteres), `tactical_role_notes` (textarea, nullable, máx. 500 caracteres). La función `updateTechnicalFootball(supabase, userId, data)` DEBE crearse en `src/lib/profiles/api.ts`. NOTA: `preferred_foot` ya existe en la tabla `profiles` — el campo `dominant_foot` de `profile_technical_football` es específico del módulo técnico y puede ser igual; documentar la diferencia en comentario de código para evitar confusión.

El formulario de condicional `src/components/profile/ConditionalForm.tsx` DEBE permitir editar `ProfileConditional`: `strength_tags` (multi-select de `SkillTag` con `category = "strength"`), `strength_notes` (textarea), `speed_tags`, `speed_notes`, `endurance_tags`, `endurance_notes`, `flexibility_tags`, `flexibility_notes`. La función `updateConditional(supabase, userId, data)` DEBE crearse en `src/lib/profiles/api.ts`.

#### Scenario 3.2.1 — Jugador actualiza posición y pierna hábil

Dado que el jugador está en la sección "Técnico Futbolístico" de `ProfileEditPage`,
Cuando selecciona `position = "mediocampista"` y `dominant_foot = "derecho"` y guarda,
Entonces `updateTechnicalFootball(supabase, userId, { position: "mediocampista", dominant_foot: "derecho", ... })` hace upsert en `profile_technical_football` y retorna `{ data: ProfileTechnicalFootball, error: null }`.

#### Scenario 3.2.2 — Notas con límite de caracteres

Dado que el jugador escribe 501 caracteres en el campo `performance_notes`,
Cuando el formulario valida antes de submit,
Entonces muestra el error "Máximo 500 caracteres" bajo el textarea y NO llama a `updateTechnicalFootball`.

#### Scenario 3.2.3 — Jugador actualiza perfil condicional con tags

Dado que el jugador selecciona `strength_tags = ["explosivo", "resistente"]` y escribe `strength_notes = "Trabajo de pesas 3 veces por semana"`,
Cuando guarda el formulario condicional,
Entonces `updateConditional(supabase, userId, { strength_tags: ["explosivo", "resistente"], strength_notes: "...", ... })` hace upsert en `profile_conditional` y los tags se persisten como `text[]` en la tabla.

#### Scenario 3.2.4 — Error de red al guardar condicional

Dado que la conexión falla cuando el jugador intenta guardar el perfil condicional,
Cuando `updateConditional` retorna `{ data: null, error: "Algo salió mal. Probá de nuevo en un momento." }`,
Entonces el formulario muestra ese mensaje y el botón "Guardar" vuelve a estar habilitado para reintentar.

---

### REQ-3.3: Controles de visibilidad por bloque

La función `updateVisibility(supabase, userId, block, level)` DEBE crearse en `src/lib/profiles/api.ts`, donde `block` es `"morpho" | "conditional" | "technical_football"` y `level` es `VisibilityLevel` (`"publico" | "promotores" | "privado"` de `src/lib/types/db.ts`). La visibilidad DEBE almacenarse en la columna `visibility` de cada tabla de bloque (`profile_morpho.visibility`, `profile_conditional.visibility`, `profile_technical_football.visibility`). El componente `src/components/profile/VisibilityToggle.tsx` DEBE renderizar un `Select` de shadcn con las tres opciones usando `VISIBILITY_LEVELS` de `src/lib/types/db.ts`. Los valores por defecto al crear un bloque nuevo DEBEN ser: morfología → `"promotores"`, condicional → `"promotores"`, técnico → `"publico"`. Las políticas RLS en Supabase DEBEN reforzar la visibilidad: un SELECT en `profile_morpho` solo es permitido si `visibility = 'publico'` OR (`visibility = 'promotores'` AND el `auth.uid()` tiene `is_promoter = true` en `profiles`) OR `auth.uid() = user_id`.

#### Scenario 3.3.1 — Jugador cambia visibilidad de morfología a privado

Dado que el jugador está en la sección "Morfología" de `ProfileEditPage` y el `VisibilityToggle` muestra "Promotores" (valor actual),
Cuando selecciona "Privado" en el `Select`,
Entonces `updateVisibility(supabase, userId, "morpho", "privado")` actualiza `profile_morpho.visibility = "privado"` para ese `user_id`, y el selector muestra "Privado" confirmando el cambio.

#### Scenario 3.3.2 — Visibilidad por defecto al crear bloque nuevo

Dado que un jugador guarda por primera vez su perfil morfológico (fila no existe en `profile_morpho`),
Cuando `updateMorpho` hace upsert con los datos del formulario,
Entonces la fila creada en `profile_morpho` tiene `visibility = "promotores"` (valor por defecto insertado automáticamente si no se especifica, ya sea por DEFAULT en DB o por la función de API).

#### Scenario 3.3.3 — Jugador no puede cambiar visibilidad de otro usuario

Dado que un usuario malintencionado llama directamente a la API de Supabase intentando actualizar `profile_morpho.visibility` de otro `user_id`,
Cuando la política RLS evalúa el UPDATE,
Entonces la operación es rechazada con error `42501` porque la policy de escritura restringe a `auth.uid() = user_id`.

---

### REQ-3.4: Visualización respetando visibilidad

`src/pages/ProfilePage.tsx` y/o `src/pages/PublicProfilePage.tsx` DEBEN mostrar u ocultar cada bloque del perfil deportivo según la combinación de `visibility` del bloque y el rol del visitante. Las reglas de visualización son:
- `visibility = "publico"`: visible para todos (incluyendo no autenticados).
- `visibility = "promotores"`: visible para el dueño del perfil Y para usuarios con `is_promoter = true`.
- `visibility = "privado"`: visible solo para el dueño del perfil.

La determinación del `viewer_role` DEBE hacerse en cliente comparando `auth.uid()` con el `user_id` del perfil visitado y el flag `is_promoter` del perfil del visitante. La RLS en Supabase es la barrera de seguridad real; el filtrado en cliente es solo para UX (no mostrar secciones que la query ya no retornará).

#### Scenario 3.4.1 — Promotor ve bloque de morfología con visibilidad "promotores"

Dado que el bloque morfológico del jugador "JuanFC" tiene `visibility = "promotores"`,
Y el visitante está autenticado con `is_promoter = true`,
Cuando el visitante navega a `/players/juanfc` (ruta de perfil público),
Entonces la sección "Morfología" con los datos de altura, peso y demás se renderiza en el perfil.

#### Scenario 3.4.2 — Jugador normal no ve bloque de morfología con visibilidad "promotores"

Dado que el bloque morfológico de "JuanFC" tiene `visibility = "promotores"`,
Y el visitante está autenticado con `is_promoter = false` y `is_player = true`,
Cuando navega al perfil de "JuanFC",
Entonces la sección "Morfología" no aparece (ni un placeholder), y la query de Supabase tampoco retorna datos por RLS.

#### Scenario 3.4.3 — Dueño del perfil ve todos sus bloques sin importar visibilidad

Dado que el jugador "JuanFC" tiene su propio bloque de morfología con `visibility = "privado"`,
Cuando "JuanFC" navega a su propio perfil `/profile`,
Entonces ve su sección de Morfología completa (porque `auth.uid() = user_id` permite lectura por RLS).

#### Scenario 3.4.4 — Usuario no autenticado solo ve bloques públicos

Dado que el perfil de "JuanFC" tiene morfología con `visibility = "privado"` y técnico con `visibility = "publico"`,
Cuando un usuario no autenticado accede a la página pública del perfil,
Entonces solo la sección técnica se muestra, morfología no aparece, y no hay errores en consola.

---

## Phase 4 — Court Owner: Recurring Bookings

### REQ-4.1: CRUD de reservas recurrentes

El módulo `src/lib/canchas/recurring-api.ts` DEBE crearse con las siguientes funciones exportadas (tipadas con el tipo `RecurringBooking` de `src/lib/types/db.ts`):

```typescript
export async function createRecurring(
  supabase: SupabaseClient,
  input: RecurringBookingInput,
  userId: string,
): Promise<{ data: RecurringBooking | null; error: string | null }>

export async function updateRecurring(
  supabase: SupabaseClient,
  id: string,
  input: Partial<RecurringBookingInput>,
): Promise<{ data: RecurringBooking | null; error: string | null }>

export async function cancelRecurring(
  supabase: SupabaseClient,
  id: string,
): Promise<{ data: RecurringBooking | null; error: string | null }>

export async function listRecurringByCancha(
  supabase: SupabaseClient,
  canchaId: string,
): Promise<{ data: RecurringBooking[] | null; error: string | null }>

export function expandToBookings(
  recurring: RecurringBooking,
  exceptions: RecurringException[],
  fromDate: string,
  toDate: string,
): ExpandedOccurrence[]
```

Donde `RecurringBookingInput` es `{ cancha_id, user_id, day_of_week, start_time, end_time, start_date, end_date?, price_per_session, notes?, frequency }`. La función `expandToBookings` es una función pura (sin llamadas a Supabase) que calcula las ocurrencias en el rango `[fromDate, toDate]` y aplica las excepciones.

La tabla `recurring_bookings` en Supabase DEBE tener las columnas: `id`, `cancha_id` (FK a `canchas`), `user_id` (FK a `profiles`), `day_of_week` (int 0-6), `start_time` (time), `end_time` (time), `start_date` (date), `end_date` (date, nullable = indefinido), `status` (`RecurringBookingStatus`: `"pendiente" | "confirmada" | "cancelada" | "pausada"`), `price_per_session` (numeric), `frequency` (`"weekly" | "biweekly" | "monthly"`), `notes` (text, nullable), `confirmed_at` (timestamptz, nullable), `created_at`, `updated_at`.

La tabla `recurring_exceptions` en Supabase DEBE tener: `id`, `recurring_id` (FK a `recurring_bookings`), `original_date` (date), `action` (`"cancelled" | "modified"`), `new_start` (time, nullable), `new_end` (time, nullable), `new_price` (numeric, nullable), `notes` (text, nullable), `created_at`.

Las políticas RLS DEBEN permitir lectura y escritura en `recurring_bookings` y `recurring_exceptions` únicamente al dueño de la cancha (`canchas.owner_id = auth.uid()`).

#### Scenario 4.1.1 — Creación de reserva recurrente semanal

Dado que el dueño de cancha está autenticado y tiene una cancha con `id = "c1"`,
Cuando llama a `createRecurring(supabase, { cancha_id: "c1", user_id: "clienteId", day_of_week: 2, start_time: "20:00", end_time: "21:00", start_date: "2026-05-13", price_per_session: 80000, frequency: "weekly" }, ownerId)`,
Entonces se crea una fila en `recurring_bookings` con `status = "pendiente"`, `frequency = "weekly"`, y la función retorna `{ data: RecurringBooking, error: null }`.

#### Scenario 4.1.2 — Cancelación de serie recurrente

Dado que existe `recurring_bookings.id = "rb1"` con `status = "confirmada"`,
Cuando el dueño llama a `cancelRecurring(supabase, "rb1")`,
Entonces la fila se actualiza a `status = "cancelada"` y retorna `{ data: RecurringBooking { status: "cancelada" }, error: null }`.

#### Scenario 4.1.3 — RLS bloquea acceso de otro usuario

Dado que el dueño de cancha B intenta leer las reservas recurrentes de la cancha del dueño A,
Cuando llama a `listRecurringByCancha(supabase, canchaDueñoA)`,
Entonces la query retorna `[]` (RLS filtra) o un error `42501`, sin exponer datos de otra cancha.

#### Scenario 4.1.4 — Validación de solapamiento al crear

Dado que ya existe una reserva recurrente semanal los martes 20:00–21:00 en la cancha `"c1"`,
Cuando el dueño intenta crear otra reserva recurrente los martes 20:30–21:30 en la misma cancha,
Entonces la UI (antes de llamar a la API) detecta el solapamiento mediante `expandToBookings` y muestra el error "El horario se solapa con una serie recurrente existente" sin crear la fila en DB.

---

### REQ-4.2: Render de recurrencias en agenda

La función `expandToBookings` DEBE generar un `ExpandedOccurrence[]` donde `ExpandedOccurrence = { date: string; start_time: string; end_time: string; price: number; isRecurring: true; recurringId: string; isException: boolean }`. El hook `useAgendaData` en `src/hooks/useAgendaData.ts` DEBE combinar las ocurrencias expandidas con los bookings ad-hoc de `cancha_bookings` al construir el calendario de la agenda. `CanchaAgendaPage` DEBE distinguir visualmente las ocurrencias recurrentes de las ad-hoc con un ícono (ej. el ícono de `RefreshCw` de `lucide-react`). El rango de expansión por defecto DEBE ser la semana visible en la agenda (semana actualmente seleccionada) ± 1 semana.

#### Scenario 4.2.1 — Ocurrencias recurrentes aparecen en agenda

Dado que existe una `RecurringBooking` semanal los martes con `start_date = "2026-05-06"` y `end_date = null`,
Cuando el dueño abre `CanchaAgendaPage` mostrando la semana del 11 al 17 de mayo 2026,
Entonces `expandToBookings(recurring, exceptions, "2026-05-11", "2026-05-17")` genera una ocurrencia para el martes 2026-05-13, y esa ocurrencia aparece en la agenda con el ícono de recurrencia.

#### Scenario 4.2.2 — Excepción de cancelación elimina ocurrencia del render

Dado que existe una `RecurringException` con `recurring_id = "rb1"`, `original_date = "2026-05-13"`, `action = "cancelled"`,
Cuando `expandToBookings` procesa el rango que incluye el 13 de mayo,
Entonces la ocurrencia del 13 de mayo NO aparece en el arreglo retornado (fue cancelada puntualmente).

#### Scenario 4.2.3 — Distinción visual entre reserva ad-hoc y recurrente

Dado que la agenda de un día tiene un booking ad-hoc (de `cancha_bookings`) y una ocurrencia recurrente (expandida),
Cuando `CanchaAgendaPage` renderiza ese día,
Entonces la ocurrencia recurrente muestra el ícono `RefreshCw` y la ad-hoc no lo muestra, permitiendo distinguirlas visualmente.

---

### REQ-4.3: Edición por ocurrencia vs serie

Cuando el dueño hace click en una ocurrencia recurrente en la agenda, DEBE aparecer un menú o dialog con dos opciones: "Editar esta ocurrencia" y "Editar toda la serie". "Editar esta ocurrencia" DEBE crear una fila en `recurring_exceptions` con `action = "modified"` y los campos modificados (`new_start`, `new_end`, `new_price`). "Editar toda la serie" DEBE llamar a `updateRecurring(supabase, recurringId, input)` que actualiza la fila principal en `recurring_bookings`.

#### Scenario 4.3.1 — Editar solo una ocurrencia

Dado que el dueño hace click en la ocurrencia recurrente del martes 13/05/2026 y selecciona "Editar esta ocurrencia",
Cuando cambia el horario a 21:00–22:00 y confirma,
Entonces se crea una fila en `recurring_exceptions` con `recurring_id = "rb1"`, `original_date = "2026-05-13"`, `action = "modified"`, `new_start = "21:00"`, `new_end = "22:00"`. El resto de ocurrencias futuras mantienen el horario original.

#### Scenario 4.3.2 — Editar toda la serie afecta ocurrencias futuras

Dado que el dueño selecciona "Editar toda la serie" para una recurrencia semanal los martes 20:00–21:00,
Cuando cambia el horario a 19:00–20:00 y confirma,
Entonces `updateRecurring(supabase, "rb1", { start_time: "19:00", end_time: "20:00" })` actualiza la fila en `recurring_bookings`, y todas las ocurrencias futuras expandidas por `expandToBookings` muestran el horario 19:00–20:00 (excepto las que ya tienen excepciones puntuales).

---

### REQ-4.4: Cancelación de recurrencia

La cancelación de una serie completa DEBE actualizar `recurring_bookings.status = "cancelada"`. La cancelación puntual de una ocurrencia DEBE crear una fila en `recurring_exceptions` con `action = "cancelled"`. Ambas acciones DEBEN mostrarse con confirmación vía `AlertDialog`. Ocurrencias pasadas (fechas anteriores a hoy) DEBEN mantenerse visibles en historial y no ser afectadas por la cancelación de la serie.

#### Scenario 4.4.1 — Cancelación puntual de una ocurrencia futura

Dado que el dueño hace click en la ocurrencia del 20/05/2026 y selecciona "Cancelar esta ocurrencia",
Cuando confirma en el `AlertDialog`,
Entonces se inserta una fila en `recurring_exceptions` con `original_date = "2026-05-20"`, `action = "cancelled"`, y la ocurrencia del 20 de mayo desaparece de la agenda. Las demás ocurrencias futuras permanecen.

#### Scenario 4.4.2 — Cancelación de serie completa no elimina historial pasado

Dado que una serie tiene ocurrencias desde mayo hasta agosto 2026 y hoy es 9 de mayo 2026,
Cuando el dueño cancela la serie completa,
Entonces `recurring_bookings.status = "cancelada"`, las ocurrencias futuras (a partir del 10 de mayo) desaparecen de la agenda, pero las ocurrencias pasadas (antes del 9 de mayo) siguen visibles en la vista de historial.

---

### REQ-4.5: Gráfico de revenue

El componente `src/components/canchas/RevenueChart.tsx` DEBE renderizar un gráfico de barras o líneas usando `recharts` (ya instalado en el proyecto como dependencia de shadcn). El gráfico DEBE mostrar dos series: "Revenue cobrado" (bookings ad-hoc con `status = "confirmada"`) y "Revenue programado" (ocurrencias recurrentes activas en el mismo rango). La función de datos para el gráfico DEBE vivir en `src/lib/canchas/stats-api.ts`. `CanchaStatsPage` en `src/pages/CanchaStatsPage.tsx` DEBE integrar `RevenueChart` reemplazando la tabla cruda actual. El gráfico DEBE funcionar correctamente a 375px de ancho (mobile-first).

#### Scenario 4.5.1 — Gráfico renderiza correctamente con datos reales

Dado que el dueño tiene 3 bookings confirmados en mayo 2026 (revenue total $240.000) y 4 ocurrencias recurrentes programadas en mayo (revenue programado $320.000),
Cuando navega a `CanchaStatsPage`,
Entonces `RevenueChart` muestra dos barras para mayo: una de $240.000 y otra de $320.000, con leyenda visible, y la tabla cruda anterior ya no se muestra.

#### Scenario 4.5.2 — Estado vacío del gráfico

Dado que el dueño no tiene bookings ni recurrencias en el rango seleccionado,
Cuando `RevenueChart` recibe datos vacíos,
Entonces muestra el estado vacío del componente recharts (eje sin barras) o un mensaje "Sin datos en este período", sin crash de JavaScript.

---

## Phase 5 — Pagination & Polish

### REQ-5.1: Paginación cursor-based en feed

`FeedPage` en `src/pages/FeedPage.tsx` DEBE implementar infinite scroll usando `useInfiniteQuery` de TanStack Query. La función de API en `src/lib/feed/api.ts` DEBE aceptar un parámetro `cursor?: string` (el `created_at` del último item, en formato ISO) y un `limit: number` (defecto: 20). La query a Supabase DEBE usar `.lt("created_at", cursor)` para paginación cursor-based, ordenando por `created_at DESC`. El hook `useFeedData` DEBE exponer `fetchNextPage`, `hasNextPage` e `isFetchingNextPage`. Un indicador de carga (`Spinner` o `Skeleton`) DEBE aparecer al final de la lista cuando `isFetchingNextPage = true`. Si `hasNextPage = false`, DEBE mostrarse el mensaje "Ya viste todo el feed".

Mismo patrón DEBE aplicarse a:
- `MatchesListPage` / `MisPartidosPage` — cursor: `starts_at`
- `TournamentsPage` — cursor: `created_at`
- `ChatListPage` — cursor: `last_message_at`
- `CanchaAgendaPage` — rango visible ±1 semana (no infinite scroll sino lazy range expansion)

#### Scenario 5.1.1 — Carga inicial del feed con 20 posts

Dado que la base de datos tiene 150 posts ordenados por `created_at DESC`,
Cuando el usuario navega a `FeedPage` por primera vez,
Entonces `useInfiniteQuery` carga los primeros 20 posts, `hasNextPage = true`, y el usuario puede hacer scroll para ver más.

#### Scenario 5.1.2 — Carga de siguiente página al llegar al final del scroll

Dado que el usuario está en el post 20 del feed (último cargado),
Cuando hace scroll hasta el final y el componente detecta el elemento sentinel visible,
Entonces se llama `fetchNextPage()`, los posts 21-40 se cargan y se agregan a la lista, y el spinner desaparece al completarse la carga.

#### Scenario 5.1.3 — Feed completamente cargado

Dado que el usuario ya vio todos los 150 posts del feed,
Cuando `hasNextPage = false`,
Entonces aparece el mensaje "Ya viste todo el feed" al final de la lista y no se hacen más llamadas a Supabase.

#### Scenario 5.1.4 — Error en carga de página siguiente

Dado que falla la red al intentar cargar la página 2 del feed,
Cuando `fetchNextPage()` retorna error,
Entonces TanStack Query retorna `isError = true`, el componente muestra un botón "Reintentar" y el error de red se logea en consola mediante `mapDbError`.

---

### REQ-5.2: Skeletons durante carga

El directorio `src/components/ui/skeletons/` DEBE crearse con componentes de skeleton reutilizables. DEBEN crearse al menos los siguientes: `MatchCardSkeleton.tsx`, `TournamentCardSkeleton.tsx`, `ProfileSkeleton.tsx`, `FeedPostSkeleton.tsx`, `AgendaDaySkeleton.tsx`, `BookingCardSkeleton.tsx`. Todos los skeletons DEBEN usar el componente `Skeleton` de shadcn/ui (`@/components/ui/skeleton`). Cada página principal DEBE mostrar el skeleton correspondiente cuando `isLoading = true` de TanStack Query. Ninguna página MUST mostrar una pantalla en blanco durante la carga inicial.

#### Scenario 5.2.1 — Skeleton en FeedPage durante carga inicial

Dado que el usuario navega a `/feed` y la query `useFeedData` tiene `isLoading = true`,
Cuando el componente renderiza,
Entonces se muestran 3 instancias de `FeedPostSkeleton` (placeholder animado) en lugar de una pantalla en blanco, y el skeleton desaparece cuando los datos llegan.

#### Scenario 5.2.2 — Skeleton en red lenta (Slow 3G)

Dado que el usuario navega a `TournamentsPage` con la red simulada en "Slow 3G" en DevTools,
Cuando `isLoading = true` durante la carga inicial,
Entonces `TournamentCardSkeleton` es visible en pantalla en los primeros 100ms, sin pantalla en blanco.

#### Scenario 5.2.3 — Sin skeleton durante refetch en segundo plano

Dado que `TournamentsPage` ya tiene datos cargados y TanStack Query hace un refetch en segundo plano (ej. al volver a la ventana),
Cuando `isLoading = false` pero `isFetching = true`,
Entonces el skeleton NO aparece (los datos ya están renderizados), solo puede mostrarse un indicador sutil de actualización si se desea.

---

### REQ-5.3: Empty states con CTA

El componente `src/components/ui/EmptyState.tsx` DEBE crearse con las props: `icon?: React.ReactNode`, `title: string`, `description?: string`, `cta?: { label: string; href?: string; onClick?: () => void }`. Cada lista vacía en la plataforma DEBE usar `EmptyState`. Los CTAs DEBEN ser contextuales:
- `MisPartidosPage` vacío → "No tenés partidos. Crear uno →" (link a `/matches/new`)
- `TournamentsPage` vacío → "No hay torneos disponibles. Creá el tuyo →" (link a `/tournaments/new`, solo si `is_promoter = true`)
- `CanchaAgendaPage` sin bookings en el día → "Sin reservas hoy. Compartí tu cancha →" (link a la cancha pública)
- `FeedPage` vacío → "El feed está vacío. Seguí jugadores o canchas →"
- `ChatListPage` vacío → "Sin conversaciones aún. Reservá una cancha para comenzar →"

#### Scenario 5.3.1 — Empty state en lista de partidos de cuenta nueva

Dado que un usuario recién registrado con `is_player = true` no tiene partidos en `match_participants`,
Cuando navega a `MisPartidosPage`,
Entonces el componente `EmptyState` se renderiza con `title = "No tenés partidos"`, `description = "Unite a uno o creá el tuyo"` y un botón "Crear partido" que navega a `/matches/new`.

#### Scenario 5.3.2 — Empty state de torneos sin CTA de creación para jugadores

Dado que no existen torneos en la base de datos y el usuario tiene `is_promoter = false`,
Cuando navega a `TournamentsPage`,
Entonces `EmptyState` muestra "No hay torneos disponibles" sin el CTA de "Creá el tuyo" (ese CTA solo se muestra para promotores).

#### Scenario 5.3.3 — Empty state no aparece durante carga

Dado que `TournamentsPage` tiene `isLoading = true`,
Cuando el componente renderiza,
Entonces el `EmptyState` NO se muestra (se muestran skeletons en su lugar). El `EmptyState` solo aparece cuando `isLoading = false` y `data.length === 0`.

---

### REQ-5.4: Error boundaries

El componente `src/components/ErrorBoundary.tsx` DEBE crearse como un React Error Boundary de clase (o usando `react-error-boundary` si ya está instalado). `src/App.tsx` DEBE envolver cada ruta principal con `<ErrorBoundary>`. El fallback DEBE mostrar un mensaje amigable en español: "Algo salió mal en esta pantalla. Recargá la página o volvé al inicio." con un botón "Ir al inicio" que navega a `/`. Los errores capturados DEBEN loguearse en `console.error` con el stack completo. Los errores boundary NO DEBEN romper rutas hermanas (cada ruta tiene su propio boundary).

#### Scenario 5.4.1 — Error boundary captura excepción no controlada

Dado que un componente en `TournamentDetailPage` lanza un error de JavaScript no controlado (ej. `TypeError: Cannot read properties of null`),
Cuando el usuario navega a esa ruta,
Entonces el `ErrorBoundary` captura el error, muestra el fallback con el mensaje amigable y el botón "Ir al inicio", y las demás rutas (ej. `FeedPage`) siguen funcionando normalmente.

#### Scenario 5.4.2 — Botón "Ir al inicio" desde error boundary

Dado que el `ErrorBoundary` está mostrando el fallback en `TournamentDetailPage`,
Cuando el usuario hace click en "Ir al inicio",
Entonces el router navega a `/feed` (o la ruta home del usuario) y el error boundary se resetea.

#### Scenario 5.4.3 — Error boundary no afecta la navegación global

Dado que `TournamentDetailPage` está en error y muestra el fallback,
Cuando el usuario hace click en el ícono de "Feed" en el `BottomNav`,
Entonces navega a `FeedPage` correctamente y el error boundary de Tournaments ya no es visible.

---

## Data Contracts

### API Function Signatures

```typescript
// src/lib/feed/api.ts
export async function getFeedPosts(
  supabase: SupabaseClient,
  options: { cursor?: string; limit?: number },
): Promise<{ data: FeedPost[] | null; error: string | null; nextCursor: string | null }>

// src/lib/matches/api.ts
export async function getMatchesByFilters(
  supabase: SupabaseClient,
  filters: { city?: string; skillLevel?: SkillLevel; cursor?: string; limit?: number },
): Promise<{ data: Match[] | null; error: string | null; nextCursor: string | null }>

// src/lib/profiles/api.ts
export async function updateMorpho(
  supabase: SupabaseClient,
  userId: string,
  data: Partial<Omit<ProfileMorpho, "user_id" | "created_at" | "updated_at">>,
): Promise<{ data: ProfileMorpho | null; error: string | null }>

export async function updateConditional(
  supabase: SupabaseClient,
  userId: string,
  data: Partial<Omit<ProfileConditional, "user_id" | "created_at" | "updated_at">>,
): Promise<{ data: ProfileConditional | null; error: string | null }>

export async function updateTechnicalFootball(
  supabase: SupabaseClient,
  userId: string,
  data: Partial<Omit<ProfileTechnicalFootball, "user_id" | "created_at" | "updated_at">>,
): Promise<{ data: ProfileTechnicalFootball | null; error: string | null }>

export async function updateVisibility(
  supabase: SupabaseClient,
  userId: string,
  block: "morpho" | "conditional" | "technical_football",
  level: VisibilityLevel,
): Promise<{ data: null; error: string | null }>

export async function getProfileBlocks(
  supabase: SupabaseClient,
  userId: string,
): Promise<{
  data: {
    morpho: ProfileMorpho | null;
    conditional: ProfileConditional | null;
    technical: ProfileTechnicalFootball | null;
  } | null;
  error: string | null;
}>

// src/lib/tournaments/api.ts (extensiones)
export async function closeRegistrations(
  supabase: SupabaseClient,
  id: string,
  userId: string,
): Promise<{ data: TournamentRow | null; error: string | null }>

export async function finalizeTournament(
  supabase: SupabaseClient,
  id: string,
  userId: string,
): Promise<{ data: TournamentRow | null; error: string | null }>

// src/lib/tournaments/fixtures.ts
export async function generateFixture(
  supabase: SupabaseClient,
  tournamentId: string,
  format: "liga" | "eliminatoria" | "fase_grupos_eliminatoria",
): Promise<{ data: MatchRow[] | null; error: string | null }>

// src/lib/tournaments/matches.ts (extensiones de tipo)
export type MatchWithNames = MatchRow & {
  home_team_name: string | null;
  away_team_name: string | null;
  home_player_name: string | null;
  away_player_name: string | null;
}

export async function listMatchesWithNames(
  supabase: SupabaseClient,
  tournamentId: string,
): Promise<{ data: MatchWithNames[] | null; error: string | null }>

// src/lib/tournaments/registrations.ts (extensiones de tipo)
export type RegistrationWithNames = RegistrationRow & {
  team_name: string | null;
  player_name: string | null;
}

export async function listRegistrationsWithNames(
  supabase: SupabaseClient,
  tournamentId: string,
): Promise<{ data: RegistrationWithNames[] | null; error: string | null }>

// src/lib/canchas/recurring-api.ts
export type RecurringBookingInput = {
  cancha_id: string;
  user_id: string;
  day_of_week: number; // 0 = domingo, 6 = sábado
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
  start_date: string;  // "YYYY-MM-DD"
  end_date?: string | null;
  price_per_session: number;
  frequency: "weekly" | "biweekly" | "monthly";
  notes?: string | null;
}

export type RecurringException = {
  id: string;
  recurring_id: string;
  original_date: string;
  action: "cancelled" | "modified";
  new_start: string | null;
  new_end: string | null;
  new_price: number | null;
  notes: string | null;
  created_at: string;
}

export type ExpandedOccurrence = {
  date: string;
  start_time: string;
  end_time: string;
  price: number;
  isRecurring: true;
  recurringId: string;
  isException: boolean;
}

export async function createRecurring(
  supabase: SupabaseClient,
  input: RecurringBookingInput,
  userId: string,
): Promise<{ data: RecurringBooking | null; error: string | null }>

export async function updateRecurring(
  supabase: SupabaseClient,
  id: string,
  input: Partial<RecurringBookingInput>,
): Promise<{ data: RecurringBooking | null; error: string | null }>

export async function cancelRecurring(
  supabase: SupabaseClient,
  id: string,
): Promise<{ data: RecurringBooking | null; error: string | null }>

export async function listRecurringByCancha(
  supabase: SupabaseClient,
  canchaId: string,
): Promise<{ data: RecurringBooking[] | null; error: string | null }>

export async function listExceptionsByRecurring(
  supabase: SupabaseClient,
  recurringId: string,
): Promise<{ data: RecurringException[] | null; error: string | null }>

export async function createException(
  supabase: SupabaseClient,
  input: Omit<RecurringException, "id" | "created_at">,
): Promise<{ data: RecurringException | null; error: string | null }>

export function expandToBookings(
  recurring: RecurringBooking,
  exceptions: RecurringException[],
  fromDate: string,
  toDate: string,
): ExpandedOccurrence[]
```

### DB Schema Additions

```sql
-- Tabla: profile_morpho
-- Confirmar existencia antes de crear. PK = user_id (one-to-one con profiles)
CREATE TABLE IF NOT EXISTS profile_morpho (
  user_id        uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  height_m       numeric(4,2),        -- ej. 1.75
  weight_kg      numeric(5,2),        -- ej. 72.50
  wingspan_m     numeric(4,2),        -- nullable
  laterality     text CHECK (laterality IN ('diestro','zurdo','ambos')),
  somatotype     text CHECK (somatotype IN ('ectomorfo','mesomorfo','endomorfo','mixto')),
  visibility     text NOT NULL DEFAULT 'promotores'
                   CHECK (visibility IN ('publico','promotores','privado')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Tabla: profile_conditional
CREATE TABLE IF NOT EXISTS profile_conditional (
  user_id          uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  strength_tags    text[] NOT NULL DEFAULT '{}',
  strength_notes   text,
  speed_tags       text[] NOT NULL DEFAULT '{}',
  speed_notes      text,
  endurance_tags   text[] NOT NULL DEFAULT '{}',
  endurance_notes  text,
  flexibility_tags text[] NOT NULL DEFAULT '{}',
  flexibility_notes text,
  visibility       text NOT NULL DEFAULT 'promotores'
                     CHECK (visibility IN ('publico','promotores','privado')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Tabla: profile_technical_football
CREATE TABLE IF NOT EXISTS profile_technical_football (
  user_id              uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  position             text CHECK (position IN ('arquero','defensa','mediocampista','delantero')),
  dominant_foot        text CHECK (dominant_foot IN ('derecho','izquierdo','ambos')),
  performance_notes    text,           -- máx. 500 chars enforced en cliente
  tactical_role_notes  text,           -- máx. 500 chars enforced en cliente
  visibility           text NOT NULL DEFAULT 'publico'
                         CHECK (visibility IN ('publico','promotores','privado')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Tabla: recurring_bookings
-- Verificar existencia del tipo RecurringBooking en db.ts (ya definido)
CREATE TABLE IF NOT EXISTS recurring_bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id         uuid NOT NULL REFERENCES canchas(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id),
  day_of_week       int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time        time NOT NULL,
  end_time          time NOT NULL,
  start_date        date NOT NULL,
  end_date          date,              -- null = indefinido
  status            text NOT NULL DEFAULT 'pendiente'
                      CHECK (status IN ('pendiente','confirmada','cancelada','pausada')),
  price_per_session numeric(12,2) NOT NULL,
  frequency         text NOT NULL DEFAULT 'weekly'
                      CHECK (frequency IN ('weekly','biweekly','monthly')),
  notes             text,
  confirmed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Tabla: recurring_exceptions
CREATE TABLE IF NOT EXISTS recurring_exceptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id   uuid NOT NULL REFERENCES recurring_bookings(id) ON DELETE CASCADE,
  original_date  date NOT NULL,
  action         text NOT NULL CHECK (action IN ('cancelled','modified')),
  new_start      time,
  new_end        time,
  new_price      numeric(12,2),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Índice para paginación cursor-based en feed
-- Verificar que exista; crear si falta:
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_recurring_id ON recurring_exceptions(recurring_id);

-- RLS Policies (ejemplos — aplicar a cada tabla nueva)
-- profile_morpho: lectura
CREATE POLICY "morpho_read" ON profile_morpho FOR SELECT USING (
  visibility = 'publico'
  OR (visibility = 'promotores' AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_promoter = true
  ))
  OR auth.uid() = user_id
);
-- profile_morpho: escritura solo dueño
CREATE POLICY "morpho_write" ON profile_morpho FOR ALL USING (auth.uid() = user_id);

-- recurring_bookings: solo dueño de la cancha
CREATE POLICY "recurring_owner" ON recurring_bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM canchas c WHERE c.id = cancha_id AND c.owner_id = auth.uid())
);

-- profiles.full_name y teams.name: acceso para usuarios autenticados
-- Verificar y ajustar la policy existente en tabla profiles para permitir
-- SELECT de full_name a cualquier auth.uid()
```

---

## Acceptance Criteria Summary

Los siguientes criterios son verificables manualmente sin tests automatizados:

1. **AC-1**: `grep -r "createClient()" src/pages/` retorna 0 resultados. Todas las páginas consumen funciones de `src/lib/{module}/api.ts`.

2. **AC-2**: `find src/pages -name "*.tsx" | xargs wc -l | awk '$1 > 400 && $2 != "total"'` retorna 0 archivos. Ninguna página excede 400 líneas.

3. **AC-3**: `npm run typecheck` completa sin errores nuevos introducidos por este cambio.

4. **AC-4 (Torneos — flujo end-to-end)**: Un usuario con `is_promoter = true` puede crear un torneo en `borrador`, publicarlo (→ `abierto_inscripciones`), cerrar inscripciones (→ `cerrado_inscripciones`) con confirmación por `AlertDialog`, generar fixture round-robin con equipos inscritos, ver los partidos en `TournamentMatchesPage`, marcar resultados de cada partido, y finalizar el torneo (→ `finalizado`) con confirmación.

5. **AC-5 (Nombres reales en torneos)**: `TournamentStandingsPage` y `TournamentMatchesPage` muestran nombres de equipos y jugadores (ej. "Tigres FC", "Juan Pérez"), no UUIDs. `grep -r '"Equipo\|abc123\|UUID stub"' src/pages/Tournament` retorna 0.

6. **AC-6 (Perfil morfológico)**: Un jugador puede editar y guardar altura, peso, envergadura, lateralidad y somatotipo desde `ProfileEditPage`. Los datos persisten en `profile_morpho` y se muestran precargados al abrir el formulario nuevamente.

7. **AC-7 (Perfil condicional)**: Un jugador puede editar y guardar tags de condición física (fuerza, velocidad, resistencia, flexibilidad) con sus notas desde `ProfileEditPage`. Persiste en `profile_conditional`.

8. **AC-8 (Perfil técnico-futbolístico)**: Un jugador puede editar posición, pierna hábil, notas de rendimiento y notas de rol táctico desde `ProfileEditPage`. Persiste en `profile_technical_football`.

9. **AC-9 (Visibilidad de perfil)**: Cambiar morfología a `"privado"` en `ProfileEditPage` hace que otro jugador (no promotor) no vea esa sección en el perfil público. Un promotor SÍ la ve cuando está en `"promotores"`. Verificado manualmente con dos cuentas distintas.

10. **AC-10 (Reservas recurrentes — creación)**: Un dueño de cancha puede crear una reserva recurrente semanal desde `CanchaAgendaPage`. Las ocurrencias aparecen en la agenda con ícono de recurrencia durante las próximas 4 semanas.

11. **AC-11 (Reservas recurrentes — edición)**: Al hacer click en una ocurrencia recurrente, el dueño puede elegir "Editar esta ocurrencia" (crea excepción en `recurring_exceptions`) o "Editar toda la serie" (actualiza `recurring_bookings`). El cambio se refleja en la agenda sin recargar la página.

12. **AC-12 (Reservas recurrentes — cancelación)**: El dueño puede cancelar una ocurrencia puntual (la fecha desaparece de la agenda) o cancelar la serie completa (todas las futuras desaparecen, las pasadas permanecen en historial).

13. **AC-13 (Gráfico de revenue)**: `CanchaStatsPage` muestra `RevenueChart` (barras de recharts) con "Revenue cobrado" y "Revenue programado". La tabla cruda ya no aparece.

14. **AC-14 (Paginación en feed)**: Con una cuenta de prueba que tenga 100+ posts en el feed, la carga inicial muestra los primeros 20 posts en < 1s. Hacer scroll carga más posts de forma fluida. El mensaje "Ya viste todo el feed" aparece al llegar al final.

15. **AC-15 (Skeletons)**: Con DevTools → Network throttling "Slow 3G", navegar a cada ruta principal muestra el skeleton correspondiente en los primeros 100ms. Ninguna pantalla queda en blanco.

16. **AC-16 (Empty states)**: Una cuenta nueva sin ningún dato muestra `EmptyState` con CTA en: `MisPartidosPage`, `TournamentsPage`, `CanchaAgendaPage` (sin bookings en el día), `FeedPage`, `ChatListPage`.

17. **AC-17 (Error boundaries)**: Causar un error intencional en un componente de ruta (temporalmente) muestra el fallback del `ErrorBoundary` con el mensaje amigable y botón "Ir al inicio". Otras rutas siguen funcionando.

18. **AC-18 (Mobile 375px)**: Todas las pantallas nuevas o modificadas en fases 2-5 renderizan sin overflow horizontal a 375px en DevTools. El `BottomNav` no solapa contenido importante.

19. **AC-19 (Build limpio)**: `npm run build` completa sin errores TypeScript ni warnings nuevos tras merge de todas las fases.

20. **AC-20 (Cleanup de subscripciones)**: Navegar de `ChatDetailPage` a otra ruta y volver no produce errores de "subscription already exists" en la consola del navegador.
