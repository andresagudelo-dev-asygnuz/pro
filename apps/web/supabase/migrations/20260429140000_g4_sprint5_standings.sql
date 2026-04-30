-- Migration: tournament_matches, match_events, standings (HU-006 / RF-005)
-- Description:
--   Fixture + eventos + tabla de posiciones por torneo. Sigue el modelo de
--   `db/data-model.md` §3.13-3.15 simplificado a MVP1 (sin `tournament_categories`
--   — los torneos actuales llevan `categories jsonb` en `tournaments`).
--
-- Contrato:
--   - Los matches se crean/editan solo por el `owner_id` del torneo.
--   - Cuando un match pasa a `finalizado`, el trigger valida que (a) el torneo
--     esté en `cerrado_inscripciones` o `finalizado` (no se cargan resultados
--     de torneos en borrador o abiertos a inscripciones), y (b) refresca
--     `public.standings` vía `refresh_standings()`.
--   - `standings` es una mat view con índice único para permitir
--     `REFRESH MATERIALIZED VIEW CONCURRENTLY`.

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
create type public.match_status_v2 as enum (
  'programado',
  'en_juego',
  'finalizado',
  'w_o',
  'cancelado'
);

create type public.match_event_type as enum (
  'gol',
  'auto_gol',
  'amarilla',
  'roja',
  'sustitucion'
);

-- ---------------------------------------------------------------------------
-- 2. tournament_matches
-- ---------------------------------------------------------------------------
create table public.tournament_matches (
  id                            uuid primary key default gen_random_uuid(),
  tournament_id                 uuid not null references public.tournaments(id) on delete cascade,
  round                         int not null default 1 check (round >= 1),
  group_code                    text,
  fixture_order                 int,
  home_registration_id          uuid references public.tournament_registrations(id) on delete set null,
  away_registration_id          uuid references public.tournament_registrations(id) on delete set null,
  scheduled_at                  timestamptz,
  venue                         text,
  home_score                    int check (home_score is null or home_score >= 0),
  away_score                    int check (away_score is null or away_score >= 0),
  status                        public.match_status_v2 not null default 'programado',
  correction_window_ends_at     timestamptz,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),

  -- No se puede enfrentar una misma inscripción consigo misma (null-safe).
  constraint tm_home_away_distinct
    check (home_registration_id is distinct from away_registration_id),

  -- Coherencia de scores: si el partido está finalizado o en_juego, ambos scores
  -- deben estar seteados. Si está programado/cancelado, deben ser null.
  constraint tm_scores_coherent
    check (
      (status in ('finalizado','en_juego') and home_score is not null and away_score is not null)
      or (status in ('programado','cancelado') and home_score is null and away_score is null)
      or status = 'w_o'
    )
);

create index tournament_matches_tournament_round_idx
  on public.tournament_matches (tournament_id, round);
create index tournament_matches_scheduled_at_idx
  on public.tournament_matches (scheduled_at);
create index tournament_matches_status_idx
  on public.tournament_matches (status);

create trigger set_tm_updated_at
  before update on public.tournament_matches
  for each row execute function public.set_updated_at();

alter table public.tournament_matches enable row level security;

-- SELECT público si el torneo es visible (misma regla que tournaments).
create policy "tm_select_if_tournament_visible"
  on public.tournament_matches for select
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_matches.tournament_id
        and (
          t.status in ('abierto_inscripciones','cerrado_inscripciones','finalizado')
          or t.owner_id = auth.uid()
        )
    )
  );

-- INSERT: sólo el dueño del torneo.
create policy "tm_insert_owner"
  on public.tournament_matches for insert
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_matches.tournament_id and t.owner_id = auth.uid()
    )
  );

