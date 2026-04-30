-- HU-006 · Trigger refresh concurrente al finalizar match.
-- Simula: 2 registrations, 1 match, finalizar → standings refleja el resultado.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000006001', 'mv_owner@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000006002', 'mv_p1@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000006003', 'mv_p2@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.age_verifications (user_id, status) values
  ('00000000-0000-4000-8000-000000006002', 'aprobada'),
  ('00000000-0000-4000-8000-000000006003', 'aprobada')
on conflict (user_id) do update set status = excluded.status;

insert into public.tournaments(id, owner_id, name, format, slots, location, start_date, end_date, status)
values (
  '00000000-0000-4000-8000-000000006111',
  '00000000-0000-4000-8000-000000006001',
  'MV Test', 'liga', 4, 'Pereira', current_date + 10, current_date + 30, 'abierto_inscripciones'
);

insert into public.tournament_registrations(id, tournament_id, user_id, status, registered_by) values
  ('00000000-0000-4000-8000-000000006211', '00000000-0000-4000-8000-000000006111', '00000000-0000-4000-8000-000000006002', 'confirmada', '00000000-0000-4000-8000-000000006002'),
  ('00000000-0000-4000-8000-000000006212', '00000000-0000-4000-8000-000000006111', '00000000-0000-4000-8000-000000006003', 'confirmada', '00000000-0000-4000-8000-000000006003');

-- Cerrar torneo (pre-requisito para crear matches).
update public.tournaments set status='cerrado_inscripciones' where id='00000000-0000-4000-8000-000000006111';

-- Crear match programado.
insert into public.tournament_matches(id, tournament_id, round, fixture_order, home_registration_id, away_registration_id, scheduled_at, status)
values (
  '00000000-0000-4000-8000-000000006311',
  '00000000-0000-4000-8000-000000006111',
  1, 1,
  '00000000-0000-4000-8000-000000006211',
  '00000000-0000-4000-8000-000000006212',
  now() + interval '1 day',
  'programado'
);

-- Finalizar match con score 2-1.
update public.tournament_matches
  set home_score = 2, away_score = 1, status = 'finalizado'
  where id = '00000000-0000-4000-8000-000000006311';

-- El trigger debe haber refrescado la mat view. Validar contadores.
do $$
declare
  p1_points int; p2_points int;
  p1_gf int; p2_gf int;
begin
  select points, goals_for into p1_points, p1_gf
  from public.standings
  where tournament_id = '00000000-0000-4000-8000-000000006111'
    and registration_id = '00000000-0000-4000-8000-000000006211';

  select points, goals_for into p2_points, p2_gf
  from public.standings
  where tournament_id = '00000000-0000-4000-8000-000000006111'
    and registration_id = '00000000-0000-4000-8000-000000006212';

  if p1_points = 3 and p1_gf = 2 and p2_points = 0 and p2_gf = 1 then
    raise notice '[PASS] standings refrescada: P1 3pts/2gf, P2 0pts/1gf';
  else
    raise notice '[FAIL] standings incorrecta: P1=%pts/%gf, P2=%pts/%gf', p1_points, p1_gf, p2_points, p2_gf;
  end if;
end $$;

rollback;
