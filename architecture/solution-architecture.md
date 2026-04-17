# Arquitectura de Solución — PRO MVP1

> Documento base de **G3 (Arquitectura + DB)**. Describe stack, módulos lógicos, límites entre capas, integraciones externas y objetivos no funcionales para el alcance de MVP1 (6 RF). Las decisiones puntuales se resuelven en ADRs bajo `architecture/adr/`.

## 1. Contexto

- **Producto:** PRO — plataforma web para organizar torneos amateurs y administrar el perfil deportivo tipo ficha.
- **Alcance MVP1 ("Opción A Acotada"):** 6 RF — RF-001, RF-002, RF-003, RF-004, RF-005, RF-007. Sólo fútbol, +18, lanzamiento en Eje Cafetero.
- **Artefactos previos:** `docs/00-prd.md`, `docs/01-requisitos-funcionales.md`, `docs/02-requisitos-no-funcionales.md`, `design/user-flows.md`, `design/wireframes/`.
- **Origen del código actual:** `apps/web` arranca del template de la fábrica con un esquema pickup-match (v0). MVP1 redefine el dominio a torneos y perfil 4 bloques; la migración incremental se documenta en §7.

## 2. Stack tecnológico

| Capa | Tecnología | Versión objetivo | Justificación |
|------|------------|------------------|---------------|
| Frontend | Next.js App Router (React 19) | `next@16.2.x`, `react@19.2.x` | Plantilla fábrica; PPR + RSC para performance; `useActionState` / Server Actions. Ver `apps/web/AGENTS.md`. |
| UI kit | shadcn/ui + Tailwind v4 + `@base-ui/react` | shadcn 4.3, Tailwind 4 | Diseño consistente, accesibilidad; alineado con `.agents/skills/shadcn`. |
| Formularios / validación | `zod@4` + Server Actions | — | Schema compartido front ↔ server; `useActionState`. |
| Auth | **Supabase Auth** (email/password + OTP; Google OAuth opcional) | `@supabase/ssr@0.10`, `@supabase/supabase-js@2` | Ver ADR-004. |
| DB | **Postgres en Supabase (managed)** con **RLS** | Postgres 15+ | Row-Level Security como hilo conductor de autorización por fila; ver ADR-001..ADR-004. |
| Storage | **Supabase Storage** (bucket privado `age-verifications`, bucket público `public-assets`) | — | Documentos sensibles (RF-007) nunca expuestos; ver ADR-003. |
| Observabilidad | Vercel Analytics + logs nativos de Supabase y Next.js | — | Métricas básicas MVP1; evolución post-release. |
| Hosting | Vercel | — | Edge + Serverless Functions; deploy por PR. |
| Tests | `vitest@4` + Testing Library + Playwright (G5) | — | Unitarios + e2e; cobertura objetivo 90%. |
| CI/CD | GitHub Actions (`apps/web — lint + build`, `gate`, `Secret scan`, `Devin Review`) | — | Pipeline del template fábrica. |

## 3. Vista de componentes (diagrama)

```mermaid
flowchart LR
  subgraph Cliente
    Browser[Navegador web responsive]
  end

  subgraph Vercel
    Next[Next.js App Router\n(apps/web)]
    RSC[Server Components\n+ Server Actions]
    Edge[Middleware\n(auth, i18n)]
  end

  subgraph Supabase
    Auth[Supabase Auth\n(auth.users)]
    DB[(Postgres + RLS\npublic.*)]
    Storage[(Supabase Storage\nage-verifications,\npublic-assets)]
    Realtime[Supabase Realtime]
  end

  Browser -->|HTTPS| Next
  Next --> RSC
  Next --> Edge
  RSC -->|SDK SSR| Auth
  RSC -->|SQL + RLS| DB
  RSC -->|signed upload/url| Storage
  Edge -->|session cookie| Auth
  Browser -.optional.- Realtime
```

La figura muestra los tres bordes de confianza:

1. **Cliente**: sólo ve cookies de sesión y URLs firmadas; nunca tokens de servicio.
2. **Next.js en Vercel**: aplica validaciones de entrada con `zod`, aplica políticas de autorización aplicativa y delega la autorización por fila al Postgres RLS.
3. **Supabase**: enforce final. RLS + policies por tabla garantizan que un bug en la capa Next no expone datos de otros usuarios.

