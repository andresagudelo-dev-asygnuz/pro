# Supabase migrations

Este directorio se usará para migraciones gestionadas con la [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

## Setup local (cuando se decida en Gate 3)

```bash
# instalar CLI
pnpm add -D supabase   # o brew install supabase/tap/supabase

# inicializar (crea supabase/config.toml)
pnpm supabase init

# vincular con proyecto remoto
pnpm supabase link --project-ref <project-ref>

# crear nueva migración
pnpm supabase migration new <nombre>

# aplicar a la base local (requiere Docker)
pnpm supabase db reset
```

> Nota: el modelo de datos definitivo vive en `db/data-model.md` (en la raíz del repo). Este directorio contiene sólo los archivos SQL ejecutables generados por la CLI.
