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

## Siguientes pasos (Sprint 6)
- HU-006 Resultados + Standings (RF-005): tablas `tournament_matches`, `match_events`, vista materializada `standings` con `REFRESH CONCURRENTLY`.
- Notificaciones automáticas al promotor cuando se inscribe/cancela un equipo.
- Mover automáticamente de `lista_espera` a `confirmada` cuando se libera un cupo.
- Agregar campo `allows_solo` en `tournaments` para restringir formato al validar inscripción individual.
