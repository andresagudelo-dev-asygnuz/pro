-- HU-002 · RLS age_verifications_read_self
-- Verifica que un usuario no puede leer verificaciones ajenas (excepto admin).

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000c01', 'av_a@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000c02', 'av_b@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000c03', 'av_admin@test.local', '', now(), '{"provider":"email","role":"admin"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.age_verifications (user_id, status)
values
  ('00000000-0000-4000-8000-000000000c01', 'aprobada'),
  ('00000000-0000-4000-8000-000000000c02', 'pendiente')
on conflict (user_id) do update set status = excluded.status;

-- Impersonar user A.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000c01","role":"authenticated"}';

do $$
declare cnt int;
begin
  select count(*) into cnt from public.age_verifications where user_id = '00000000-0000-4000-8000-000000000c02';
  if cnt = 0 then
    raise notice '[PASS] user A no lee verificación de B';
  else
    raise notice '[FAIL] user A leyó verificación de B (% filas)', cnt;
  end if;
end $$;

-- Impersonar admin (distingue por raw_app_meta_data.role).
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000c03","role":"authenticated","app_metadata":{"role":"admin"}}';

do $$
declare cnt int;
begin
  select count(*) into cnt from public.age_verifications;
  if cnt >= 2 then
    raise notice '[PASS] admin lee todas las verificaciones (% filas)', cnt;
  else
    raise notice '[FAIL] admin no lee todas (% filas)', cnt;
  end if;
end $$;

rollback;
