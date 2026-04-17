# Sprint 1 — G4 Desarrollo (HU-001 + HU-002)

> Gate activo: **G4** (`tasks/current-gate.txt` = `4`). Este sprint abre el desarrollo del MVP1 con la base de acceso y verificación de edad.

## Objetivo de valor

Que un visitante pueda:
1. Crear cuenta eligiendo rol (jugador y/o promotor) — **HU-001 / RF-001**.
2. Subir documento de identidad para verificación de edad; sin estado `aprobada` queda sin acceso a RF-002 / RF-004 — **HU-002 / RF-007**.

Al cerrar el sprint el fundador puede revisar en `admin` una cola de verificaciones pendientes y aprobarlas manualmente (MVP = revisión manual; ver ADR-003).

## HUs incluidas

| HU | Título | Criterios GWT (ver `tasks/hu/HU-00X.md`) |
|----|--------|-------------------------------------------|
| HU-001 | Registro con roles jugador/promotor | `tasks/hu/HU-001.md` |
| HU-002 | Verificación de edad con documento | `tasks/hu/HU-002.md` |

## Plan de entrega por PRs

Sprint 1 se entrega en PRs pequeños y revisables, en este orden:

1. **PR A — DB foundation (este PR).** Migración Supabase `20260417130000_g4_sprint1_auth_age.sql`:
   - Enum `public.age_verification_status`.
   - Tabla `public.user_roles` (RF-001) con check "al menos un rol" + RLS + trigger de seed al crear `auth.users`.
   - Tabla `public.age_verifications` (RF-007) con índices + RLS + constraint de tamaño/mime.
   - Bucket privado `age-verifications` (policy sólo `service_role`).
   - **No toca UI ni `apps/web/lib`.** Backend puro + docs.
2. **PR B — Registro con rol (HU-001) [este PR].** Extender `app/(auth)/signup/page.tsx`:
   - Toggle `is_player` / `is_promoter` en `components/auth/signup-form.tsx` (jugador marcado por default; refine "al menos un rol").
   - Server Action `signUpWithPassword` pasa ambos flags en `options.data` del `supabase.auth.signUp`; el trigger `on_auth_user_created_roles` (PR A) crea la fila en `public.user_roles`.
   - Validación Zod centralizada en `lib/validation/schemas.ts` con `checkboxToBoolean` tolerante a `on` / ausente.
   - Tests en `tests/lib/schemas.test.ts` (6 cases de schema, incluyendo "al menos un rol" y "sólo promotor").
3. **PR C — Verificación de edad (HU-002).** Ruta nueva `app/(app)/verificacion/page.tsx`:
   - Upload de documento con validación client+server (max 5 MB, mime permitidos).
   - Server Action que inserta `age_verifications` `pendiente` + sube a bucket privado.
   - Vista de estado (`pendiente` / `aprobada` / `rechazada` / `menor_edad`).
   - Guard en rutas RF-002 / RF-004: sin `aprobada` → redirect a `/verificacion`.
4. **PR D — Admin de cola (HU-002 admin).** Ruta `app/(app)/admin/verificaciones/page.tsx`:
   - Lista de pendientes (sólo rol admin; MVP: feature flag por email whitelist o RLS `service_role`).
   - Acciones aprobar / rechazar con nota (usa Server Action server-side con `service_role` via Edge Function).

## Criterios de salida del sprint

- Las 4 PRs mergeadas con CI verde.
- Tests unitarios de server actions ≥ 80 % líneas.
- Smoke manual: registro → verificación → aprobación → acceso a `/perfil` ok.
- `tasks/gate-status.md` → G4 Sprint 1 completado, Sprint 2 (HU-003) como siguiente.

## Fuera de alcance (Sprint 1)

- UI de perfil tipo ficha (HU-003 → Sprint 2).
- OAuth providers (ADR-004 fija email/password + magic link en MVP).
- Integración con servicio de identidad externo (ADR-003: manual en MVP).
- Notificaciones por email al aprobar/rechazar (post-MVP; en Sprint 1 el usuario ve estado al refrescar).
