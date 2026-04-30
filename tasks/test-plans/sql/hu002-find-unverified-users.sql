-- HU-002 · find_unverified_users() SECURITY DEFINER
-- Verifica que la RPC bypasea RLS y retorna el subset de users no aprobados.

begin;

insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000000d01', '00000000-0000-0000-0000-000000000000', 'fuv_captain@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000d02', '00000000-0000-0000-0000-000000000000', 'fuv_a@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000d03', '00000000-0000-0000-0000-000000000000', 'fuv_b@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000000d04', '00000000-0000-0000-0000-000000000000', 'fuv_c@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- d02 aprobada, d03 pendiente, d04 sin fila → find_unverified_users debe
-- retornar [d03, d04]. Status 'aprobada' requiere reviewed_at/reviewed_by
-- no nulos por el check constraint.
delete from public.age_verifications
  where user_id in (
    '00000000-0000-4000-8000-000000000d02',
    '00000000-0000-4000-8000-000000000d03'
  );
insert into public.age_verifications (user_id, status, reviewed_at, reviewed_by) values
  ('00000000-0000-4000-8000-000000000d02', 'aprobada', now(), '00000000-0000-4000-8000-000000000d01');
insert into public.age_verifications (user_id, status) values
  ('00000000-0000-4000-8000-000000000d03', 'pendiente');

-- Impersonar al capitán (d01) — no admin, y NO puede leer las filas de los members.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000d01","role":"authenticated"}';

do $$
declare unverified uuid[];
begin
  select public.find_unverified_users(
    array[
      '00000000-0000-4000-8000-000000000d02'::uuid,
      '00000000-0000-4000-8000-000000000d03'::uuid,
      '00000000-0000-4000-8000-000000000d04'::uuid
    ]
  ) into unverified;

  -- Debe retornar d03 y d04 (pendiente y ausente), NO d02 (aprobado).
  if array_length(unverified, 1) = 2
     and '00000000-0000-4000-8000-000000000d03'::uuid = any(unverified)
     and '00000000-0000-4000-8000-000000000d04'::uuid = any(unverified)
     and not ('00000000-0000-4000-8000-000000000d02'::uuid = any(unverified))
  then
    raise notice '[PASS] find_unverified_users retorna [d03, d04] correctamente';
  else
    raise notice '[FAIL] find_unverified_users retornó %', unverified;
  end if;
end $$;

rollback;
