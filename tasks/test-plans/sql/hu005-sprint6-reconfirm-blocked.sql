-- HU-005 · 🔴 Sprint 6 hardening: sync_tournament_slots_on_status_change
-- Antes del Sprint 6: cuando una registration pasaba cancelada → confirmada,
-- el trigger solo validaba cupos, no el estado del torneo.
-- Post Sprint 6: valida que tournament.status = 'abierto_inscripciones'.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000004001', 'rc_owner@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000004002', 'rc_player@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.age_verifications (user_id, status) values
  ('00000000-0000-4000-8000-000000004002', 'aprobada')
on conflict (user_id) do update set status = excluded.status;

insert into public.tournaments(id, owner_id, name, format, slots, location, start_date, end_date, status)
values (
  '00000000-0000-4000-8000-000000004111',
  '00000000-0000-4000-8000-000000004001',
  'Reconfirm', 'liga', 4, 'Pereira', current_date + 10, current_date + 30, 'abierto_inscripciones'
);

-- Insert confirmada.
insert into public.tournament_registrations(id, tournament_id, user_id, status, registered_by)
values (
  '00000000-0000-4000-8000-000000004211',
  '00000000-0000-4000-8000-000000004111',
  '00000000-0000-4000-8000-000000004002',
  'confirmada',
  '00000000-0000-4000-8000-000000004002'
);

-- Cancelar la registration (para después intentar re-confirmar).
update public.tournament_registrations
  set status = 'cancelada'
  where id = '00000000-0000-4000-8000-000000004211';

-- Cerrar inscripciones del torneo.
update public.tournaments
  set status = 'cerrado_inscripciones'
  where id = '00000000-0000-4000-8000-000000004111';

-- Impersonar al owner para re-confirmar (el owner sí podría, pero el TRIGGER
-- debe bloquearlo por estado del torneo).
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000004001","role":"authenticated"}';

do $$
declare ok boolean;
begin
  begin
    update public.tournament_registrations
      set status = 'confirmada'
      where id = '00000000-0000-4000-8000-000000004211';
    ok := true;
  exception when others then
    ok := false;
    if sqlerrm like '%tournament_not_open%' then
      raise notice '[PASS] re-confirm bloqueado con tournament_not_open';
    else
      raise notice '[FAIL] re-confirm falló por otra razón: %', sqlerrm;
    end if;
  end;

  if ok then
    raise notice '[FAIL] re-confirm sobre torneo cerrado permitido — trigger Sprint 6 no aplicado';
  end if;
end $$;

rollback;