## 4. Módulos lógicos del dominio (MVP1)

| Módulo | Responsabilidad | RF cubiertos | HU | Capas |
|--------|-----------------|--------------|----|-------|
| `auth` | Registro, login, rol dual jugador/promotor, middleware de sesión. | RF-001 | HU-001 | `apps/web/app/(auth)/*`, `apps/web/lib/auth/*`, `middleware.ts`. |
| `age-verification` | Subida de documento, estado (`pendiente`, `aprobada`, `rechazada`), auditoría. | RF-007 | HU-002 | `app/verification/age`, nueva entidad `age_verifications`, Storage bucket privado. |
| `profile` | Perfil ficha 4 bloques + selector de visibilidad por campo. | RF-002 | HU-003 | `app/profile/*`, `lib/profile/*`, tablas `profiles_core`, `profiles_morpho`, `profiles_conditional`, `profiles_technical_football`, `profile_field_visibility`. |
| `tournament` | Creación, edición, listado, detalle y cierre de torneos. | RF-003 | HU-004 | `app/tournaments/*`, `lib/tournament/*` (nuevo), tablas `tournaments`, `tournament_categories`. |
| `registration` | Inscripción de equipo/jugador con validación cruzada de RF-002 + RF-007. | RF-004 | HU-005 | `app/tournaments/[id]/register`, `lib/registration/*` (nuevo), tablas `teams`, `team_members`, `tournament_registrations`. |
| `match-results` | Carga de resultados, ventana de edición, recalcular tabla. | RF-005 | HU-006 | `app/tournaments/[id]/matches`, `app/tournaments/[id]/standings`, `lib/match/*`, tablas `tournament_matches`, `match_events`, `standings` (vista materializada). |

Cada módulo expone:

- **Server Actions** (mutaciones): validación con `zod`, autorización dura con RLS, feedback al cliente vía `useActionState`.
- **Route handlers o RSC**: lecturas con sesión autenticada.
- **Tipos**: `lib/types/<modulo>.ts` — **sin `any`**; modelos derivados del schema de la DB.

## 5. Boundaries y autorización

### 5.1 Autenticación
- Fuente de verdad: `auth.users` gestionado por Supabase Auth.
- Sesión propagada por cookie HttpOnly segura; refresco transparente vía `@supabase/ssr`.
- Ver ADR-004.

### 5.2 Autorización
- **Primer filtro aplicativo** (Next.js): las Server Actions verifican rol y propiedad antes de ejecutar SQL, retornando errores `403` amigables.
- **Enforcement final** (Postgres): **RLS activada en todas las tablas `public.*`** con policies por operación (`select`, `insert`, `update`, `delete`). Casos clave:
  - `profiles_*`: visibilidad compone RLS + campo `visibility_level` (ver ADR-002).
  - `age_verifications`: sólo dueño + service role; ver ADR-003.
  - `tournaments`: `owner_id` controla mutaciones; lectura pública una vez `status = 'published'`.
  - `tournament_registrations`: `captain_id` del equipo + `owner_id` del torneo tienen acceso.
- **Rol `service_role`** sólo lo usan jobs de admin (p.ej. aprobación manual de RF-007), jamás el frontend.

### 5.3 Datos sensibles
- El documento de identidad (RF-007) nunca baja al cliente; sólo se devuelve un estado (`pendiente/aprobada/rechazada`).
- Los defaults de visibilidad son conservadores (ver `design/user-flows.md` Flujo 3):
  - Núcleo de Identidad → `público`.
  - Morfológicos y somatotipo → `promotores`.
  - Documento de identidad → `privado` e **inmutable**.

## 6. Requisitos no funcionales y umbrales

