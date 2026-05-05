-- =========================================================================
-- PRO — MVP v0 schema
--
-- Entidades core:
--   sports               catálogo de deportes (seed)
--   profiles             1:1 con auth.users (avatar, stats, ciudad, deporte)
--   matches              partidos abiertos organizados por un usuario
--   match_participants   join table user <-> match
--   ratings              calificaciones post-partido (construye reputación)
--   messages             chat del partido (Realtime)
--
-- Principios:
--   * RLS habilitada en TODAS las tablas (Supabase requirement).
--   * auth.users es la fuente de verdad; profiles se crea automáticamente vía
--     trigger on_auth_user_created.
--   * Agregados (rating_avg, rating_count, matches_played) se mantienen por
--     triggers para lecturas rápidas en el feed/perfil.
--   * Realtime habilitado en messages / matches / match_participants para
--     chat y feed en vivo.
-- =========================================================================

-- Extensiones requeridas
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Catálogo de deportes
-- ---------------------------------------------------------------------------
create table public.sports (
  id         text primary key,
  name       text not null,
  icon       text,
  created_at timestamptz not null default now()
);

insert into public.sports (id, name, icon) values
  ('futbol',  'Fútbol',  '⚽'),
  ('tenis',   'Tenis',   '🎾'),
  ('padel',   'Pádel',   '🎾'),
  ('basket',  'Básquet', '🏀'),
  ('running', 'Running', '🏃'),
  ('voley',   'Vóley',   '🏐')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Enums
-- ---------------------------------------------------------------------------
create type public.skill_level as enum
  ('principiante', 'intermedio', 'avanzado', 'pro');

create type public.match_status as enum
  ('open', 'full', 'in_progress', 'completed', 'cancelled');

create type public.participant_status as enum
  ('joined', 'left', 'attended', 'no_show');

