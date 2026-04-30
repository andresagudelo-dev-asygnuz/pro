-- HU-001 · Trigger on_auth_user_created_roles defaultea flags.
-- Cuando raw_user_meta_data tiene ambos flags en false (o ausentes), el
-- trigger debe setear ambos a true como safeguard.

begin;

-- Caso 1: ambos flags false → trigger defaultea a ambos true.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000b01', 'signup_both_false@test.local', '', now(),
   '{"provider":"email"}',
   '{"is_player": false, "is_promoter": false}',
   'authenticated', 'authenticated');

-- Caso 2: solo jugador.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000b02', 'signup_player@test.local', '', now(),
   '{"provider":"email"}',
   '{"is_player": true, "is_promoter": false}',
   'authenticated', 'authenticated');

-- Caso 3: solo promotor.
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000b03', 'signup_promoter@test.local', '', now(),
   '{"provider":"email"}',
   '{"is_player": false, "is_promoter": true}',
   'authenticated', 'authenticated');

do $$
declare r record;
begin
  select * into r from public.user_roles where user_id = '00000000-0000-4000-8000-000000000b01';
  if r.is_player and r.is_promoter then
    raise notice '[PASS] safeguard: ambos false → ambos true';
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
end $$;

rollback;
