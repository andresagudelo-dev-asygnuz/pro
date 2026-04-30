-- HU-005 · Trigger enforce_tournament_capacity
-- Verifica que:
--  1) un insert en torneo cerrado → raise tournament_not_open
--  2) un insert sobre torneo lleno → raise tournament_full
--  3) slots_filled se actualiza atómicamente en inserts confirmados

begin;

insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000002001', '00000000-0000-0000-0000-000000000000', 'cap_owner@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000002002', '00000000-0000-0000-0000-000000000000', 'cap_u1@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000002003', '00000000-0000-0000-0000-000000000000', 'cap_u2@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- age_verifications no tiene UNIQUE sobre user_id. Status 'aprobada'
-- requiere reviewed_at/reviewed_by por check constraint.
delete from public.age_verifications
  where user_id in (
    '00000000-0000-4000-8000-000000002002',
    '00000000-0000-4000-8000-000000002003'
  );
insert into public.age_verifications (user_id, status, reviewed_at, reviewed_by) values
  ('00000000-0000-4000-8000-000000002002', 'aprobada', now(), '00000000-0000-4000-8000-000000002001'),
  ('00000000-0000-4000-8000-000000002003', 'aprobada', now(), '00000000-0000-4000-8000-000000002001');

-- Torneo borrador con slots=1.
insert into public.tournaments(id, owner_id, name, format, slots, location, start_date, end_date, status)
values (
  '00000000-0000-4000-8000-000000002111',
  '00000000-0000-4000-8000-000000002001',
  'Cap Test', 'liga', 1, 'Pereira', current_date + 10, current_date + 30, 'borrador'
);

-- Test 1: insert sobre torneo en borrador debe fallar con tournament_not_open.
do $$
declare ok boolean;
begin
  begin
    insert into public.tournament_registrations(tournament_id, user_id, status, registered_by)
    values ('00000000-0000-4000-8000-000000002111', '00000000-0000-4000-8000-000000002002', 'confirmada', '00000000-0000-4000-8000-000000002002');
    ok := true;
  exception when others then
    ok := false;
    if sqlerrm like '%tournament_not_open%' then
      raise notice '[PASS] inscripción sobre torneo borrador raised tournament_not_open';
    else
      raise notice '[FAIL] inscripción borrador falló por otra razón: %', sqlerrm;
    end if;
  end;
  if ok then raise notice '[FAIL] inscripción sobre torneo borrador NO falló'; end if;
end $$;

-- Abrir torneo.
update public.tournaments set status='abierto_inscripciones' where id='00000000-0000-4000-8000-000000002111';

-- Test 2: primer insert exitoso, slots_filled=1.
insert into public.tournament_registrations(tournament_id, user_id, status, registered_by)
values ('00000000-0000-4000-8000-000000002111', '00000000-0000-4000-8000-000000002002', 'confirmada', '00000000-0000-4000-8000-000000002002');

do $$
declare sf int;
begin
  select slots_filled into sf from public.tournaments where id='00000000-0000-4000-8000-000000002111';
  if sf = 1 then
    raise notice '[PASS] slots_filled=1 tras primera inscripción confirmada';
  else
    raise notice '[FAIL] slots_filled=%', sf;
  end if;
end $$;

-- Test 3: segundo insert debe fallar con tournament_full.
do $$
declare ok boolean;
begin
  begin
    insert into public.tournament_registrations(tournament_id, user_id, status, registered_by)
    values ('00000000-0000-4000-8000-000000002111', '00000000-0000-4000-8000-000000002003', 'confirmada', '00000000-0000-4000-8000-000000002003');
    ok := true;
  exception when others then
    ok := false;
    if sqlerrm like '%tournament_full%' then
      raise notice '[PASS] segunda inscripción raised tournament_full';
    else
      raise notice '[FAIL] segunda inscripción falló por otra razón: %', sqlerrm;
    end if;
  end;
  if ok then raise notice '[FAIL] cupos llenos no detectados'; end if;
end $$;

rollback;
