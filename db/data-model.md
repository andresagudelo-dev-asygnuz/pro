# Modelo de datos

> **Estado:** borrador — Gate 3 pendiente. Este documento se cerrará tras decidir el MVP en Gate 1 y el detalle de dominio en Gate 2.

## Motor y hosting

- **Postgres gestionado por Supabase.**
- Extensiones candidatas: `pgcrypto` (UUIDs), `citext` (emails), `postgis` (si MVP incluye mapa/hiperlocal).
- Migraciones versionadas en `apps/web/supabase/migrations/` mediante [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

## Principios

1. **RLS habilitada por defecto** en todas las tablas públicas. No se crea ninguna tabla sin policies explícitas.
2. **`auth.users` es fuente de verdad de identidad** (gestionado por Supabase Auth). El perfil de dominio vive en `public.profiles` con FK a `auth.users.id`.
3. **IDs:** `uuid` generados por `gen_random_uuid()` salvo que se justifique `bigserial`.
4. **Timestamps:** `created_at` / `updated_at` (`timestamptz`, default `now()`), triggers para mantener `updated_at`.
5. **Soft-delete** sólo donde el negocio lo requiera (`deleted_at timestamptz`).
6. **Nombres:** `snake_case` para tablas y columnas, plural para tablas (`profiles`, `tournaments`).

## Entidades iniciales (placeholder, sujeto a Gate 2)

| Entidad           | Descripción                                        | Notas                                           |
| ----------------- | -------------------------------------------------- | ----------------------------------------------- |
| `profiles`        | Perfil público del usuario (deportista/organizador)| FK a `auth.users`. RLS: self + lectura pública limitada. |
| `teams`           | Equipos                                            | Dueño + miembros.                               |
| `tournaments`     | Torneos creados por organizadores                  | Sólo si MVP Opción A.                           |
| `tournament_entries` | Inscripciones equipo ↔ torneo                   | Tabla puente.                                   |
| `venues`          | Canchas / lugares (opcional hiperlocal)            | `postgis` si Opción B.                          |

> El detalle (columnas, índices, policies RLS) se completa en Gate 3 junto con las migraciones iniciales.

## Auth y RLS

- Supabase Auth maneja registro/login (email/password, magic link, OAuth Google por definir).
- Patrón estándar para policies:
  ```sql
  alter table public.<tabla> enable row level security;

  create policy "<tabla>: select own or public"
    on public.<tabla> for select
    using ( auth.uid() = user_id or is_public = true );

  create policy "<tabla>: insert own"
    on public.<tabla> for insert
    with check ( auth.uid() = user_id );
  ```
- Nunca se expone `service_role` al cliente. Operaciones administrativas van por Edge Functions o scripts server-side.

## Entornos

| Entorno | Proyecto Supabase                    | Propósito                        |
| ------- | ------------------------------------- | -------------------------------- |
| `local` | Stack local de Supabase CLI (Docker)  | Desarrollo con `supabase start`. |
| `dev`   | Proyecto Supabase `pro-dev`           | Previews de Vercel.              |
| `prod`  | Proyecto Supabase `pro-prod`          | Producción.                      |

> Los proyectos `pro-dev` y `pro-prod` se crean en Gate 7 (Release). Por ahora sólo hay scaffolding de código; aún no se crean las instancias reales.
