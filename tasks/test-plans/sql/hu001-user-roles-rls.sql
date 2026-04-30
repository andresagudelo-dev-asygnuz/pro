-- HU-001 · RLS user_roles_read_self
-- Verifica que user_roles solo permite lectura de la propia fila.

begin;

-- Crear 2 users directo en auth.users (Supabase local permite esto).
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000a01', 'rls_a@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000a02', 'rls_b@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.user_roles (user_id, is_player, is_promoter)
values
  ('00000000-0000-4000-8000-000000000a01', true, false),
  ('00000000-0000-4000-8000-000000000a02', false, true)
on conflict (user_id) do update set is_player = excluded.is_player, is_promoter = excluded.is_promoter;

-- Impersonar user A.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated"}';

do $$
declare cnt int;
begin
  select count(*) into cnt from public.user_roles where user_id = '00000000-0000-4000-8000-000000000a02';
  if cnt = 0 then
    raise notice '[PASS] user A no puede leer fila de user B (0 filas)';
  else
    raise notice '[FAIL] user A pudo leer fila de user B (% filas) — RLS rota', cnt;
  end if;

  select count(*) into cnt from public.user_roles where user_id = '00000000-0000-4000-8000-000000000a01';
  if cnt = 1 then
    raise notice '[PASS] user A lee su propia fila';
  else
    raise notice '[FAIL] user A no lee su propia fila (% filas)', cnt;
  end if;
end $$;

rollback;
