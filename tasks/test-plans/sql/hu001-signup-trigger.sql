-- HU-001 · Trigger on_auth_user_created_roles defaultea flags.
-- Contrato (ver migración 20260417130000 líneas 104-107):
--   si ambos vienen false/ausentes → setea is_player=true (safeguard minimal).
--   signup mínimo = jugador. NO defaultea promotor.

begin;

-- Caso 1: ambos flags false → trigger defaultea solo is_player=true.
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000b01', '00000000-0000-0000-0000-000000000000', 'signup_both_false@test.local', '', now(),
   '{"provider":"email"}',
   '{"is_player": false, "is_promoter": false}',
   'authenticated', 'authenticated');

-- Caso 2: solo jugador.
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000b02', '00000000-0000-0000-0000-000000000000', 'signup_player@test.local', '', now(),
   '{"provider":"email"}',
   '{"is_player": true, "is_promoter": false}',
   'authenticated', 'authenticated');

-- Caso 3: solo promotor.
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000b03', '00000000-0000-0000-0000-000000000000', 'signup_promoter@test.local', '', now(),
   '{"provider":"email"}',
   '{"is_player": false, "is_promoter": true}',
   'authenticated', 'authenticated');

-- Caso 4: ambos true.
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000b04', '00000000-0000-0000-0000-000000000000', 'signup_both_true@test.local', '', now(),
   '{"provider":"email"}',
   '{"is_player": true, "is_promoter": true}',
   'authenticated', 'authenticated');

do $$
declare r record;
begin
  select * into r from public.user_roles where user_id = '00000000-0000-4000-8000-000000000b01';
  if r.is_player and not r.is_promoter then
    raise notice '[PASS] safeguard: ambos false → is_player=true, is_promoter=false';
  else
    raise notice '[FAIL] safeguard roto: is_player=%, is_promoter=%', r.is_player, r.is_promoter;
  end if;

  select * into r from public.user_roles where user_id = '00000000-0000-4000-8000-000000000b02';
  if r.is_player and not r.is_promoter then
    raise notice '[PASS] solo jugador';
  else
    raise notice '[FAIL] solo jugador: is_player=%, is_promoter=%', r.is_player, r.is_promoter;
  end if;

  select * into r from public.user_roles where user_id = '00000000-0000-4000-8000-000000000b03';
  if not r.is_player and r.is_promoter then
    raise notice '[PASS] solo promotor';
  else
    raise notice '[FAIL] solo promotor: is_player=%, is_promoter=%', r.is_player, r.is_promoter;
  end if;

  select * into r from public.user_roles where user_id = '00000000-0000-4000-8000-000000000b04';
  if r.is_player and r.is_promoter then
    raise notice '[PASS] ambos roles';
  else
    raise notice '[FAIL] ambos roles: is_player=%, is_promoter=%', r.is_player, r.is_promoter;
  end if;
end $$;

rollback;
