-- HU-004 · RLS tournaments_owner_write_self + lectura pública no-borrador
-- 1) user ajeno no puede modificar torneo de otro
-- 2) borrador ajeno no se lista en lecturas públicas

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000001001', 'trn_owner@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000001002', 'trn_stranger@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Crear torneo como owner.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000001001","role":"authenticated"}';

insert into public.tournaments(id, owner_id, name, format, slots, location, start_date, end_date, status)
values (
  '00000000-0000-4000-8000-000000001111',
  '00000000-0000-4000-8000-000000001001',
  'Torneo QA', 'liga', 8, 'Pereira', current_date + 10, current_date + 30, 'borrador'
);

-- Impersonar stranger.
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000001002","role":"authenticated"}';

do $$
declare affected int;
begin
  update public.tournaments set name = 'Hackeado' where id = '00000000-0000-4000-8000-000000001111';
  get diagnostics affected = row_count;
  if affected = 0 then
    raise notice '[PASS] stranger no puede updatear tournaments ajenos (0 filas)';
  else
    raise notice '[FAIL] stranger updateó % filas', affected;
  end if;

  -- Borrador ajeno no debe aparecer en SELECT.
  perform id from public.tournaments where id = '00000000-0000-4000-8000-000000001111';
  if found then
    raise notice '[FAIL] borrador ajeno visible en SELECT';
  else
    raise notice '[PASS] borrador ajeno oculto en SELECT';
  end if;
end $$;

-- Publicar el torneo desde owner.
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000001001","role":"authenticated"}';

update public.tournaments
  set status = 'abierto_inscripciones'
  where id = '00000000-0000-4000-8000-000000001111';

-- Ahora el stranger debe poder LEERLO (no-borrador es público).
reset role;
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
