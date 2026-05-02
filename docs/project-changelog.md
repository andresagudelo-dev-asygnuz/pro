# Changelog del producto — definición y construcción

Bitácora **del producto** (negocio, alcance, gates y hitos de entrega). Mantener **la fecha más reciente arriba**. El detalle de decisiones largas va en `memory/project-memory.md` y el día a día en `memory/daily/`.

## Convención

- Una sección por fecha: `## YYYY-MM-DD`
- Viñetas cortas; enlazar PRD, intake o gate cuando aplique
- Etiquetas opcionales: `[Definición]` `[Construcción]` `[Gate]` `[Alcance]`

---

## Unreleased

- `[Construcción]` **Estabilización de despliegue**: Resueltos 15 problemas de ESLint, errores de TypeScript por tipos desincronizados (`Match`, `MatchParticipant`, `Profile`) y componentes UI faltantes (`alert`, `switch`). Todos los tests (188) y `typecheck` pasando satisfactoriamente.
- `[Construcción]` **G4 Sprint 3 finalizado (MVP Fútbol)**: Sistema completo de aprobación de jugadores e invitaciones. Centro de notificaciones en tiempo real. Gestión de canchas y reservas automáticas integrado en la creación de partidos. Garantía de funcionamiento y estabilidad con +125 tests.
- `[Construcción]` **G4 Sprint 2 finalizado**: Perfil tipo ficha con visibilidad configurable (HU-003). Implementados los 4 bloques del perfil, selector de visibilidad, vista previa por audiencia y vista pública `/u/[slug]` con filtrado de seguridad server-side.
- `[Gate]` **G3 aprobado** vía merge de PR #9 (arquitectura + modelo de datos + 4 ADRs, con correcciones de Devin Review incluidas). `tasks/current-gate.txt` = `4`.
- `[Construcción]` **G4 Sprint 1 iniciado**: HU-001 (registro con rol) + HU-002 (verificación de edad). Plan en `tasks/sprint-week-01.md`. PR A entregó DB foundation: migración `20260417130000_g4_sprint1_auth_age.sql` con `user_roles`, `age_verifications`, RLS, trigger de seed de roles, helper `ensure_verification_aprobada` y bucket privado Storage `age-verifications` (PR #10 mergeado). Confirmación del fundador: default `is_player = true`; principio "info básica pública / detalle logueado" aplica a torneos en HU-004/005.
- `[Construcción]` **G4 Sprint 1 PR B (HU-001 registro con rol):** toggle jugador/promotor en `components/auth/signup-form.tsx`, `signUpSchema` Zod con `is_player`/`is_promoter` + refine "al menos un rol", `supabase.auth.signUp` pasa ambos flags en `options.data` (el trigger DB los consume). Tests unitarios de schema (`tests/lib/schemas.test.ts`) verde. PR #11 mergeado (post-fix: refine removido para alinear con default del trigger DB).
- `[Construcción]` **G4 Sprint 1 PR C (HU-002 verificación de edad):** nueva ruta `app/(app)/verificacion/page.tsx` con panel de estado + form cliente (`components/auth/verify-age-form.tsx`) que valida mime (JPG/PNG/PDF) + tamaño (≤ 5 MB) antes del submit. Server Action `uploadAgeVerification` (`lib/auth/age-verification-actions.ts`) sube al bucket privado `age-verifications` con `service_role` e inserta la fila con status `pendiente` desde la sesión usuario (RLS). Banner persistente en el layout `(app)` mientras la verificación no esté aprobada. Helper `requireAgeVerificationAprobada()` listo para Sprint 3 (RF-004). Tests: +5 cases para `verifyAgeFileSchema` (71 totales).
- `[Definición]` Intake `01`–`03` con síntesis desde monolito; PRD y RNF borrador; RF prioritarios (candidatos Opción A); **decisión MVP única pendiente**. Monolito `PRO-gestion.documental.md` en migración a `01–08`. G1 en curso (`tasks/gate-status.md`).
- `[Construcción]` Repositorio remoto: https://github.com/andresagudelo-dev-asygnuz/pro
- Estado de gates: `tasks/gate-status.md`, `tasks/current-gate.txt`.

## 2026-04-17

- **[Gate] G3 Arquitectura + DB entregado para revisión.** `architecture/solution-architecture.md` (stack Next.js 16 + Supabase, módulos por RF, RLS), `db/data-model.md` (modelo lógico MVP1 con convivencia del esquema v0) y 4 ADRs aceptadas en `architecture/adr/`: ADR-001 (Bloque 4 → tablas satélite por deporte), ADR-002 (`visibility_level` → tabla genérica + catálogo), ADR-003 (verificación de edad RF-007 → upload interno + revisión manual), ADR-004 (auth → email/password + verificación email; Google OAuth opcional en Sprint 2). `tasks/current-gate.txt` = `3`, `.factory/state.json` y `tasks/gate-status.md` sincronizados.
- **[Gate] G2 Diseño aprobado por el fundador** vía merge de PR #8.

## 2026-04-17 (entradas previas)

- `[Alcance]` **MVP1 ampliado de 5 a 6 RF**: se agrega RF-007 (verificación de edad con documento) al onboarding obligatorio por resolución del fundador.
- `[Definición]` Modelo del perfil del deportista documentado como **4 bloques deporte-agnóstico** (Identidad, Morfológico/Biométrico, Capacidades Condicionales, Destrezas Técnicas) con MVP1 instanciando sólo fútbol. Ver `docs/intake/04-requisitos-funcionales-borrador.md`.
- `[Definición]` **Principio transversal de configurabilidad por usuario**: selector de visibilidad `público`/`promotores`/`privado` por cada campo del perfil, con defaults sensibles (morfológicos en `promotores`, documento de identidad en `privado`).
- `[Definición]` Módulo **post-MVP "Interacción social y gamificación"** agregado al intake: RF-borrador IS-01 (amistad), IS-02 (calificación por pares con fuentes `amigo`/`participante`), IS-03 (XP por participación).
- `[Gate]` **G1 Producto aprobado por el fundador** (ver PR #7). Transición a G2 (Diseño) iniciada; `tasks/current-gate.txt` = `2`.
- `[Construcción]` Plan de desarrollo G2–G7 creado en `tasks/plan-desarrollo.md`. Backlog inicial de HU para MVP1 en `tasks/hu/HU-001.md` – `tasks/hu/HU-006.md` (mapeo 1:1 con los 6 RF).
- `[Gate]` **G2 Diseño entregado para revisión.** Flujos en `design/user-flows.md` (6 flujos mapeados a HU-001..HU-006 con mermaid) y wireframes base en `design/wireframes/01-register.md`..`10-standings-table.md` (10 pantallas) + `README.md`. `tasks/gate-status.md` marca G2 como "Listo para revisión". Pendiente aprobación del fundador antes de avanzar a G3.
