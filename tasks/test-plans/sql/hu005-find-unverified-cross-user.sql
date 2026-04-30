-- HU-005 · find_unverified_users usado por un capitán para validar miembros.
-- Simula el uso real desde registerTeamToTournament: el capitán llama la RPC
-- pasando user_ids de su team para saber quién NO está aprobado, sin tener
-- permisos RLS para leer age_verifications ajenos.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000005001', 'tc_captain@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000005002', 'tc_m1@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000005003', 'tc_m2@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Captain verificado, m1 verificado, m2 sin fila.
insert into public.age_verifications (user_id, status) values
  ('00000000-0000-4000-8000-000000005001', 'aprobada'),
  ('00000000-0000-4000-8000-000000005002', 'aprobada')
on conflict (user_id) do update set status = excluded.status;

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000005001","role":"authenticated"}';

do $$
declare unverified uuid[];
begin
  select public.find_unverified_users(
    array[
      '00000000-0000-4000-8000-000000005001'::uuid,
      '00000000-0000-4000-8000-000000005002'::uuid,
      '00000000-0000-4000-8000-000000005003'::uuid
    ]
  ) into unverified;

  if array_length(unverified, 1) = 1
     and '00000000-0000-4000-8000-000000005003'::uuid = any(unverified)
  then
    raise notice '[PASS] capitán ve que solo m2 no está verificado';
  else
    raise notice '[FAIL] resultado inesperado: %', unverified;
  end if;
end $$;

rollback;
