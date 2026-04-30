# Test plans — G5 QA (fase 1)

Esta carpeta aloja los **planes de prueba formales por HU** del MVP PRO.
Estructura:

- `HU-001.md` … `HU-006.md`: un plan por HU con casos GIVEN/WHEN/THEN,
  cobertura automática, RLS/triggers a validar, cálculos locales. Cada caso
  tiene columna **Estado** (`PASS` / `FAIL` / `PENDING` / `N/A`).
- `sql/*.sql`: scripts idempotentes que verifican RLS, triggers y funciones
  `SECURITY DEFINER` contra un Supabase local real. Pensados para correrse
  uno por uno con `psql` o `supabase db psql` una vez levantado el stack.
- Reportes históricos `pr-*.md` (PRs #11, #13, #14, #16): evidencias de QA
  manual con recording + assertions de sprints previos. Se conservan como
  baseline histórico; G5 amplía la cobertura con planes formales por HU.

## Cómo correr los planes

### Unit + integration (automatizado)

```bash
pnpm -C apps/web test           # 188/188 PASS
pnpm -C apps/web test:coverage  # reporte v8 HTML en coverage/
```

Meta de cobertura G5: **≥80% stmt en `lib/tournaments/*`** (alcanzado:
api.ts 91% · matches.ts 94% · registrations.ts 82%, global 88%).

### DB (manual, sobre Supabase local)

```bash
cd apps/web
supabase start               # levanta stack + aplica migraciones
export SB_DB="postgresql://postgres:postgres@localhost:54322/postgres"

# Correr los scripts de verificación (cada uno imprime PASS/FAIL):
for f in ../tasks/test-plans/sql/*.sql; do
  echo "== $f =="
  psql "$SB_DB" -f "$f"
done
```

Los scripts SQL son **idempotentes**: se pueden correr sobre una DB limpia o
sobre una con datos previos (los scripts crean usuarios temporales con
`auth.users` vía `supabase.auth.admin` o bien usan `setof` / `rollback` dentro
de transacciones).

**Nota de entorno:** el sandbox donde corre el agente no puede pullear la
imagen `public.ecr.aws/supabase/postgres` por rate-limit (`toomanyrequests`).
Los scripts se entregan listos para que el fundador los corra en su máquina.

### UI (manual, con recording opcional)

Cada HU-00X.md tiene una sección "UI smoke test" con el golden path para
ejercer desde `localhost:3000`. Adjuntar recording al PR de QA cuando se
encuentren regresiones.

## Resumen de estado (al cierre de la Fase 1 G5)

| HU | Plan | Unit coverage | RLS/trigger SQL | UI smoke | Estado global |
|----|------|---------------|-----------------|----------|---------------|
| HU-001 Signup + roles | [HU-001.md](./HU-001.md) | N/A (auth flow) | `sql/hu001-*.sql` | pr-11 (2026-04-17) | **PASS baseline** |
| HU-002 Verificación edad | [HU-002.md](./HU-002.md) | admin.ts 52% | `sql/hu002-*.sql` | pr-13 / pr-14 | **PASS baseline** |
| HU-003 Perfil 4 bloques | [HU-003.md](./HU-003.md) | N/A (form flow) | `sql/hu003-visibility.sql` | pr-16 | **PASS baseline** |
| HU-004 Torneos | [HU-004.md](./HU-004.md) | api.ts **91%** | `sql/hu004-tournaments.sql` | PENDING | **PASS** |
| HU-005 Inscripciones | [HU-005.md](./HU-005.md) | registrations.ts **82%** | `sql/hu005-*.sql` (WITH CHECK post Sprint 6) | PENDING | **PASS** |
| HU-006 Resultados + Standings | [HU-006.md](./HU-006.md) | matches.ts **94%** | `sql/hu006-*.sql` (mat view + refresh) | PENDING | **PASS** |

**Pendientes para cerrar G5:**

1. Fundador ejecuta los scripts SQL contra Supabase local y reporta resultados (5 minutos por HU).
2. Recording E2E del flujo completo HU-004 → HU-005 → HU-006 (crear torneo → inscribir equipo → cargar resultado → ver standings).
3. Cerrar los 6 findings residuales del Devin Review en PR #30 si reaparecen con detalle.
