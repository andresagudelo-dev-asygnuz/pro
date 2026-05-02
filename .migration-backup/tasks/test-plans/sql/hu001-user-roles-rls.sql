-- HU-001 · RLS user_roles
-- Nota importante: la migración Sprint 1 tiene DOS policies de SELECT:
--   · user_roles_read_self (auth.uid() = user_id)
--   · user_roles_read_public_badges (authenticated → puede leer todas)
-- Esto es intencional (ADR-004 §4): cualquier autenticado puede leer los
-- flags is_player/is_promoter para renderizar badges en perfiles públicos.
-- Este script valida:
--   1) Autenticado puede leer las flags de otro user (policy pública).
--   2) Autenticado NO puede UPDATEar el registro de otro (policy update_self).

begin;

insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000a01', '00000000-0000-0000-0000-000000000000', 'rls_a@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000a02', '00000000-0000-0000-0000-000000000000', 'rls_b@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- El trigger on_auth_user_created_roles ya creó las filas con safeguard;
-- sobre-escribir para que los valores sean determinísticos.
update public.user_roles set is_player = true,  is_promoter = false where user_id = '00000000-0000-4000-8000-000000000a01';
update public.user_roles set is_player = false, is_promoter = true  where user_id = '00000000-0000-4000-8000-000000000a02';

-- Impersonar user A (autenticado).
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000a01","role":"authenticated"}';

do $$
declare cnt int;
begin
  select count(*) into cnt from public.user_roles where user_id = '00000000-0000-4000-8000-000000000a02';
  if cnt = 1 then
    raise notice '[PASS] user_roles_read_public_badges: autenticado lee flags ajenos (1 fila)';
  else
    raise notice '[FAIL] lectura de flags ajenos inesperada (% filas)', cnt;
  end if;
end $$;

-- Intento de UPDATE ajeno → policy update_self bloquea (0 filas).
do $$
declare affected int;
begin
  update public.user_roles
    set is_promoter = true
    where user_id = '00000000-0000-4000-8000-000000000a02';
  get diagnostics affected = row_count;
  if affected = 0 then
    raise notice '[PASS] user A no puede UPDATE user_roles ajenos (0 filas)';
  else
    raise notice '[FAIL] user A updateó % filas ajenas — RLS rota', affected;
  end if;
end $$;

rollback;
