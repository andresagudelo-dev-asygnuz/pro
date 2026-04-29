# Sprint 4 — G4 Desarrollo (Hardening + Landing premium + Restauración HU-004)

> Gate activo: **G4** (`tasks/current-gate.txt` = `4`). Sprint cerrado el 2026-04-28 al mergear el PR de restauración + saneamiento.

## Objetivo de valor

1. Estabilizar el codebase: lockfile pnpm, ESLint clean, build OK, compatibilidad React 19.
2. Abrir lista de espera con landing high-fidelity + tracking de señales (PR #22).
3. Validar mercado con un mini-juego de feedback estructurado (`/feedback` + `MomTestGame`, migración `market_validation_responses`).
4. (No previsto) Detectar y revertir regresiones críticas introducidas durante el sprint.

## Entregables ejecutados

| Artefacto | PR / Commit | Notas |
|---|---|---|
| Landing premium (Hero, Challenge, LocalFocus, RegistrationForm, Header con CTA) con GSAP | PR #22 (`feature/landing-page-premium`) | Mergeado 2026-04-27. Pisó accidentalmente HU-004. |
| Migración `20260427000000_market_validation.sql` + ruta `/feedback` + `MomTestGame.tsx` | PR #22 | Captura `name`, `email`, `main_sport`, `frequency`, `role`, `tools[]`, `pain_intensity`, `lost_money`, `searched_solution`, `digital_payment`, `coordination_time_hours`, `beta_interest`, `signals` JSONB. |
| Fixes React 19 + types DB + lockfile pnpm + ESLint warnings | PR #24 (`chore/pending-local-updates`) | Mergeado 2026-04-27 con CI verde (4 checks). |
| OG image + favicon + cookie consent + metadata absolute URLs | Commits sueltos directos sobre `main` (`a6ef532`, `35dcbd9`, `c15d648`) | Posiblemente la causa de los 14 errores ESLint que aparecieron en `main` después del PR #24 — pendiente investigar por qué CI no los bloqueó. |
| **Restauración HU-004 + saneamiento ESLint + docs** | Este PR | Cherry-pick de `c41bf1c`, migración movida a `apps/web/supabase/migrations/`, 14 errores ESLint resueltos con tipos correctos (no `eslint-disable`), docs sincronizada. |

## Validación local al cierre

- `pnpm lint` → 0 errors, 14 warnings (todos `<img>` o imports no usados en componentes de landing — no bloquean CI).
- `pnpm typecheck` → OK.
- `pnpm test` → 130/130 PASS (12 archivos).
- `pnpm build` → OK; rutas `/tournaments`, `/tournaments/mine`, `/tournaments/new` presentes.

## Regresión detectada y resuelta

- **Causa raíz**: el merge de `feature/landing-page-premium` (PR #22) tenía conflictos con cambios concurrentes de HU-004 (PR #20). El resolver de conflictos del PR #22 borró archivos de HU-004 en lugar de mantenerlos. Ningún test E2E cubre el listado de torneos, así que CI pasó verde.
- **Detección**: auditoría de `main` el 2026-04-28 vía `git ls-tree main 'apps/web/app/(app)/tournaments'` (vacío) y `git show --stat 9526665` (archivos de tournaments con líneas `--`).
- **Resolución**: cherry-pick de `c41bf1c` con conflictos en `tasks/gate-status.md`. Migración reubicada porque el commit original la dejó en `db/migrations/` (no aplicado por Supabase) en vez de `apps/web/supabase/migrations/`.

## Criterios de salida (cumplidos)

- [x] Landing premium en `main` con tracking de eventos.
- [x] Lista de espera + market validation funcional.
- [x] HU-004 restaurada y verificada con build.
- [x] `pnpm lint` en 0 errors.
- [x] `memory/`, `tasks/`, `gate-status.md` reflejan la realidad del sprint.

## Sprint 5 — Próximos pasos

1. **HU-005 — Inscripciones a torneos** (RF-004): tablas `teams`, `team_members`, `tournament_registrations`; trigger de capacidad análogo al de `matches`; validación de RF-007 por miembro; lista de espera; cancelación.
2. **HU-006 — Resultados + tabla de posiciones** (RF-005): `tournament_matches`, `match_events`, vista materializada `standings` (índice único + `REFRESH CONCURRENTLY`); reflejo de stats básicas en perfil del jugador respetando visibilidad.
3. **Higiene**: eliminar ramas remotas mergeadas (`feature/landing-page-premium`, `jules-g4-sprint2-hu003-final-...`); revisar configuración de protección de `main` para evitar pushes directos sin PR.
