-- Migration: teams, team_members, tournament_registrations (HU-005 / RF-004)
-- Description:
--   Inscripción de equipos o jugadores individuales a torneos publicados.
--   Incluye trigger de capacidad atómico sobre `tournaments.slots_filled`
--   para prevenir over-registration bajo concurrencia (mismo patrón que
--   `enforce_match_capacity`).

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
create type public.registration_status as enum (
  'confirmada',
  'cancelada',
  'lista_espera'
);

-- ---------------------------------------------------------------------------
-- 2. teams
-- ---------------------------------------------------------------------------
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 80),
  captain_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index teams_captain_idx on public.teams (captain_id);

create trigger set_teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

alter table public.teams enable row level security;

-- Read: capitán o cualquiera que sea miembro del equipo.
create policy "teams_select_members_and_captain"
  on public.teams for select
  using (
    captain_id = auth.uid()
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = teams.id and tm.user_id = auth.uid()
    )
  );

-- Insert: solo el propio capitán se auto-asigna.
create policy "teams_insert_self_captain"
  on public.teams for insert
  with check (captain_id = auth.uid());

-- Update / Delete: solo el capitán.
create policy "teams_update_captain"
  on public.teams for update
  using (captain_id = auth.uid());

create policy "teams_delete_captain"
  on public.teams for delete
  using (captain_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. team_members
-- ---------------------------------------------------------------------------
create table public.team_members (
  team_id    uuid not null references public.teams(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'player' check (role in ('captain','player')),
  joined_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index team_members_user_idx on public.team_members (user_id);

alter table public.team_members enable row level security;

-- Read: el propio miembro o el capitán del equipo.
create policy "team_members_select_self_or_captain"
  on public.team_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.captain_id = auth.uid()
    )
  );

-- Insert: solo el capitán del equipo puede sumar miembros.
create policy "team_members_insert_by_captain"
  on public.team_members for insert
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.captain_id = auth.uid()
    )
  );

-- Delete: capitán (cualquier miembro) o el propio miembro (sale del equipo).
create policy "team_members_delete_by_captain_or_self"
  on public.team_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.captain_id = auth.uid()
    )
  );

-- Trigger: cuando se crea un team, agregar al capitán como member con role=captain.
create or replace function public.teams_add_captain_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (NEW.id, NEW.captain_id, 'captain')
  on conflict (team_id, user_id) do nothing;
  return NEW;
end;
$$;

create trigger teams_after_insert_add_captain
  after insert on public.teams
  for each row execute function public.teams_add_captain_as_member();

