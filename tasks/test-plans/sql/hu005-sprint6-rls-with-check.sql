-- HU-005 · 🔴 Sprint 6 hardening: RLS tr_update_self_or_owner con WITH CHECK
-- Antes del Sprint 6: PostgreSQL defaulteaba WITH CHECK = USING, permitiendo
-- que un usuario con `registered_by = auth.uid()` se auto-promoviera de
-- `lista_espera` a `confirmada` sin pasar por el promotor.
-- Post Sprint 6: WITH CHECK restringe a:
--   - owner del torneo → confirmada | lista_espera | cancelada
--   - registered_by → solo cancelada

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000003001', 'wc_owner@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000003002', 'wc_player@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.age_verifications (user_id, status) values
  ('00000000-0000-4000-8000-000000003002', 'aprobada')
on conflict (user_id) do update set status = excluded.status;

insert into public.tournaments(id, owner_id, name, format, slots, location, start_date, end_date, status)
values (
  '00000000-0000-4000-8000-000000003111',
  '00000000-0000-4000-8000-000000003001',
  'WithCheck', 'liga', 0, 'Pereira', current_date + 10, current_date + 30, 'abierto_inscripciones'
);

-- Owner inserta a jugador en lista_espera (cupos=0 → no entra como confirmada,
-- pero el trigger lo permite en lista_espera).
insert into public.tournament_registrations(id, tournament_id, user_id, status, registered_by)
values (
  '00000000-0000-4000-8000-000000003211',
  '00000000-0000-4000-8000-000000003111',
  '00000000-0000-4000-8000-000000003002',
  'lista_espera',
  '00000000-0000-4000-8000-000000003002'
);

-- Impersonar al jugador: debe NO poder setear 'confirmada'.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000003002","role":"authenticated"}';

do $$
declare ok boolean;
begin
  begin
    update public.tournament_registrations
      set status = 'confirmada'
      where id = '00000000-0000-4000-8000-000000003211';
    ok := true;
  exception when others then
    ok := false;
    raise notice '[PASS] jugador NO pudo auto-promoverse a confirmada (%)', sqlerrm;
  end;

  -- Si el update no levantó excepción, verificar si realmente se aplicó.
  if ok then
    declare
      s text;
    begin
      select status into s from public.tournament_registrations where id='00000000-0000-4000-8000-000000003211';
      if s = 'confirmada' then
        raise notice '[FAIL] jugador se auto-promovió a confirmada — WITH CHECK rota';
      else
        raise notice '[PASS] update silenciosamente no tomó efecto (status=%)', s;
      end if;
    end;
  end if;
end $$;

-- Jugador SÍ puede cancelar (cancelada).
do $$
declare affected int;
begin
  update public.tournament_registrations
    set status = 'cancelada'
    where id = '00000000-0000-4000-8000-000000003211';
  get diagnostics affected = row_count;
  if affected = 1 then
    raise notice '[PASS] jugador PUEDE setear cancelada';
  else
    raise notice '[FAIL] jugador no pudo cancelar (% filas)', affected;
  end if;
end $$;

rollback;