-- ---------------------------------------------------------------------------
-- 3. Profiles (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  username            text unique,
  full_name           text,
  avatar_url          text,
  bio                 text,
  city                text,
  primary_sport_id    text references public.sports(id),
  primary_skill_level public.skill_level,
  -- agregados mantenidos por triggers
  rating_avg          numeric(3,2) not null default 0,
  rating_count        integer not null default 0,
  matches_played      integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index profiles_city_sport_idx on public.profiles(city, primary_sport_id);

-- ---------------------------------------------------------------------------
-- 4. Matches
-- ---------------------------------------------------------------------------
create table public.matches (
  id               uuid primary key default gen_random_uuid(),
  organizer_id     uuid not null references public.profiles(id) on delete cascade,
  sport_id         text not null references public.sports(id),
  title            text not null,
  description      text,
  skill_level      public.skill_level,
  city             text not null,
  location         text not null,
  starts_at        timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  max_players      integer not null check (max_players >= 2),
  status           public.match_status not null default 'open',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index matches_starts_at_idx   on public.matches(starts_at);
create index matches_city_sport_idx  on public.matches(city, sport_id);
create index matches_organizer_idx   on public.matches(organizer_id);
create index matches_status_idx      on public.matches(status);

-- ---------------------------------------------------------------------------
-- 5. Match participants
-- ---------------------------------------------------------------------------
create table public.match_participants (
  match_id  uuid not null references public.matches(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  status    public.participant_status not null default 'joined',
  joined_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

create index match_participants_user_idx on public.match_participants(user_id);

-- ---------------------------------------------------------------------------
-- 6. Ratings
-- ---------------------------------------------------------------------------
create table public.ratings (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  rater_id   uuid not null references public.profiles(id) on delete cascade,
  rated_id   uuid not null references public.profiles(id) on delete cascade,
  score      smallint not null check (score between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  unique (match_id, rater_id, rated_id),
  check (rater_id <> rated_id)
);

create index ratings_rated_idx on public.ratings(rated_id);
create index ratings_match_idx on public.ratings(match_id);

-- ---------------------------------------------------------------------------
-- 7. Messages (chat del partido)
-- ---------------------------------------------------------------------------
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_match_created_idx on public.messages(match_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 8. Triggers
-- ---------------------------------------------------------------------------

-- 8a. Al crear un usuario en auth.users, crea su profile automáticamente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 8b. updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- 8c. Recalcular rating_avg / rating_count en profiles al cambiar ratings
create or replace function public.refresh_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.rated_id, old.rated_id);
  update public.profiles p
     set rating_count = sub.count,
         rating_avg   = sub.avg
    from (
      select
        count(*)::int                               as count,
        coalesce(avg(score)::numeric(3,2), 0)       as avg
      from public.ratings
      where rated_id = target_id
    ) sub
   where p.id = target_id;
  return coalesce(new, old);
end;
$$;

create trigger ratings_refresh_profile
  after insert or update or delete on public.ratings
  for each row execute function public.refresh_profile_rating();

-- 8d. Recalcular matches_played al cambiar match_participants
create or replace function public.refresh_profile_matches_played()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.user_id, old.user_id);
  update public.profiles p
     set matches_played = sub.count
    from (
      select count(*)::int as count
      from public.match_participants
      where user_id = target_id and status = 'attended'
    ) sub
   where p.id = target_id;
  return coalesce(new, old);
end;
$$;

create trigger participants_refresh_profile
  after insert or update or delete on public.match_participants
  for each row execute function public.refresh_profile_matches_played();

-- ---------------------------------------------------------------------------
-- 9. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.sports              enable row level security;
alter table public.profiles            enable row level security;
alter table public.matches             enable row level security;
alter table public.match_participants  enable row level security;
alter table public.ratings             enable row level security;
alter table public.messages            enable row level security;

-- SPORTS: lectura pública (catálogo), sin writes desde el cliente
create policy "sports_read_all"
  on public.sports for select
  using (true);

-- PROFILES: cualquier autenticado puede leer; cada quien edita el suyo
create policy "profiles_read_authenticated"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- MATCHES: autenticados leen todos; organizador puede modificar los suyos
create policy "matches_read_authenticated"
  on public.matches for select
  using (auth.role() = 'authenticated');

create policy "matches_insert_own"
  on public.matches for insert
  with check (auth.uid() = organizer_id);

create policy "matches_update_own"
  on public.matches for update
  using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);

create policy "matches_delete_own"
  on public.matches for delete
  using (auth.uid() = organizer_id);

-- MATCH_PARTICIPANTS: autenticados leen; cada usuario gestiona su propio join
create policy "participants_read_authenticated"
  on public.match_participants for select
  using (auth.role() = 'authenticated');

create policy "participants_join_self"
  on public.match_participants for insert
  with check (auth.uid() = user_id);

create policy "participants_leave_self"
  on public.match_participants for delete
  using (auth.uid() = user_id);

-- El organizador del partido puede marcar attended/no_show; el mismo user
-- puede actualizar su propio registro (p.ej. pasar a 'left').
create policy "participants_update_by_self_or_organizer"
  on public.match_participants for update
  using (
    auth.uid() = user_id
    or auth.uid() = (select organizer_id from public.matches where id = match_id)
  )
  with check (
    auth.uid() = user_id
    or auth.uid() = (select organizer_id from public.matches where id = match_id)
  );

-- RATINGS: autenticados leen; solo participantes del mismo partido pueden
-- calificarse entre sí
create policy "ratings_read_authenticated"
  on public.ratings for select
  using (auth.role() = 'authenticated');

create policy "ratings_insert_if_both_participated"
  on public.ratings for insert
  with check (
    auth.uid() = rater_id
    and exists (
      select 1 from public.match_participants
      where match_id = ratings.match_id and user_id = rater_id
    )
    and exists (
      select 1 from public.match_participants
      where match_id = ratings.match_id and user_id = rated_id
    )
  );

-- MESSAGES: solo participantes del partido (o el organizador) leen/escriben
create policy "messages_read_if_in_match"
  on public.messages for select
  using (
    exists (
      select 1 from public.match_participants
      where match_id = messages.match_id and user_id = auth.uid()
    )
    or exists (
      select 1 from public.matches
      where id = messages.match_id and organizer_id = auth.uid()
    )
  );

create policy "messages_insert_if_in_match"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and (
      exists (
        select 1 from public.match_participants
        where match_id = messages.match_id and user_id = auth.uid()
      )
      or exists (
        select 1 from public.matches
        where id = messages.match_id and organizer_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 10. Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.match_participants;
