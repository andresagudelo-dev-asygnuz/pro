# Supabase: separar `public` (prod) y `staging` (staging)

## Objetivo

Usar el mismo proyecto de Supabase con dos esquemas:
- `public` para producción
- `staging` para ambiente de pruebas

## Cambios ya listos en el repo

- El cliente web ahora acepta esquema por env:
  - `VITE_SUPABASE_DB_SCHEMA` (o `NEXT_PUBLIC_SUPABASE_DB_SCHEMA`)
- Las suscripciones realtime del frontend usan ese esquema dinámicamente.
- `supabase/config.toml` expone ambos esquemas (`public`, `staging`) en API local.
- Existe migración para crear el esquema:
  - `supabase/migrations/20260615160500_create_staging_schema.sql`

## Paso a paso

1. Aplicar migraciones (local o remoto)
```bash
cd artifacts/pro-sport
supabase db push
```

2. Definir variables de entorno por ambiente

Producción:
```env
VITE_SUPABASE_DB_SCHEMA=public
```

Staging:
```env
VITE_SUPABASE_DB_SCHEMA=staging
```

3. Verificar que el frontend usa el esquema correcto
- Inicia la app del ambiente.
- Abre una pantalla con realtime (notificaciones, reservas).
- Confirma en logs que no hay errores de schema inexistente.

4. Crear estructura de tablas en `staging`
- La migración actual solo crea el contenedor del schema.
- Debes crear tablas/RPC/policies equivalentes para `staging` antes de usarlo con tráfico real.

## Advertencias importantes

- Hoy hay muchas migraciones históricas con referencias explícitas a `public.*`.
- Si apuntas la app a `staging` sin clonar estructura/policies, tendrás errores de tablas o RLS.
- Recomendación operativa: usar `staging` para pruebas controladas y migrar SQL hardcodeada por lotes.

## Recomendación técnica (más segura)

Para evitar mezcla de datos y complejidad de RLS, lo más robusto sigue siendo:
- un proyecto Supabase para prod
- otro proyecto Supabase para staging

Si igual prefieres esquema único por costos, este parche te deja el runtime listo para hacerlo de forma gradual.
