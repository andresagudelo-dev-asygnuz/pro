-- Enforce match capacity at the database level to avoid race conditions
-- when multiple users try to join the same match concurrently.
-- The trigger locks the match row for update, counts current participants,
-- and rejects the insert if max_players has already been reached.

create or replace function public.enforce_match_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max int;
  v_count int;
begin
  -- Bloqueamos la fila del partido para serializar inserts concurrentes.
  select max_players into v_max
  from public.matches
  where id = NEW.match_id
  for update;

  if v_max is null then
    raise exception 'Match not found' using errcode = 'P0002';
  end if;

  select count(*) into v_count
  from public.match_participants
  where match_id = NEW.match_id;

  if v_count >= v_max then
    raise exception 'match_full' using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

drop trigger if exists match_participants_capacity on public.match_participants;

create trigger match_participants_capacity
  before insert on public.match_participants
  for each row execute function public.enforce_match_capacity();
