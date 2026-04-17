# Plan de desarrollo — PRO (MVP1)

> Plan vivo para avanzar de G2 a G7. Se lee junto con `tasks/gate-status.md` y `tasks/current-gate.txt`. Los artefactos "mínimos" (en **negrita**) son los que valida `scripts/check-gate.sh`; los "completos" (lista en `docs/gates-checklist.md`) son para revisión humana.

## 0. Alcance vigente (MVP1)

- **Opción A Acotada** — 6 RF: RF-001 (registro + rol), RF-002 (perfil tipo ficha), RF-003 (crear torneo), RF-004 (inscripción), RF-005 (resultados + tabla), RF-007 (verificación de edad).
- **Sólo fútbol, +18, lanzamiento Eje Cafetero.** Plataforma web responsiva.
- **Principio transversal:** configurabilidad por usuario (selector de visibilidad `público`/`promotores`/`privado` por campo del perfil).
- Detalle: `docs/00-prd.md`, `docs/01-requisitos-funcionales.md`, `docs/02-requisitos-no-funcionales.md`, `docs/intake/03-propuesta-valor-y-mvp.md`, `docs/intake/04-requisitos-funcionales-borrador.md`.

## 1. Mapeo RF → HU (backlog inicial MVP1)

| HU | Título | RF cubiertos | Prioridad | Dependencias |
|----|--------|--------------|-----------|--------------|
| HU-001 | Registro con roles (jugador / promotor) | RF-001 | Alta | — |
| HU-002 | Verificación de edad con documento | RF-007 | Alta | HU-001 |
| HU-003 | Perfil tipo ficha (subconjunto MVP1 fútbol) + selector de visibilidad | RF-002 | Alta | HU-001, HU-002 |
| HU-004 | Creación y gestión de torneos | RF-003 | Alta | HU-001 (rol promotor) |
| HU-005 | Inscripción de equipo / jugador a torneo | RF-004 | Alta | HU-003, HU-004 |
| HU-006 | Resultados y tabla de posiciones | RF-005 | Alta | HU-004, HU-005 |

Detalle GWT por HU: `tasks/hu/HU-001.md` … `tasks/hu/HU-006.md`.

## 2. Orden de gates y artefactos obligatorios

Siguiente gate activo: **G2 — Diseño** (`tasks/current-gate.txt` = `2`).

### G2 — Diseño

- **Artefactos mínimos:** `design/user-flows.md`.
- Artefactos completos (revisión humana):
  - Flujos de usuario por HU (registro+verificación, onboarding del perfil, crear torneo, inscripción, resultados).
  - Wireframes base (baja fidelidad) de pantallas clave: landing, registro, verificación, perfil (4 bloques + controles de visibilidad por campo), listado/creación de torneos, ficha de torneo, inscripción, captura de resultados, tabla de posiciones.
  - Catálogo preliminar de componentes reutilizables (alineado con shadcn/ui del stack).
- **Entregable de salida:** aprobación del fundador y bump de `gate-status.md` → G2 Aprobado, G3 En curso.

### G3 — Arquitectura + DB-first

- **Artefactos mínimos:** `architecture/solution-architecture.md`, `db/data-model.md`.
- Artefactos completos:
  - Diagrama de arquitectura (Next.js App Router + API + Neon Postgres + Vercel + Supabase Storage u otro para binarios).
  - **ADRs críticos** del MVP1, entre ellos:
    - ADR-001: estrategia de almacenamiento de campos específicos por deporte del Bloque 4 (**JSONB validado por schema vs tablas satélite por deporte**). Decisión pendiente; esta ADR la resuelve.
    - ADR-002: modelo de `visibility_level` por campo del perfil (columna enum por campo vs tabla `profile_field_visibility(user_id, field_key, level)` genérica).
    - ADR-003: estrategia de verificación de edad (servicio de identidad externo vs upload + validación manual por admin MVP).
    - ADR-004: autenticación (email/password + OTP, OAuth providers, límites por rol).
  - Modelo de datos inicial con tablas: `users`, `profiles`, `profile_fields_visibility`, `tournaments`, `teams`, `team_members`, `tournament_registrations`, `matches`, `match_results`, `age_verifications`.
  - Plan de migraciones (herramienta: a decidir — Prisma vs Drizzle vs raw SQL + pgroll).
