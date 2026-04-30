-- ============================================================================
-- G4 Sprint 6 · Hotfixes HU-005 tournament_registrations
--
-- Atiende los dos 🔴 reportados por Devin Review en PR #29 que se difirieron
-- al cierre del sprint anterior:
--
--   1. `sync_tournament_slots_on_status_change` no validaba el estado del
--      torneo al transicionar de `cancelada`/`lista_espera` → `confirmada`,
--      permitiendo re-confirmar inscripciones después de que el torneo
--      pasara a `cerrado_inscripciones`, `cancelado` o `finalizado`.
--      El INSERT trigger `enforce_tournament_capacity` sí valida esto.
--
--   2. La policy RLS `tr_update_self_or_owner` solo tenía `USING` sin
--      `WITH CHECK`, de modo que PostgreSQL toma el mismo `USING` como
--      check y como `registered_by` no cambia durante un update, cualquier
--      usuario con `registered_by = auth.uid()` podía setear cualquier
--      `status` (por ejemplo, auto-promocionarse de `lista_espera` o
--      `cancelada` a `confirmada` saltando al promotor).
--
-- Ambos fixes son acotados a la tabla `public.tournament_registrations`
-- y NO cambian la API pública ni el comportamiento esperado por los tests
-- existentes (el capitán sigue pudiendo cancelar su inscripción y el
-- promotor sigue pudiendo mover entre confirmada/lista_espera).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Trigger sync_tournament_slots_on_status_change con validación de
--    `tournament.status = 'abierto_inscripciones'` al volver a `confirmada`.
-- ---------------------------------------------------------------------------
create or replace function public.sync_tournament_slots_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slots             int;
  v_slots_filled      int;
  v_tournament_status public.tournament_status;
begin
  if OLD.status = NEW.status then
    return NEW;
  end if;

  select slots, slots_filled, status
    into v_slots, v_slots_filled, v_tournament_status
  from public.tournaments
  where id = NEW.tournament_id
  for update;

  if OLD.status = 'confirmada' and NEW.status <> 'confirmada' then
    -- Liberación de cupo (cancelación, lista_espera, etc.). No requiere que
    -- el torneo esté abierto; cancelar un inscripto de un torneo ya cerrado
    -- sigue siendo legítimo.
    update public.tournaments
      set slots_filled = greatest(0, v_slots_filled - 1)
      where id = NEW.tournament_id;
  elsif OLD.status <> 'confirmada' and NEW.status = 'confirmada' then
    -- Re-confirmación: tiene que respetar la misma regla que el INSERT
    -- trigger `enforce_tournament_capacity`, es decir, el torneo debe estar
    -- en `abierto_inscripciones`. De lo contrario, un registro ya creado
    -- podría saltarse la ventana de inscripción.
    if v_tournament_status <> 'abierto_inscripciones' then
      raise exception 'tournament_not_open' using errcode = 'P0001';
    end if;

    if v_slots_filled >= v_slots then
      raise exception 'tournament_full' using errcode = 'P0001';
    end if;

    update public.tournaments
      set slots_filled = v_slots_filled + 1
      where id = NEW.tournament_id;
  end if;

  return NEW;
end;
$$;

-- El trigger ya está creado en el Sprint 5 (`tr_before_update_sync_slots`);
-- como hicimos `create or replace function`, no hace falta recrear el
-- trigger — apunta al OID del proc y adopta la nueva definición.

-- ---------------------------------------------------------------------------
-- 2. RLS `tr_update_self_or_owner`: agregar WITH CHECK que restringe status
--    por rol. Reemplazamos la policy para documentar el contrato completo.
--
--    Reglas:
--    - El `registered_by` (capitán o jugador solo) puede actualizar sus
--      propias filas SOLO para pasarlas a `cancelada`. Cualquier otro
--      status lo rechaza RLS.
--    - El promotor (`tournaments.owner_id`) puede setear `confirmada`,
--      `lista_espera` o `cancelada`.
--
--    La validación de `status = 'abierto_inscripciones'` para permitir
--    volver a confirmada sigue ocurriendo en el trigger
--    `sync_tournament_slots_on_status_change` (fix 1 de esta migración),
--    por lo que RLS y trigger se complementan sin duplicarse.
-- ---------------------------------------------------------------------------
drop policy if exists "tr_update_self_or_owner" on public.tournament_registrations;

create policy "tr_update_self_or_owner"
  on public.tournament_registrations for update
  using (
    registered_by = auth.uid()
    or exists (
      select 1 from public.tournaments tr
      where tr.id = tournament_registrations.tournament_id
        and tr.owner_id = auth.uid()
    )
  )
  with check (
    -- Rama promotor: dueño del torneo puede setear los tres estados
    -- operativos (`confirmada`, `lista_espera`, `cancelada`).
    exists (
      select 1 from public.tournaments tr
      where tr.id = tournament_registrations.tournament_id
        and tr.owner_id = auth.uid()
    )
    -- Rama self: quien inscribió solo puede cancelar; cualquier otro
    -- destino queda fuera del WITH CHECK y PostgreSQL rechaza la fila.
    or (
      registered_by = auth.uid()
      and status = 'cancelada'
    )
  );

comment on policy "tr_update_self_or_owner" on public.tournament_registrations is
  'Sprint 6 hotfix: el registered_by solo puede transicionar a cancelada; '
  'el promotor (tournaments.owner_id) puede setear confirmada/lista_espera/cancelada. '
  'La regla de cupos / torneo abierto se valida adicionalmente en el trigger '
  'sync_tournament_slots_on_status_change.';