| NF | Objetivo MVP1 | Mecanismo |
|----|---------------|-----------|
| Rendimiento | p95 LCP < 2 s en 4G; TTFB < 500 ms | PPR en rutas públicas, `cache: 'force-cache'` en lecturas estables (standings, fichas públicas) con `updateTag` en mutaciones. Ver `.agents/skills/next-cache-components`. |
| Disponibilidad | 99% en horario diurno | Dependemos de SLAs Vercel + Supabase. Deploys con rollback automático en Vercel. |
| Escalabilidad | 50–200 usuarios concurrentes | Plan Supabase small + Vercel Hobby/Pro. Queries indexadas (§3 de `db/data-model.md`). |
| Seguridad | RLS al 100% + sin secretos en repo | Check `supabase/migrations/*` obligatorio; rotación de claves documentada en `devops/`. |
| Observabilidad | Errores server y cliente capturados | Vercel Analytics + logs de Supabase; alerta manual en MVP1. |
| Accesibilidad | WCAG 2.1 AA básica | shadcn + `.agents/skills/web-design-guidelines`. |
| Privacidad | Visibilidad configurable por campo | Ver ADR-002 + wireframe 03. |

## 7. Migración desde el esquema v0

El esquema actual (`apps/web/supabase/migrations/20260416231945_init_mvp.sql` y siguientes) implementa un dominio **pickup-match** con `matches`, `match_participants`, `ratings`, `messages`. Este dominio **no corresponde al MVP1** (torneos + perfil 4 bloques).

Estrategia adoptada:

1. **No borrar** las tablas v0 en la primera migración de G4; marcarlas en deprecated a nivel de documentación y no consumirlas desde el frontend MVP1.
2. **Nuevo conjunto de tablas** para MVP1 conviviendo con el v0: `user_roles`, `profiles_core`, `profiles_morpho`, `profiles_conditional`, `profiles_technical_football`, `profile_field_visibility`, `age_verifications`, `tournaments`, `teams`, `team_members`, `tournament_registrations`, `tournament_matches`, `match_events`.
3. **Separación de dominios**: el Bloque 1 del perfil MVP1 vive en `public.profiles_core` (tabla nueva), **no en `profiles` v0**. `profiles` v0 queda deprecada junto con `matches`, `match_participants`, `ratings`, `messages`; las capacidades condicionales / morfológicas / técnicas se modelan en tablas hijas a `profiles_core` (ver ADR-001 para fundamento). Si existieran datos a migrar de `profiles` v0 a `profiles_core`, se hace con un script idempotente en G4 Sprint 2.
4. **Corte final** (post-UAT G6): una vez MVP1 estable, los objetos v0 no usados se remueven en una migración explícita; las tablas v0 con datos de pruebas se exportan antes de dropear.

El plan granular de migraciones (timestamps + up/down) se entrega en G4 (Sprint 1 + 2) siguiendo el patrón de `apps/web/supabase/migrations/`.

## 8. Decisiones registradas en ADRs

| ID | Decisión | Estado |
|----|----------|--------|
| [ADR-001](./adr/ADR-001-bloque4-storage.md) | Estrategia de almacenamiento del Bloque 4 (Destrezas técnicas por deporte). | **Aceptada** |
| [ADR-002](./adr/ADR-002-visibility-level.md) | Modelo de `visibility_level` por campo del perfil. | **Aceptada** |
| [ADR-003](./adr/ADR-003-age-verification.md) | Estrategia de verificación de edad con documento (RF-007). | **Aceptada** |
| [ADR-004](./adr/ADR-004-auth.md) | Estrategia de autenticación (Supabase Auth, método y proveedores). | **Aceptada** |

## 9. Pendientes para cerrar G3

- [ ] Revisión del fundador a este documento + las 4 ADRs + `db/data-model.md`.
- [ ] Aprobar la convivencia temporal del esquema v0 con el MVP1 hasta post-UAT.
- [ ] Confirmar proveedor de almacenamiento para el documento de identidad (Supabase Storage por defecto; alternativa: bucket S3 propio con política estricta si compliance lo exige).
- [ ] Definir en G4 herramienta de migraciones (SQL puro bajo `supabase/migrations/` — ya en uso — vs introducir Drizzle/Prisma). Propuesta inicial: **mantener SQL puro** por consistencia con el template.

## 10. Referencias

- Next.js App Router best practices: `.agents/skills/next-best-practices`.
- Cache Components (PPR + `use cache` + `updateTag`): `.agents/skills/next-cache-components`.
- Neon/Supabase connection patterns: `.agents/skills/neon-postgres` (aplicable a Postgres managed en general).
- Design system: `design/wireframes/README.md` y `DESIGN.md` (a consolidar en G4).
