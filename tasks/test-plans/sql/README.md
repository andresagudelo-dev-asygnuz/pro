# SQL verification scripts — G5 QA

Scripts idempotentes que validan RLS, triggers y funciones `SECURITY DEFINER`
de las HUs del MVP.

## Cómo correr

```bash
cd apps/web
supabase start   # levanta el stack local + aplica migraciones
export SB_DB="postgresql://postgres:postgres@localhost:54322/postgres"

for f in ../tasks/test-plans/sql/*.sql; do
  [ "$(basename "$f")" = "README.md" ] && continue
  echo "== $(basename "$f") =="
  psql "$SB_DB" -v ON_ERROR_STOP=1 -f "$f"
  echo ""
done
```

Cada script emite líneas `NOTICE: [PASS] ...` o `NOTICE: [FAIL] ...`. El
pipe anterior se detiene al primer error SQL; los fallos lógicos no detienen
(quedan como `FAIL` en la salida para revisión humana).

## Patrones

- Cada script abre una transacción `begin;` / `rollback;` para no ensuciar
  la DB. Los recursos creados (users, torneos, equipos, matches) se
  descartan automáticamente.
- Los usuarios de prueba se crean vía `supabase.auth.admin.createUser`
  simulado mediante insert directo a `auth.users` con `raw_app_meta_data`
  poblado. Eso permite `set local role authenticated; set local "request.jwt.claims"
  = '...'` para ejercer RLS como ese usuario.
- Identificadores determinísticos vía `gen_random_uuid()` + variables `\set`.

## Scripts

| Archivo | HU | Cubre |
|---------|----|-------|
| `hu001-user-roles-rls.sql` | HU-001 | `user_roles_read_self` bloquea lectura ajena |
| `hu001-signup-trigger.sql` | HU-001 | `on_auth_user_created_roles` defaultea flags |
| `hu002-age-verifications-rls.sql` | HU-002 | `age_verifications_read_self` bloquea lectura ajena |
| `hu002-find-unverified-users.sql` | HU-002, HU-005 | RPC bypass RLS retorna correctamente |
| `hu003-visibility.sql` | HU-003 | Catálogo `visibility_fields` + `profile_field_visibility` |
| `hu003-rls.sql` | HU-003 | RLS escritura ajena |
| `hu004-rls.sql` | HU-004 | Write tournaments ajena + lectura de borrador ajeno |
| `hu005-enforce-capacity.sql` | HU-005 | Trigger raise `tournament_full` / `tournament_not_open` |
| `hu005-sprint6-rls-with-check.sql` | HU-005 | 🔴 Sprint 6: self no puede auto-promover |
| `hu005-sprint6-reconfirm-blocked.sql` | HU-005 | 🔴 Sprint 6: re-confirm sobre torneo cerrado falla |
| `hu005-find-unverified-cross-user.sql` | HU-005 | RPC con members ajenos |
| `hu006-mat-view-exists.sql` | HU-006 | 🔴 Sprint 5: mat view populada al init |
| `hu006-refresh.sql` | HU-006 | Trigger refresh concurrente sin error |