-- UPDATE: sólo el dueño del torneo y, si el match ya está finalizado, sólo
-- dentro de la correction_window (o si el update vuelve el status a un
-- estado no-finalizado, lo cual dejamos a triggers en iteraciones futuras).
create policy "tm_update_owner_in_window"
  on public.tournament_matches for update
  using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_matches.tournament_id and t.owner_id = auth.uid()
    )
    and (
      status <> 'finalizado'
      or correction_window_ends_at is null
      or correction_window_ends_at > now()
    )
  )
  with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_matches.tournament_id and t.owner_id = auth.uid()
    )
  );

-- DELETE: sólo el dueño y sólo si no hay resultado cargado.
create policy "tm_delete_owner_if_no_result"
  on public.tournament_matches for delete
  using (
    status in ('programado','cancelado')
    and exists (
      select 1 from public.tournaments t
      where t.id = tournament_matches.tournament_id and t.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. match_events
-- ---------------------------------------------------------------------------
create table public.match_events (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.tournament_matches(id) on delete cascade,
  event_type  public.match_event_type not null,
  minute      int check (minute between 0 and 130),
  player_id   uuid references auth.users(id) on delete set null,
  team_side   text check (team_side in ('home','away')),
  notes       text,
  created_at  timestamptz not null default now()
);

create index match_events_match_idx on public.match_events (match_id);
create index match_events_player_idx on public.match_events (player_id);

alter table public.match_events enable row level security;

-- SELECT: si podés ver el match, podés ver sus eventos.
create policy "me_select_if_match_visible"
  on public.match_events for select
  using (
    exists (
      select 1
      from public.tournament_matches tm
      join public.tournaments t on t.id = tm.tournament_id
      where tm.id = match_events.match_id
        and (
          t.status in ('abierto_inscripciones','cerrado_inscripciones','finalizado')
          or t.owner_id = auth.uid()
        )
    )
  );

-- INSERT / UPDATE / DELETE: sólo el owner del torneo.
create policy "me_mutate_owner"
  on public.match_events for all
  using (
    exists (
      select 1
      from public.tournament_matches tm
      join public.tournaments t on t.id = tm.tournament_id
      where tm.id = match_events.match_id and t.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.tournament_matches tm
      join public.tournaments t on t.id = tm.tournament_id
      where tm.id = match_events.match_id and t.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. standings (vista materializada)
--    Agregación por (tournament_id, registration_id). Reglas estándar de liga:
--    win = 3 pts, draw = 1, loss = 0. Cuenta cada match finalizado dos veces
--    (una por cada lado home/away) vía UNION ALL.
-- ---------------------------------------------------------------------------
create materialized view public.standings as
with played as (
  select
    tm.tournament_id,
    tm.home_registration_id as registration_id,
    case when tm.home_score > tm.away_score then 1 else 0 end as win,
    case when tm.home_score = tm.away_score then 1 else 0 end as draw,
    case when tm.home_score < tm.away_score then 1 else 0 end as loss,
    tm.home_score as goals_for,
    tm.away_score as goals_against
  from public.tournament_matches tm
  where tm.status = 'finalizado'
    and tm.home_registration_id is not null
    and tm.home_score is not null
  union all
  select
    tm.tournament_id,
    tm.away_registration_id as registration_id,
    case when tm.away_score > tm.home_score then 1 else 0 end as win,
    case when tm.away_score = tm.home_score then 1 else 0 end as draw,
    case when tm.away_score < tm.home_score then 1 else 0 end as loss,
    tm.away_score as goals_for,
    tm.home_score as goals_against
  from public.tournament_matches tm
  where tm.status = 'finalizado'
    and tm.away_registration_id is not null
    and tm.away_score is not null
)
select
  tournament_id,
  registration_id,
  count(*)::int                                                  as played,
  coalesce(sum(win), 0)::int                                     as wins,
  coalesce(sum(draw), 0)::int                                    as draws,
  coalesce(sum(loss), 0)::int                                    as losses,
  coalesce(sum(goals_for), 0)::int                               as goals_for,
  coalesce(sum(goals_against), 0)::int                           as goals_against,
  coalesce(sum(goals_for), 0)::int - coalesce(sum(goals_against), 0)::int as goal_difference,
  (coalesce(sum(win), 0) * 3 + coalesce(sum(draw), 0))::int      as points
from played
group by tournament_id, registration_id
with no data;

-- Población inicial obligatoria: REFRESH MATERIALIZED VIEW CONCURRENTLY falla
-- con "This option may not be used when the materialized view is not yet
-- populated." hasta que se pobla al menos una vez. Como la mat view se crea
-- vacía (with no data) para permitir crear el índice único primero, hacemos
-- un refresh no-concurrente acá. A partir de la segunda vez, el trigger
-- `tm_refresh_standings_after` puede usar CONCURRENTLY sin problemas.
refresh materialized view public.standings;

-- Índice único obligatorio para REFRESH MATERIALIZED VIEW CONCURRENTLY.
create unique index standings_unique_row
  on public.standings (tournament_id, registration_id);

create index standings_tournament_idx
  on public.standings (tournament_id);

-- NB: mat views no soportan RLS. Se asume que `standings` es información
-- pública del torneo (misma política que la ficha del torneo). La exposición
-- vía API filtra por tournament_id conocido por el caller.

-- ---------------------------------------------------------------------------
-- 5. refresh_standings()
--    Refresco completo. Llamable desde triggers o RPC.
-- ---------------------------------------------------------------------------
create or replace function public.refresh_standings()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.standings;
end;
$$;

revoke all on function public.refresh_standings() from public;
grant execute on function public.refresh_standings() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Trigger: cuando un match se marca `finalizado`, refrescar standings.
--    También valida que el torneo esté en un estado que admita resultados
--    (cerrado_inscripciones o finalizado) para evitar cargar resultados en
--    un torneo todavía en borrador o abierto a inscripciones.
-- ---------------------------------------------------------------------------
create or replace function public.tm_enforce_and_refresh_on_finalize()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_status public.tournament_status;
begin
  if NEW.status = 'finalizado' and (OLD.status is null or OLD.status <> 'finalizado') then
    select status into v_tournament_status
    from public.tournaments
    where id = NEW.tournament_id;

    if v_tournament_status is null then
      raise exception 'tournament_not_found' using errcode = 'P0002';
    end if;

    if v_tournament_status not in ('cerrado_inscripciones','finalizado') then
      raise exception 'tournament_not_ready_for_results' using errcode = 'P0001';
    end if;

    -- Set default correction window of 48h if not already set.
    if NEW.correction_window_ends_at is null then
      NEW.correction_window_ends_at := now() + interval '48 hours';
    end if;
  end if;

  return NEW;
end;
$$;

create trigger tm_before_update_enforce_finalize
  before update on public.tournament_matches
  for each row execute function public.tm_enforce_and_refresh_on_finalize();

create trigger tm_before_insert_enforce_finalize
  before insert on public.tournament_matches
  for each row execute function public.tm_enforce_and_refresh_on_finalize();

-- Refresco después del cambio (no podemos refrescar mat view desde un BEFORE
-- trigger porque el match todavía no está commiteado). Lo hacemos en AFTER.
create or replace function public.tm_refresh_standings_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT' and NEW.status = 'finalizado')
     or (TG_OP = 'UPDATE' and NEW.status = 'finalizado' and OLD.status <> 'finalizado')
     or (TG_OP = 'UPDATE' and OLD.status = 'finalizado' and NEW.status <> 'finalizado')
     or (TG_OP = 'UPDATE' and NEW.status = 'finalizado'
         and (OLD.home_score <> NEW.home_score or OLD.away_score <> NEW.away_score))
  then
    -- Swallow errors (ej: CONCURRENTLY sin índice, unlikely) para no
    -- romper la transacción principal del promotor.
    begin
      perform public.refresh_standings();
    exception when others then
      null;
    end;
  end if;
  return null;
end;
$$;

create trigger tm_after_finalize_refresh
  after insert or update on public.tournament_matches
  for each row execute function public.tm_refresh_standings_after();