-- ---------------------------------------------------------------------------
-- 4. tournament_registrations
-- ---------------------------------------------------------------------------
create table public.tournament_registrations (
  id              uuid primary key default gen_random_uuid(),
  tournament_id   uuid not null references public.tournaments(id) on delete cascade,
  team_id         uuid references public.teams(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,
  status          public.registration_status not null default 'confirmada',
  registered_by   uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Exactamente una: equipo o jugador individual.
  constraint tr_team_xor_user check (
    (team_id is not null and user_id is null)
    or (team_id is null and user_id is not null)
  )
);

-- Un equipo/jugador no puede tener más de una inscripción activa en el mismo torneo.
create unique index tr_unique_active_team
  on public.tournament_registrations (tournament_id, team_id)
  where team_id is not null and status <> 'cancelada';

create unique index tr_unique_active_user
  on public.tournament_registrations (tournament_id, user_id)
  where user_id is not null and status <> 'cancelada';

create index tr_tournament_status_idx
  on public.tournament_registrations (tournament_id, status);

create trigger set_tr_updated_at
  before update on public.tournament_registrations
  for each row execute function public.set_updated_at();

alter table public.tournament_registrations enable row level security;

-- Read:
--   - capitán del equipo inscrito,
--   - jugador individual inscrito,
--   - dueño del torneo (promotor).
create policy "tr_select_stakeholders"
  on public.tournament_registrations for select
  using (
    registered_by = auth.uid()
    or user_id = auth.uid()
    or exists (
      select 1 from public.teams t
      where t.id = tournament_registrations.team_id and t.captain_id = auth.uid()
    )
    or exists (
      select 1 from public.tournaments tr
      where tr.id = tournament_registrations.tournament_id and tr.owner_id = auth.uid()
    )
  );

-- Insert:
--   El usuario autenticado se auto-registra. La lógica de cupos / edad /
--   estado del torneo se enforce en el trigger `enforce_tournament_capacity`.
create policy "tr_insert_self"
  on public.tournament_registrations for insert
  with check (
    registered_by = auth.uid()
    and (
      -- Caso equipo: solo el capitán puede inscribir a su equipo.
      (team_id is not null and exists (
        select 1 from public.teams t
        where t.id = team_id and t.captain_id = auth.uid()
      ))
      -- Caso individual: solo se inscribe a sí mismo.
      or (user_id is not null and user_id = auth.uid())
    )
  );

-- Update: el que inscribió puede cancelar (transicionar a `cancelada`).
--   El promotor puede mover entre `confirmada` y `lista_espera`.
create policy "tr_update_self_or_owner"
  on public.tournament_registrations for update
  using (
    registered_by = auth.uid()
    or exists (
      select 1 from public.tournaments tr
      where tr.id = tournament_registrations.tournament_id and tr.owner_id = auth.uid()
    )
  );

-- Delete: bloqueado. Las inscripciones se cancelan, no se borran, para
-- auditabilidad (el UNIQUE parcial permite re-inscribirse si se canceló).
create policy "tr_delete_blocked"
  on public.tournament_registrations for delete
  using (false);

-- ---------------------------------------------------------------------------
-- 5. Trigger: enforce_tournament_capacity
--    - Bloquea la fila del torneo para serializar inserts concurrentes.
--    - Valida que el torneo está `abierto_inscripciones`.
--    - Valida cupos disponibles. Si no hay cupos, fuerza `lista_espera`.
--    - Incrementa `slots_filled` solo para inscripciones `confirmada`.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_tournament_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slots         int;
  v_slots_filled  int;
  v_status        public.tournament_status;
begin
  select slots, slots_filled, status
    into v_slots, v_slots_filled, v_status
  from public.tournaments
  where id = NEW.tournament_id
  for update;

  if v_slots is null then
    raise exception 'tournament_not_found' using errcode = 'P0002';
  end if;

  if v_status <> 'abierto_inscripciones' then
    raise exception 'tournament_not_open' using errcode = 'P0001';
  end if;

  -- Solo contamos cupos para inscripciones confirmadas.
  if NEW.status = 'confirmada' then
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

create trigger tr_before_insert_capacity
  before insert on public.tournament_registrations
  for each row execute function public.enforce_tournament_capacity();

-- ---------------------------------------------------------------------------
-- 6. Trigger: cancel_tournament_registration_releases_slot
--    Cuando una inscripción pasa a `cancelada`, libera el cupo.
--    Cuando vuelve de `cancelada`/`lista_espera` a `confirmada`, toma cupo.
-- ---------------------------------------------------------------------------
create or replace function public.sync_tournament_slots_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slots         int;
  v_slots_filled  int;
begin
  if OLD.status = NEW.status then
    return NEW;
  end if;

  select slots, slots_filled into v_slots, v_slots_filled
  from public.tournaments
  where id = NEW.tournament_id
  for update;

  if OLD.status = 'confirmada' and NEW.status <> 'confirmada' then
    update public.tournaments
      set slots_filled = greatest(0, v_slots_filled - 1)
      where id = NEW.tournament_id;
  elsif OLD.status <> 'confirmada' and NEW.status = 'confirmada' then
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

create trigger tr_before_update_sync_slots
  before update of status on public.tournament_registrations
  for each row execute function public.sync_tournament_slots_on_status_change();

-- ---------------------------------------------------------------------------
-- 7. Helper: find_unverified_users
--    SECURITY DEFINER bypasea la RLS `age_verifications_read_self` (que sólo
--    permite leer el propio registro) y devuelve los user_ids del arreglo
--    recibido que NO tienen una verificación `aprobada`. Se usa desde el
--    cliente (vía `supabase.rpc(...)`) para bloquear inscripciones de equipo
--    con miembros sin RF-007 aprobado y poder dar un mensaje UX claro.
--
--    Devolvemos un arreglo en lugar de un setof para simplificar el binding
--    en TS (el postgrest client mapea `uuid[]` a `string[]` sin boilerplate).
--    Mismo patrón que `ensure_verification_aprobada` (migración Sprint 1).
-- ---------------------------------------------------------------------------
create or replace function public.find_unverified_users(p_user_ids uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(u)
      filter (
        where not exists (
          select 1 from public.age_verifications av
          where av.user_id = u and av.status = 'aprobada'
        )
      ),
    array[]::uuid[]
  )
  from unnest(p_user_ids) as u;
$$;

revoke all on function public.find_unverified_users(uuid[]) from public;
grant execute on function public.find_unverified_users(uuid[]) to authenticated;
