-- Hardening migration for MVP audit fixes (Fase A + B).
--
-- Aditiva: solo ADDs + CREATEs + CREATE OR REPLACE. No elimina, renombra,
-- ni cambia tipos de columnas existentes, para garantizar que no rompe
-- datos ya persistidos ni clientes conectados.

-- 1. ───────────────────────────────────────────────────────────────
-- Length caps y checks defensivos en texto libre. Anti DB-bomb.
-- Uso `do $$ ... $$` para idempotencia sin depender de IF NOT EXISTS
-- (no disponible para ADD CONSTRAINT en Postgres < 17).
-- ───────────────────────────────────────────────────────────────

do $block$
declare
  v record;
begin
  for v in
    select *
    from (values
      ('profiles', 'profiles_bio_length_check',
       'bio is null or char_length(bio) <= 500'),
      ('profiles', 'profiles_full_name_length_check',
       'full_name is null or char_length(full_name) <= 80'),
      ('profiles', 'profiles_city_length_check',
       'city is null or char_length(city) <= 80'),
      ('matches', 'matches_title_length_check',
       'char_length(title) between 3 and 120'),
      ('matches', 'matches_description_length_check',
       'description is null or char_length(description) <= 2000'),
      ('matches', 'matches_city_length_check',
       'char_length(city) between 1 and 80'),
      ('matches', 'matches_location_length_check',
       'char_length(location) between 1 and 200'),
      ('matches', 'matches_duration_length_check',
       'duration_minutes between 1 and 600'),
      ('matches', 'matches_max_players_cap_check',
       'max_players between 2 and 64'),
      ('messages', 'messages_content_length_check',
       'char_length(content) between 1 and 2000')
    ) as t(tbl, cons, def)
  loop
    if not exists (
      select 1 from pg_constraint c
      join pg_class r on r.oid = c.conrelid
      join pg_namespace n on n.oid = r.relnamespace
      where n.nspname = 'public' and r.relname = v.tbl and c.conname = v.cons
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%s) not valid',
        v.tbl, v.cons, v.def
      );
      execute format(
        'alter table public.%I validate constraint %I', v.tbl, v.cons
      );
    end if;
  end loop;
end
$block$;


-- 2. ───────────────────────────────────────────────────────────────
-- Trigger: organizador NO puede salirse de su propio partido.
-- Pre-existente, la API app bloquea, pero defense-in-depth a nivel DB.
-- ───────────────────────────────────────────────────────────────

create or replace function public.prevent_organizer_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organizer uuid;
begin
  select organizer_id into v_organizer
  from public.matches
  where id = coalesce(old.match_id, new.match_id);

  if v_organizer = coalesce(old.user_id, new.user_id) then
    if (tg_op = 'DELETE')
       or (tg_op = 'UPDATE' and new.status in ('left', 'no_show')) then
      raise exception 'organizer_cannot_leave'
        using errcode = 'P0001',
              hint = 'Cancela el partido con cancelMatch en su lugar.';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists tr_prevent_organizer_leave on public.match_participants;
create trigger tr_prevent_organizer_leave
  before delete or update on public.match_participants
  for each row execute function public.prevent_organizer_leave();


-- 3. ───────────────────────────────────────────────────────────────
-- Rate limiting backed por Postgres.
-- Tabla efímera (un row por key), función SECURITY DEFINER que hace
-- el upsert atómico. Los clientes NO pueden leer/escribir la tabla
-- directamente — solo a través de la función.
-- ───────────────────────────────────────────────────────────────

create table if not exists public.rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);

-- La tabla no tiene RLS — es accedida solo vía la función SECURITY DEFINER.
-- Revocamos privilegios directos para que anon/authenticated no la toquen.
revoke all on public.rate_limits from public;
revoke all on public.rate_limits from anon;
revoke all on public.rate_limits from authenticated;

create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as rl (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
        when (now() - rate_limits.window_start) > make_interval(secs => p_window_seconds)
        then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when (now() - rate_limits.window_start) > make_interval(secs => p_window_seconds)
        then now()
        else rate_limits.window_start
      end
  returning count into v_count;

  if v_count > p_max then
    raise exception 'rate_limited: % of % requests in % seconds', v_count, p_max, p_window_seconds
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;


-- 4. ───────────────────────────────────────────────────────────────
-- Transición automática open → full cuando se llega al cupo.
-- Simétrica: si alguien deja el partido y estaba full → vuelve a open.
-- Se ejecuta después del enforce_match_capacity y de prevent_organizer_leave.
-- ───────────────────────────────────────────────────────────────

create or replace function public.sync_match_status_on_roster_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid := coalesce(new.match_id, old.match_id);
  v_count integer;
  v_max integer;
  v_status match_status;
begin
  select m.max_players, m.status into v_max, v_status
  from public.matches m
  where m.id = v_match_id;

  if not found then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  -- Solo tocamos transiciones entre open y full; in_progress/completed/cancelled
  -- son estados "manuales" que no dependen del roster.
  if v_status not in ('open', 'full') then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select count(*) into v_count
  from public.match_participants
  where match_id = v_match_id and status = 'joined';

  if v_count >= v_max and v_status = 'open' then
    update public.matches set status = 'full' where id = v_match_id;
  elsif v_count < v_max and v_status = 'full' then
    update public.matches set status = 'open' where id = v_match_id;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists tr_sync_match_status on public.match_participants;
create trigger tr_sync_match_status
  after insert or update or delete on public.match_participants
  for each row execute function public.sync_match_status_on_roster_change();


-- 5. ───────────────────────────────────────────────────────────────
-- Defense-in-depth adicional para messages: asegurar que el status del
-- partido no sea 'cancelled' o 'completed' antes de aceptar mensajes.
-- La política RLS pre-existente valida que el sender sea participante,
-- pero no el status; agregamos un CHECK via trigger.
-- ───────────────────────────────────────────────────────────────

create or replace function public.prevent_messages_on_closed_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status match_status;
begin
  select status into v_status from public.matches where id = new.match_id;
  if v_status in ('cancelled', 'completed') then
    raise exception 'match_closed: cannot send messages to a % match', v_status
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists tr_prevent_messages_on_closed on public.messages;
create trigger tr_prevent_messages_on_closed
  before insert on public.messages
  for each row execute function public.prevent_messages_on_closed_match();
