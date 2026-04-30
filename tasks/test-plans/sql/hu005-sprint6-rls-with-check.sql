-- HU-005 · 🔴 Sprint 6 hardening: RLS tr_update_self_or_owner con WITH CHECK
-- Antes del Sprint 6: WITH CHECK defaulteaba a USING y permitía que un
-- usuario con `registered_by = auth.uid()` se auto-promoviera de
-- `lista_espera` a `confirmada` sin pasar por el promotor.
-- Post Sprint 6: la rama self del WITH CHECK exige `status = 'cancelada'`.

begin;

insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, aud, role)
values
  ('00000000-0000-4000-8000-000000003001', '00000000-0000-0000-0000-000000000000', 'wc_owner@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-000000003002', '00000000-0000-0000-0000-000000000000', 'wc_player@test.local', '', now(), '{"provider":"email"}', '{}', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Seed: torneo con slots=1 (CHECK slots > 0 en public.tournaments), y una
-- registration del jugador en `lista_espera`. El trigger permite
-- lista_espera sin ocupar cupo (solo cuenta `confirmada`).
insert into public.tournaments(id, owner_id, name, format, slots, location, start_date, end_date, status)
values (
  '00000000-0000-4000-8000-000000003111',
  '00000000-0000-4000-8000-000000003001',
  'WithCheck', 'liga', 1, 'Pereira', current_date + 10, current_date + 30, 'abierto_inscripciones'
);

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
declare s_after text;
begin
  begin
    update public.tournament_registrations
      set status = 'confirmada'
      where id = '00000000-0000-4000-8000-000000003211';
    -- Si llegamos acá, el UPDATE no levantó excepción. Verificar estado real:
    select status::text into s_after from public.tournament_registrations
      where id = '00000000-0000-4000-8000-000000003211';
    if s_after = 'confirmada' then
      raise notice '[FAIL] jugador se auto-promovió a confirmada — WITH CHECK rota';
    else
      raise notice '[PASS] UPDATE no tomó efecto (status=% pendiente de policy)', s_after;
    end if;
  exception when others then
    raise notice '[PASS] jugador NO pudo auto-promoverse a confirmada (%)', sqlerrm;
  end;
end $$;

-- Jugador SÍ puede setear cancelada (rama self del WITH CHECK).
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
