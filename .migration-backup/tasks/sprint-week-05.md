# Sprint 5 — G4 Desarrollo

**Ventana:** 2026-04-28 → 2026-05-02
**Branch principal:** `devin/1777500000-hu005-registrations`
**Base:** sale sobre `devin/1777425277-restore-hu004-tournaments` (PR #28, HU-004). Cuando #28 mergee a `main` este PR queda directo sobre `main`.

## Objetivo
Cerrar **HU-005 Inscripciones a torneos (RF-004)** dejando el MVP Opción A Acotada listo para arrancar HU-006 (Resultados + Standings). Resolver concurrencia de cupos a nivel DB (mismo patrón que `enforce_match_capacity` de `matches`) y reutilizar el gate de verificación de edad (RF-007) que ya existe para HU-003/004.

## Entregables

### DB — `20260428140000_g4_sprint5_registrations.sql`
- `teams (id, name, captain_id, created_at, updated_at)` + RLS (capitán y miembros lectura; capitán insert/update/delete).
- `team_members (team_id, user_id, role, joined_at)` PK compuesta; trigger `teams_add_captain_as_member` para auto-agregar al capitán con `role='captain'`.
- `tournament_registrations (id, tournament_id, team_id|user_id, status, registered_by, ...)` con:
  - CHECK `tr_team_xor_user` (XOR entre equipo / jugador).
  - UNIQUE parciales `tr_unique_active_team` / `tr_unique_active_user` donde `status <> 'cancelada'` → evita duplicados pero permite re-inscribirse tras cancelar.
  - RLS `tr_select_stakeholders` (capitán, jugador, promotor), `tr_insert_self`, `tr_update_self_or_owner`, `tr_delete_blocked` (se cancela, no se borra, por auditabilidad).
- Trigger `enforce_tournament_capacity` (BEFORE INSERT): lock `FOR UPDATE` del torneo, valida `status='abierto_inscripciones'`, incrementa `slots_filled` si hay cupo, sino `raise P0001 tournament_full`.
- Trigger `sync_tournament_slots_on_status_change` (BEFORE UPDATE of status): libera cupo al cancelar / reserva cupo al volver a `confirmada`.

### Backend — `apps/web/lib/tournaments/registrations.ts`
- `createTeam`, `getMyTeams`, `getTeamMembers`.
- `registerTeamToTournament` (gate RF-007 sobre todos los miembros antes del insert) + `registerSoloToTournament`.
- `cancelRegistration`, `listRegistrations`, `getMyRegistrations`.
- `findUnverifiedUsers` como helper reutilizable.
- `mapRegistrationError` traduce P0001/P0002/23505 a mensajes UX en ES (complementa `mapDbError` existente).

### Schemas — `apps/web/lib/validation/schemas.ts`
- `teamCreateSchema`, `registerTeamSchema`, `registerSoloSchema`, `cancelRegistrationSchema`.
- Tipos `TeamCreateInput`, `RegisterTeamInput`, `RegisterSoloInput`, `CancelRegistrationInput`.

### Frontend
- `app/(app)/tournaments/[id]/page.tsx` — detalle público; si el viewer es promotor muestra "Ver inscripciones", si es jugador con torneo abierto y cupos muestra "Inscribirme".
- `app/(app)/tournaments/[id]/register/page.tsx` — flujo dual (individual / con equipo), reutiliza equipos propios del capitán o permite crear uno inline.
- `app/(app)/tournaments/[id]/registrations/page.tsx` — vista del promotor con breakdown confirmadas / lista espera / canceladas.
- `tournaments/mine` actualizado: el botón "Gestionar" ahora apunta a `/tournaments/[id]` (antes apuntaba a una ruta inexistente `/tournaments/[id]/manage`).

### Tests — `apps/web/tests/lib/registrations.test.ts`
9 tests nuevos. Suite total: **139/139 PASS**.
- `createTeam` rechaza nombres < 2 chars.
- `registerSolo` falla sin auth.
- `cancelRegistration` rechaza UUID inválido.
- `findUnverifiedUsers` devuelve `[]` cuando todos aprobados y la lista faltante cuando no.
- `registerTeamToTournament` bloquea si algún miembro no tiene RF-007 aprobado.
- `registerTeamToTournament` bloquea si el equipo no tiene miembros.
- `registerTeamToTournament` inserta cuando todos aprobados.
- `registerTeamToTournament` traduce `P0001/tournament_full` a "El torneo está lleno".

## Validación local
| Check | Resultado |
|---|---|
| `pnpm lint` | 0 errors, 14 warnings (preexistentes) |
| `pnpm typecheck` | OK |
| `pnpm test` | 139/139 PASS (13 archivos) |
| `pnpm build` | OK — rutas `/tournaments/[id]`, `/tournaments/[id]/register`, `/tournaments/[id]/registrations` generadas |

## Riesgos y mitigaciones
- **Concurrencia de inscripciones**: mitigado vía `FOR UPDATE` en el trigger (mismo patrón ya probado en `match_participants`).
- **Usuario sin verificación RF-007 inscribe equipo**: mitigado vía `findUnverifiedUsers` pre-insert con mensaje claro en lugar de un error genérico de DB.
- **Dobles inscripciones**: mitigado con UNIQUE parciales (`status <> 'cancelada'`).
- **Cancelación maliciosa desde otro usuario**: mitigado vía RLS `tr_update_self_or_owner` (solo el que inscribió o el dueño del torneo pueden modificar).

## HU-006 — Resultados y Tabla de Posiciones (RF-005)

**Branch:** `devin/1777510000-hu006-standings-v2` (sale sobre HU-005; cuando se mergea HU-005 queda directo sobre `main`).

### DB — `20260429140000_g4_sprint5_standings.sql`
- Enums `match_status_v2 (programado|en_juego|finalizado|w_o|cancelado)` y `match_event_type (gol|auto_gol|amarilla|roja|sustitucion)`.
- `tournament_matches (id, tournament_id, round, group_code, fixture_order, home_registration_id, away_registration_id, scheduled_at, venue, home_score, away_score, status, correction_window_ends_at, ...)`:
  - CHECK `tm_home_away_distinct` (local ≠ visitante, null-safe).
  - CHECK `tm_scores_coherent` (scores ↔ status — si está `finalizado`/`en_juego` los scores deben estar seteados; si está `programado`/`cancelado`, null).
  - Índices `(tournament_id, round)`, `(scheduled_at)`, `(status)`.
  - RLS: `select` público si el torneo es visible; `insert`/`update`/`delete` solo owner; `update` restringido a `correction_window_ends_at > now()` o match no finalizado.
- `match_events (id, match_id, event_type, minute, player_id, team_side, notes, ...)` con RLS `all` solo para owner.
- Vista materializada `public.standings` (PJ, G, E, P, GF, GC, DG, Pts) con `UNION ALL` (cada match cuenta dos veces, una por lado). Índice único `standings_unique_row (tournament_id, registration_id)` — requisito de `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- Función `public.refresh_standings()` con `SECURITY DEFINER`, grant solo a `authenticated`.
- Trigger `tm_before_*_enforce_finalize`: valida que el torneo esté en `cerrado_inscripciones` o `finalizado` al pasar un match a `finalizado`; setea `correction_window_ends_at = now()+48h` si no viene.
- Trigger `tm_after_finalize_refresh`: llama a `refresh_standings()` después de insert/update relevantes. Swallowa excepciones para no romper la transacción principal del promotor.

### Backend — `apps/web/lib/tournaments/matches.ts`
- `createMatch`, `listMatches`, `getMatchById`, `recordResult`, `addMatchEvent`, `listMatchEvents`, `listStandings`.
- `mapResultError` (P0001 `tournament_not_ready_for_results`, P0002 `tournament_not_found`, `42501/permission`).
- Algoritmo puro `computeStandingFromMatches(tournament_id, registration_id, matches[])` — útil para tests unitarios y para UI que quiera calcular en vivo antes de que el refresh de la mat view termine.

### Schemas — `apps/web/lib/validation/schemas.ts`
- `matchStatusEnum`, `matchEventTypeEnum`.
- `matchCreateSchema` (refine `home ≠ away`), `matchResultSchema` (scores 0–99), `matchEventSchema` (minute 0–130).

### Frontend
- `/tournaments/[id]/matches` — fixture público con badges de estado, acciones del promotor.
- `/tournaments/[id]/matches/new` — form del promotor (requiere ≥2 inscripciones confirmadas).
- `/tournaments/[id]/matches/[matchId]` — carga de resultado + eventos (goles, tarjetas, etc.) para el promotor.
- `/tournaments/[id]/standings` — tabla de posiciones pública (PJ, G, E, P, GF, GC, DG, Pts).
- `/tournaments/[id]` (detalle) con botones "Partidos" y "Tabla de posiciones" para cualquier viewer.

### Tests — `apps/web/tests/lib/matches.test.ts`
13 tests nuevos. Suite total: **153/153 PASS**.
- Validación de forma: `home == away`, sin auth, score negativo, minuto > 130.
- Mapping de errores: `P0001/tournament_not_ready_for_results`, `42501/permission`.
- Algoritmo puro `computeStandingFromMatches`: victoria local (3pts), derrota visitante (0pts), empate (1pt cada lado), ignora no-finalizados, ignora otros torneos, ignora no-participantes, acumulado V+E+D.

### Validación local
| Check | Resultado |
|---|---|
| `pnpm lint` | 0 errors, 15 warnings (preexistentes) |
| `pnpm typecheck` | OK |
| `pnpm test` | 153/153 PASS (14 archivos) |
| `pnpm build` | OK — rutas nuevas: `/tournaments/[id]/matches`, `/tournaments/[id]/matches/new`, `/tournaments/[id]/matches/[matchId]`, `/tournaments/[id]/standings` |

### Riesgos y mitigaciones (HU-006)
- **Refresh masivo en torneos grandes**: mitigado usando `REFRESH MATERIALIZED VIEW CONCURRENTLY` con índice único. Post-MVP evaluar tabla regular con triggers granulares.
- **Cambio tardío de resultado después de cerrar el torneo**: mitigado con `correction_window_ends_at` (default 48h) chequeado en RLS del `update`.
- **Marcador inconsistente (finalizado sin scores)**: mitigado con CHECK `tm_scores_coherent` en DB, no solo en UI.
- **Refresh fallido bloquea transacción del promotor**: mitigado con `exception when others then null` dentro del trigger AFTER (el match se guarda aunque el refresh falle; se puede re-disparar vía RPC).

## Siguientes pasos (Sprint 6)
- Notificaciones automáticas al promotor cuando se inscribe/cancela un equipo.
- Mover automáticamente de `lista_espera` a `confirmada` cuando se libera un cupo.
- Proyección de stats al perfil del jugador (Bloque 4 técnico): agregar partidos jugados, goles, tarjetas por jugador a partir de `match_events.player_id`.
- Hardening del trigger `sync_tournament_slots_on_status_change` (validar estado del torneo al re-confirmar).
- Agregar `WITH CHECK` por rol en RLS `tr_update_self_or_owner` (restringir transiciones de status según role).
- Generación automática de fixture (liga / grupos + eliminación).
- Agregar campo `allows_solo` en `tournaments` para restringir formato al validar inscripción individual.
