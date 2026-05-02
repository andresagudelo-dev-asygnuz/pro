-- HU-004 · RLS tournaments
-- Valida:
--   1) Borrador ajeno NO se lista a stranger (policy SELECT WHERE status IN(...)).
--   2) Stranger no puede UPDATE tournament ajeno (USING owner_id = auth.uid()).
--   3) Torneo publicado SÍ es visible a stranger (status ∈ abierto/cerrado/finalizado).

begin;

insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000001001', '00000000-0000-0000-0000-000000000000', 'trn_owner@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000001002', '00000000-0000-0000-0000-000000000000', 'trn_stranger@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Setup como superuser: crear torneo borrador del owner (bypass RLS).
insert into public.tournaments(id, owner_id, name, format, slots, location, start_date, end_date, status)
values (
  '00000000-0000-4000-8000-000000001111',
  '00000000-0000-4000-8000-000000001001',
  'Torneo QA', 'liga', 8, 'Pereira', current_date + 10, current_date + 30, 'borrador'
);

-- Impersonar stranger.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000001002","role":"authenticated"}';

do $$
declare affected int; cnt int;
begin
  -- Borrador ajeno oculto en SELECT.
  select count(*) into cnt from public.tournaments where id = '00000000-0000-4000-8000-000000001111';
  if cnt = 0 then
    raise notice '[PASS] borrador ajeno oculto en SELECT';
  else
    raise notice '[FAIL] borrador ajeno visible (% filas)', cnt;
  end if;

  -- UPDATE ajeno bloqueado.
  update public.tournaments set name = 'Hackeado' where id = '00000000-0000-4000-8000-000000001111';
  get diagnostics affected = row_count;
  if affected = 0 then
    raise notice '[PASS] stranger no puede UPDATE tournaments ajenos (0 filas)';
  else
    raise notice '[FAIL] stranger updateó % filas', affected;
  end if;
end $$;

-- Publicar el torneo como superuser (evitamos la policy de UPDATE owner-only).
reset role;
update public.tournaments
  set status = 'abierto_inscripciones'
  where id = '00000000-0000-4000-8000-000000001111';

-- Ahora el stranger debe poder LEER el torneo publicado.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000001002","role":"authenticated"}';

do $$
declare cnt int;
begin
  select count(*) into cnt from public.tournaments where id = '00000000-0000-4000-8000-000000001111';
  if cnt = 1 then
    raise notice '[PASS] torneo publicado visible a stranger';
  else
    raise notice '[FAIL] torneo publicado invisible (% filas)', cnt;
  end if;
end $$;

rollback;
