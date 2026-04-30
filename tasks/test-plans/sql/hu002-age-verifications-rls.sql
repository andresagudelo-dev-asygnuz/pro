-- HU-002 · RLS age_verifications
-- Valida:
--   1) read_self: usuario autenticado NO lee verificaciones de otros.
--   2) update_blocked: nadie autenticado puede UPDATE (usa false).
--   3) delete_blocked: nadie autenticado puede DELETE (usa false).
-- Nota: no existe policy de admin — los admins usan service_role (el cliente
-- autenticado nunca promueve, ver migración Sprint 1 líneas 172-177).

begin;

insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000c01', '00000000-0000-0000-0000-000000000000', 'av_a@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000c02', '00000000-0000-0000-0000-000000000000', 'av_b@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Seed como superuser (bypasses RLS); status 'pendiente' NO requiere
-- reviewed_at/reviewed_by por el check constraint.
-- age_verifications no tiene UNIQUE sobre user_id (un mismo usuario puede
-- tener intentos previos). Limpiamos los posibles registros residuales y
-- sembramos desde cero.
delete from public.age_verifications
  where user_id in (
    '00000000-0000-4000-8000-000000000c01',
    '00000000-0000-4000-8000-000000000c02'
  );
insert into public.age_verifications (user_id, status) values
  ('00000000-0000-4000-8000-000000000c01', 'pendiente'),
  ('00000000-0000-4000-8000-000000000c02', 'pendiente');

-- Impersonar user A.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000c01","role":"authenticated"}';

do $$
declare cnt_self int; cnt_other int; upd_affected int; del_affected int;
begin
  select count(*) into cnt_self from public.age_verifications where user_id = '00000000-0000-4000-8000-000000000c01';
  if cnt_self = 1 then
    raise notice '[PASS] read_self: user A lee su propia fila';
  else
    raise notice '[FAIL] user A no lee su propia fila (% filas)', cnt_self;
  end if;

  select count(*) into cnt_other from public.age_verifications where user_id = '00000000-0000-4000-8000-000000000c02';
  if cnt_other = 0 then
    raise notice '[PASS] read_self: user A NO lee verificación de B';
  else
    raise notice '[FAIL] user A leyó verificación de B (% filas) — RLS rota', cnt_other;
  end if;

  -- update_blocked: afecta 0 filas incluso sobre self.
  update public.age_verifications set status = 'pendiente'
    where user_id = '00000000-0000-4000-8000-000000000c01';
  get diagnostics upd_affected = row_count;
  if upd_affected = 0 then
    raise notice '[PASS] update_blocked: 0 filas afectadas';
  else
    raise notice '[FAIL] UPDATE modificó % filas — policy update_blocked rota', upd_affected;
  end if;

  -- delete_blocked: afecta 0 filas.
  delete from public.age_verifications where user_id = '00000000-0000-4000-8000-000000000c01';
  get diagnostics del_affected = row_count;
  if del_affected = 0 then
    raise notice '[PASS] delete_blocked: 0 filas afectadas';
  else
    raise notice '[FAIL] DELETE eliminó % filas — policy delete_blocked rota', del_affected;
  end if;
end $$;

rollback;