- **Entregable de salida:** aprobación del fundador + bump → G3 Aprobado, G4 En curso.

### G4 — Desarrollo

- **Artefactos mínimos:** `tasks/sprint-week-XX.md` activo + al menos un `tasks/hu/HU-XXX.md`.
- Artefactos completos:
  - Sprints semanales con HU seleccionadas y objetivo de valor.
  - PRs por HU con checklist de SOLID / Clean Code, tests unitarios y lint/build verde.
  - Seeds mínimos para demo (usuarios, torneo de muestra, equipos).
- **Orden sugerido de HUs:**
  1. Sprint 1: HU-001 + HU-002 (acceso y verificación).
  2. Sprint 2: HU-003 (perfil con visibilidad).
  3. Sprint 3: HU-004 + HU-005 (torneo + inscripción).
  4. Sprint 4: HU-006 (resultados + tabla) + hardening.

### G5 — QA

- **Artefactos mínimos:** `qa/test-plan.md`, `qa/coverage-report.md`.
- Artefactos completos:
  - Plan de pruebas (unit, integration, e2e con Playwright) cubriendo criterios GWT de las 6 HU.
  - Reporte de cobertura ≥ 90 % global (o excepción explícita).
  - Evidencias de runs de CI verdes por HU.

### G6 — UAT

- **Artefactos mínimos:** `uat/uat-checklist.md`, `uat/uat-results-YYYYMMDD.md`.
- Artefactos completos:
  - Checklist por HU con los criterios GWT como pasos ejecutables por negocio.
  - Ejecución del checklist por el fundador (o testers designados) con evidencia (capturas, notas).
  - Aprobación o plan de corrección documentado.

### G7 — Release

- **Artefactos mínimos:** `security/security-checklist.md`, `security/security-report.md`, `traceability/matriz-trazabilidad.md`.
- Artefactos completos:
  - Checklist de seguridad baseline (OWASP ASVS L1 mínimo, manejo de secretos, headers, rate limiting, RLS en Postgres, tratamiento del documento de identidad de RF-007).
  - Deploy controlado a QA → producción (Vercel + Neon).
  - Matriz RF → HU → PR → tests → UAT → deploy.

## 3. Estado de dudas abiertas que impactan gates posteriores

| Duda | Gate que la resuelve | Referencia |
|------|----------------------|------------|
| Estructura de almacenamiento del Bloque 4 (JSONB vs tablas satélite) | G3 (ADR-001) | `docs/intake/04-requisitos-funcionales-borrador.md` § Resoluciones #3 |
| Modelo de `visibility_level` por campo | G3 (ADR-002) | `docs/intake/04-requisitos-funcionales-borrador.md` § Principio transversal |
| Mecanismo de verificación de edad (externo vs manual) | G3 (ADR-003) | `docs/01-requisitos-funcionales.md` RF-007 |
| Catálogo de tags de habilidades blandas (cerrado vs abierto con moderación) | G2 (diseño de formularios) | `intake/04` Dudas abiertas |
| Múltiples disciplinas activas por usuario (multi-deporte) | Post-MVP | `intake/04` Dudas abiertas |
| Promoción de IS-01/IS-02/IS-03 a MVP1.x | Post-MVP (re-evaluar tras G2) | `intake/04` módulo "Interacción social y gamificación" |

## 4. Riesgos y mitigaciones destacadas

- **Alcance creciente en G2:** congelar el alcance MVP1 a 6 RF salvo decisión explícita del fundador; todo input nuevo entra a intake como borrador post-MVP.
- **Bloqueo por verificación de edad (RF-007):** si el mecanismo definitivo es externo, preparar fallback de "verificación manual por admin" para no bloquear inscripciones en el lanzamiento piloto.
- **Complejidad del selector de visibilidad por campo:** considerar en G2 una UX agrupada (defaults por bloque con override por campo) para no saturar la pantalla de perfil.

## 5. Convenciones

- Branch por HU: `devin/<timestamp>-hu-00X-slug`.
- Un PR por HU; descripción incluye link a `tasks/hu/HU-00X.md` y a los RF cubiertos.
- Actualizar `tasks/gate-status.md` + `memory/project-memory.md` + `memory/daily/YYYY-MM-DD.md` al aprobar cada gate o cerrar trabajo relevante (protocolo `CLAUDE.md`).
