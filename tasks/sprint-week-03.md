# Sprint 3 — G4 Desarrollo (HU-004 Torneos + módulo lateral matches/venues/notifications)

> Gate activo: **G4** (`tasks/current-gate.txt` = `4`). Esta entrada documenta retroactivamente lo que ocurrió la semana del 2026-04-25/26.

## Objetivo de valor

1. Que un promotor verificado pueda crear torneos en `borrador`, publicarlos y verlos junto con los del resto de promotores — **HU-004 / RF-003**.
2. (Lateral, fuera del plan original) Endurecer el MVP v0 pickup matches con: aprobaciones de jugadores, invitaciones, centro de notificaciones realtime y gestión de canchas/reservas. Esto se priorizó por demanda directa del fundador para validar el MVP v0 con usuarios reales en paralelo.

## HUs / Módulos incluidos

| HU / Módulo | Título | Estado al cierre | Evidencia |
|---|---|---|---|
| HU-004 | Creación y gestión de torneos (promotor) | **Implementado base (CRUD + estados)** | PR #20 / commit `c41bf1c` |
| Lateral | Aprobaciones, invitaciones, notificaciones, venues+reservas | **Implementado** | PR (chore/pending-local-updates → #24); migración `20260425000000_sprint3_approvals_venues.sql` |

## Plan de entrega ejecutado (PRs)

1. **PR #20 — `feat: HU-004 Create and manage tournaments`** (mergeado 2026-04-26):
   - Migración `apps/web/supabase/migrations/20260425140000_g4_sprint3_tournaments.sql`: enums `tournament_status` (`borrador`, `abierto_inscripciones`, `cerrado_inscripciones`, `cancelado`, `finalizado`) y `tournament_format` (`liga`, `eliminatoria`, `fase_grupos_eliminatoria`); tabla `public.tournaments` con `owner_id`, `slots`/`slots_filled`, fechas con check `end_date >= start_date`, trigger `set_updated_at`; RLS por owner + visibilidad pública para estados publicados.
   - Capa de datos `apps/web/lib/tournaments/api.ts`: `createTournament`, `getTournaments`, `getMyTournaments`, `publishTournament`, tipo exportado `TournamentRow`.
   - UI `apps/web/app/(app)/tournaments/{page,new,mine}.tsx`.
   - Schemas Zod en `apps/web/lib/validation/schemas.ts` (`tournamentCreateSchema`).
   - Tests: `apps/web/tests/lib/tournaments-api.test.ts` y `tournaments.test.ts`.
2. **PR #24 — `chore/pending-local-updates`** (mergeado 2026-04-27): consolida fixes preexistentes de venues, notifications, match actions, types DB y lockfile pnpm.
3. Migración previa del módulo lateral: `apps/web/supabase/migrations/20260425000000_sprint3_approvals_venues.sql` (notifications + venues + venue_courts + venue_reservations + enum `participant_status` extendido con `requested`/`invited`).

## Criterios de salida (cumplidos)

- HU-004: CRUD funcional, estados correctos, RLS verificada manualmente con dos usuarios distintos. **No incluye inscripción** — ese alcance migra a HU-005 (Sprint 5).
- Tests unitarios pasando (130 tests al cierre de Sprint 4).

## Fuera de alcance (movido a Sprint 5)

- HU-005 (Inscripciones a torneos) — depende de HU-004.
- HU-006 (Resultados + standings) — depende de HU-004 y HU-005.

## Regresión post-sprint

- El merge del PR #22 (Sprint 4, landing premium) borró todos los archivos de HU-004 en `main`. Detectado y restaurado el 2026-04-28 — ver `tasks/sprint-week-04.md` y `memory/daily/2026-04-28.md`.
