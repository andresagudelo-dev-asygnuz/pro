---
name: testing-supabase-local
description: Runbook para probar features del MVP PRO (Next.js 16 + Supabase) localmente — levantar el stack, ejecutar migraciones, verificar triggers de DB, ejercer flujos de auth desde UI y aislar comportamiento server-side cuando el DOM es poco fiable.
---

# testing-supabase-local

Guía para testear cualquier feature que toque Supabase (auth, DB, triggers, RLS) contra un stack local en vez de prod. Usado por primera vez en PR #11 (HU-001 signup con roles) y generalizable a todos los Sprints de G4.

## Precondiciones (chequeo rápido)

```bash
docker --version            # Docker Engine
supabase --version          # Supabase CLI 2.x. Si no existe: npx supabase@latest ... o
                            # `curl -fsSL https://supabase.com/install.sh | sh`
node --version && pnpm --version
```

En este repo las migraciones viven en `apps/web/supabase/migrations/` y la config del stack local en `apps/web/supabase/config.toml`.

## 1. Levantar el stack local (una vez por sesión)

```bash
cd apps/web
supabase start
```

Esto arranca:
- Postgres  `localhost:54322`
- API Auth  `http://127.0.0.1:54321`
- Studio    `http://localhost:54323`
- Inbucket  `http://localhost:54324`

Y aplica *todas* las migraciones de `supabase/migrations/` en orden. Si ya está corriendo de una sesión anterior, `supabase status` lo confirma.

Después copiá las credenciales al `.env.local` de Next.js (no se auto-inyecta):

```bash
cat > apps/web/.env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(supabase status -o json | jq -r .ANON_KEY)
EOF
```

## 2. Arrancar el dev server

```bash
pnpm -C apps/web dev       # Next.js 16, Turbopack, puerto 3000
```

Mientras compila puede mostrar el indicador "Compiling…". Eso NO indica error; esperá que aparezca "Ready in …" antes de testear.

## 3. Verificar que un trigger/migración se aplicó

El contenedor de Postgres se llama `supabase_db_<projectname>` (en este repo: `supabase_db_pro`). Desde ahí podés inspeccionar schema, triggers y datos:

```bash
# listar triggers de auth.users
docker exec supabase_db_pro psql -U postgres -d postgres -c \
  "select tgname from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal;"

# confirmar que una migración nueva se corrió
docker exec supabase_db_pro psql -U postgres -d postgres -c \
  "select * from information_schema.tables where table_name='user_roles';"
```

Si la migración no está, típicamente es porque `supabase start` tiró un error silencioso durante `seed` o porque la migración ya existía con otro timestamp. Revisar `supabase status` + `docker logs supabase_db_pro | tail -n 100`.

## 4. Ejercer UI flows + verificar DB

Para tests de formulario contra actions que escriben en DB (ej. signup, onboarding):

1. Navegá con computer use tool a `localhost:3000/<ruta>`.
2. Completá campos y submit vía UI normal.
3. Tras redirect, consultá la DB con `docker exec ... psql`. **No** confíes sólo en la UI: el trigger/RLS/metadata puede diverger del optimista.

Ejemplo usado en PR #11:

```bash
docker exec supabase_db_pro psql -U postgres -d postgres -c \
  "select u.email, u.raw_user_meta_data->>'is_player' as meta_player,
          ur.is_player, ur.is_promoter
   from auth.users u join public.user_roles ur on ur.user_id=u.id
   where u.email like 't%@test.dev' order by u.email;"
```

## 5. Aislar comportamiento server-side cuando el DOM es poco fiable

### Gotcha: `<input defaultChecked>` + `useActionState`

Los checkboxes no-controlados (con `defaultChecked` en vez de `checked={state}`) pueden **re-setearse al default durante el re-render que dispara `useActionState`** al pasar a `pending=true`. Observación real en PR #11: un submit con ambos checkboxes desmarcados en DOM terminó enviando `is_player=on` en FormData igual. La consecuencia se ve en `auth.users.raw_user_meta_data` — no en la UI.

En próximos PRs similares, si se necesita garantizar 1:1 entre DOM y submission, migrar a controlled inputs:

```tsx
const [isPlayer, setIsPlayer] = useState(true);
<input type="checkbox" name="is_player" checked={isPlayer} onChange={(e)=>setIsPlayer(e.target.checked)} />
```

### Bypass: curl directo al endpoint de auth

Para probar un caso que es difícil de reproducir desde UI (ej. confirmar el default de un trigger DB cuando la UI tiende a mandar el valor "feliz"):

```bash
curl -s -X POST 'http://127.0.0.1:54321/auth/v1/signup' \
  -H 'Content-Type: application/json' \
  -H "apikey: $(supabase status -o json | jq -r .ANON_KEY)" \
  -d '{"email":"xtest@dev.local","password":"Password123!","data":{"is_player":false,"is_promoter":false}}'
```

Y después verificá el efecto en `public.user_roles` con `psql`. Esto prueba el trigger DB sin depender del DOM.

## 6. Limpieza

```bash
cd apps/web && supabase stop      # detiene containers (mantiene datos)
supabase stop --no-backup         # borra datos también
```

## 7. Cosas que NO funcionan localmente

- **Email confirmations**: `enable_confirmations = false` en `config.toml` para la mayoría de los perfiles locales. No esperes ver mail en Inbucket salvo que lo habilites.
- **Webhooks a servicios externos**: no salen del container.
- **Vercel preview URLs**: son para prod/preview, no locales.

## 8. Checklist rápido antes de reportar "funciona"

- [ ] `supabase status` todos los servicios "RUNNING".
- [ ] Migración específica listada en `select version from supabase_migrations.schema_migrations`.
- [ ] Trigger presente en `pg_trigger` cuando aplica.
- [ ] Un query a la tabla destino devuelve la fila esperada después del flujo UI.
- [ ] Para casos "default-del-trigger" o "behavior post-submit": verificar con curl directo adicionalmente.

## Devin Secrets Needed

Ninguno — todo se hace contra stack local sin credenciales de prod. Si llega a necesitarse una prueba contra staging se usa `STAGING_SUPABASE_URL` + `STAGING_SUPABASE_SERVICE_ROLE_KEY` (no scoped para esta skill todavía).
