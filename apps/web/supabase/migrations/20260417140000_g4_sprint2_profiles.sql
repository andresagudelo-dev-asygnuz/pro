-- =========================================================================
-- G4 Sprint 2 — HU-003 (perfil tipo ficha + visibilidad por campo) · PR A
--
-- Crea la base de DB para el perfil tipo ficha del MVP1 (RF-002):
--   skill_tags                    catálogo curado de tags
--   visibility_fields             catálogo cerrado de field_keys + default
--   profiles_core                 Bloque 1 · Identidad (1:1 con auth.users)
--   profiles_morpho               Bloque 2 · Morfológico (0..1)
--   profiles_conditional          Bloque 3 · Capacidades condicionales (0..1)
--   profiles_technical_football   Bloque 4 · Destrezas técnicas fútbol (0..1)
--   profile_field_visibility      nivel por (user_id, field_key) — ADR-002
--   trigger seed_field_visibility_defaults sobre cada tabla de perfil
--
-- Convenciones:
--   * Aditiva. No toca el esquema v0 (public.profiles queda coexistiendo y
--     marcada como deprecada en docs hasta migración; ver architecture §7).
--   * RLS obligatoria: dueño lee/escribe sus datos. La lectura por terceros
--     (público / promotores) se resolverá con una vista en PR D del sprint.
--   * Defaults de visibilidad se siembran por trigger al crear cada bloque,
--     leyendo visibility_fields.default_level (ADR-002 §Decisión).
--   * Catálogos cerrados: skill_tags y visibility_fields. Clientes sólo leen;
--     escritura exclusiva de service_role.
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------
do $laterality$
begin
  if not exists (select 1 from pg_type where typname = 'laterality') then
    create type public.laterality as enum ('diestro','zurdo','ambos');
  end if;
end
$laterality$;

do $somatotype$
begin
  if not exists (select 1 from pg_type where typname = 'somatotype') then
    create type public.somatotype as enum ('ectomorfo','mesomorfo','endomorfo','mixto');
  end if;
end
$somatotype$;

do $football_position$
begin
  if not exists (select 1 from pg_type where typname = 'football_position') then
    create type public.football_position as enum ('arquero','defensa','mediocampista','delantero');
  end if;
end
$football_position$;

do $dominant_foot$
begin
  if not exists (select 1 from pg_type where typname = 'dominant_foot') then
    create type public.dominant_foot as enum ('derecho','izquierdo','ambos');
  end if;
end
$dominant_foot$;

do $visibility_level$
begin
  if not exists (select 1 from pg_type where typname = 'visibility_level') then
    create type public.visibility_level as enum ('publico','promotores','privado');
  end if;
end
$visibility_level$;

-- Nota: enum values sin acento para evitar ambigüedades de encoding con
-- clientes externos (gen types, psql, REST). La UI mapea a labels con acento.

-- ---------------------------------------------------------------------------
-- 2. skill_tags — catálogo curado (lectura pública, escritura service_role)
-- ---------------------------------------------------------------------------
create table if not exists public.skill_tags (
  id         text primary key,
  category   text not null check (category in
    ('soft','strength','speed','endurance','flexibility')),
  label      text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists skill_tags_category_active_idx
  on public.skill_tags (category, active);

drop trigger if exists skill_tags_set_updated_at on public.skill_tags;
create trigger skill_tags_set_updated_at
  before update on public.skill_tags
  for each row execute function public.set_updated_at();

alter table public.skill_tags enable row level security;

drop policy if exists "skill_tags_read_all" on public.skill_tags;
create policy "skill_tags_read_all"
  on public.skill_tags for select
  using (true);
-- Escritura: sin policy → RLS bloquea cliente autenticado/anon. service_role
-- bypasea RLS por diseño.

insert into public.skill_tags (id, category, label) values
  ('soft.liderazgo',              'soft',       'Liderazgo'),
  ('soft.comunicacion_asertiva',  'soft',       'Comunicación asertiva'),
  ('soft.disciplina',             'soft',       'Disciplina'),
  ('soft.trabajo_equipo',         'soft',       'Trabajo en equipo'),
  ('soft.resiliencia',            'soft',       'Resiliencia'),
  ('soft.compromiso',             'soft',       'Compromiso'),
  ('soft.actitud_ganadora',       'soft',       'Actitud ganadora'),
  ('strength.explosiva',          'strength',   'Fuerza explosiva'),
  ('strength.tren_inferior',      'strength',   'Tren inferior'),
  ('strength.tren_superior',      'strength',   'Tren superior'),
  ('strength.core',               'strength',   'Core'),
  ('strength.potencia',           'strength',   'Potencia'),
  ('speed.reaccion',              'speed',      'Reacción'),
  ('speed.desplazamiento_lateral','speed',      'Desplazamiento lateral'),
  ('speed.aceleracion',           'speed',      'Aceleración'),
  ('speed.agilidad',              'speed',      'Agilidad'),
  ('endurance.aerobica',          'endurance',  'Aeróbica'),
  ('endurance.anaerobica',        'endurance',  'Anaeróbica'),
  ('endurance.recuperacion',      'endurance',  'Recuperación'),
  ('flexibility.hombros',         'flexibility','Hombros'),
  ('flexibility.caderas',         'flexibility','Caderas'),
  ('flexibility.isquiotibiales',  'flexibility','Isquiotibiales'),
  ('flexibility.tobillos',        'flexibility','Tobillos')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. visibility_fields — catálogo cerrado de field_keys y default_level
-- ---------------------------------------------------------------------------
create table if not exists public.visibility_fields (
  field_key     text primary key,
  bloque        text not null check (bloque in
    ('identity','morpho','conditional','technical.football')),
  default_level public.visibility_level not null default 'publico',
  label         text not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists visibility_fields_bloque_active_idx
  on public.visibility_fields (bloque, active);

drop trigger if exists visibility_fields_set_updated_at on public.visibility_fields;
create trigger visibility_fields_set_updated_at
  before update on public.visibility_fields
  for each row execute function public.set_updated_at();

alter table public.visibility_fields enable row level security;

drop policy if exists "visibility_fields_read_all" on public.visibility_fields;
create policy "visibility_fields_read_all"
  on public.visibility_fields for select
  using (true);

-- Seed MVP1 (20 field_keys). Defaults sensibles per ADR-002 + wireframe 03.
insert into public.visibility_fields (field_key, bloque, default_level, label) values
  ('identity.full_name',                    'identity',          'publico',    'Nombre completo'),
  ('identity.city',                         'identity',          'publico',    'Ciudad'),
  ('identity.region',                       'identity',          'publico',    'Región'),
  ('identity.country',                      'identity',          'publico',    'País'),
  ('identity.primary_sport',                'identity',          'publico',    'Disciplina principal'),
  ('identity.interests',                    'identity',          'publico',    'Intereses'),
  ('identity.soft_skills',                  'identity',          'publico',    'Habilidades blandas'),
  ('morpho.height_m',                       'morpho',            'promotores', 'Estatura'),
  ('morpho.weight_kg',                      'morpho',            'promotores', 'Peso competitivo'),
  ('morpho.wingspan_m',                     'morpho',            'promotores', 'Envergadura'),
  ('morpho.laterality',                     'morpho',            'publico',    'Lateralidad'),
  ('morpho.somatotype',                     'morpho',            'promotores', 'Somatotipo'),
  ('conditional.strength',                  'conditional',       'publico',    'Fuerza'),
  ('conditional.speed',                     'conditional',       'publico',    'Velocidad'),
  ('conditional.endurance',                 'conditional',       'publico',    'Resistencia'),
  ('conditional.flexibility',               'conditional',       'publico',    'Flexibilidad'),
  ('technical.football.position',           'technical.football','publico',    'Posición preferida'),
  ('technical.football.dominant_foot',      'technical.football','publico',    'Pie hábil'),
  ('technical.football.performance_notes',  'technical.football','publico',    'Rendimiento individual'),
  ('technical.football.tactical_role_notes','technical.football','publico',    'Rol táctico')
on conflict (field_key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. profiles_core — Bloque 1 · Identidad (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles_core (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  full_name          text not null
                       check (char_length(full_name) between 2 and 120),
  birth_date         date not null
                       check (birth_date <= current_date
                          and extract(year from age(birth_date)) >= 18),
  city               text not null check (char_length(city) between 2 and 80),
  region             text check (region is null or char_length(region) between 1 and 80),
  country            text not null default 'CO'
                       check (char_length(country) = 2),
  primary_sport_id   text not null default 'futbol'
                       references public.sports(id),
  interests          text[] not null default '{}'::text[],
  soft_skills_text   text
                       check (soft_skills_text is null
                          or char_length(soft_skills_text) between 0 and 1000),
  soft_skills_tags   text[] not null default '{}'::text[],
  slug               text not null unique
                       check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                          and char_length(slug) between 3 and 80),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists profiles_core_city_sport_idx
  on public.profiles_core (city, primary_sport_id);

drop trigger if exists profiles_core_set_updated_at on public.profiles_core;
create trigger profiles_core_set_updated_at
  before update on public.profiles_core
  for each row execute function public.set_updated_at();

alter table public.profiles_core enable row level security;

drop policy if exists "profiles_core_read_self" on public.profiles_core;
create policy "profiles_core_read_self"
  on public.profiles_core for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_core_insert_self" on public.profiles_core;
create policy "profiles_core_insert_self"
  on public.profiles_core for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_core_update_self" on public.profiles_core;
create policy "profiles_core_update_self"
  on public.profiles_core for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. profiles_morpho — Bloque 2 · Morfológico (0..1)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles_morpho (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  height_m    numeric(3,2) check (height_m is null or (height_m between 1.00 and 2.50)),
  weight_kg   numeric(5,2) check (weight_kg is null or (weight_kg between 30.00 and 200.00)),
  wingspan_m  numeric(3,2) check (wingspan_m is null or (wingspan_m between 1.00 and 2.80)),
  laterality  public.laterality,
  somatotype  public.somatotype,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists profiles_morpho_set_updated_at on public.profiles_morpho;
create trigger profiles_morpho_set_updated_at
  before update on public.profiles_morpho
  for each row execute function public.set_updated_at();

alter table public.profiles_morpho enable row level security;

drop policy if exists "profiles_morpho_read_self" on public.profiles_morpho;
create policy "profiles_morpho_read_self"
  on public.profiles_morpho for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_morpho_insert_self" on public.profiles_morpho;
create policy "profiles_morpho_insert_self"
  on public.profiles_morpho for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_morpho_update_self" on public.profiles_morpho;
create policy "profiles_morpho_update_self"
  on public.profiles_morpho for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 6. profiles_conditional — Bloque 3 · Capacidades condicionales (0..1)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles_conditional (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  strength_tags     text[] not null default '{}'::text[],
  strength_notes    text check (strength_notes is null
                       or char_length(strength_notes) between 0 and 400),
  speed_tags        text[] not null default '{}'::text[],
  speed_notes       text check (speed_notes is null
                       or char_length(speed_notes) between 0 and 400),
  endurance_tags    text[] not null default '{}'::text[],
  endurance_notes   text check (endurance_notes is null
                       or char_length(endurance_notes) between 0 and 400),
  flexibility_tags  text[] not null default '{}'::text[],
  flexibility_notes text check (flexibility_notes is null
                       or char_length(flexibility_notes) between 0 and 400),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists profiles_conditional_set_updated_at on public.profiles_conditional;
create trigger profiles_conditional_set_updated_at
  before update on public.profiles_conditional
  for each row execute function public.set_updated_at();

alter table public.profiles_conditional enable row level security;

drop policy if exists "profiles_conditional_read_self" on public.profiles_conditional;
create policy "profiles_conditional_read_self"
  on public.profiles_conditional for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_conditional_insert_self" on public.profiles_conditional;
create policy "profiles_conditional_insert_self"
  on public.profiles_conditional for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_conditional_update_self" on public.profiles_conditional;
create policy "profiles_conditional_update_self"
  on public.profiles_conditional for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7. profiles_technical_football — Bloque 4 · Destrezas técnicas (0..1)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles_technical_football (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  position             public.football_position not null,
  dominant_foot        public.dominant_foot not null,
  performance_notes    text check (performance_notes is null
                         or char_length(performance_notes) between 0 and 1000),
  tactical_role_notes  text check (tactical_role_notes is null
                         or char_length(tactical_role_notes) between 0 and 1000),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

drop trigger if exists profiles_technical_football_set_updated_at on public.profiles_technical_football;
create trigger profiles_technical_football_set_updated_at
  before update on public.profiles_technical_football
  for each row execute function public.set_updated_at();

alter table public.profiles_technical_football enable row level security;

drop policy if exists "profiles_tech_fb_read_self" on public.profiles_technical_football;
create policy "profiles_tech_fb_read_self"
  on public.profiles_technical_football for select
  using (auth.uid() = user_id);

drop policy if exists "profiles_tech_fb_insert_self" on public.profiles_technical_football;
create policy "profiles_tech_fb_insert_self"
  on public.profiles_technical_football for insert
  with check (auth.uid() = user_id);

drop policy if exists "profiles_tech_fb_update_self" on public.profiles_technical_football;
create policy "profiles_tech_fb_update_self"
  on public.profiles_technical_football for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 8. profile_field_visibility — nivel por (user_id, field_key)
-- ---------------------------------------------------------------------------
create table if not exists public.profile_field_visibility (
  user_id    uuid not null references auth.users(id) on delete cascade,
  field_key  text not null references public.visibility_fields(field_key) on delete restrict,
  level      public.visibility_level not null default 'publico',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, field_key)
);

create index if not exists profile_field_visibility_field_idx
  on public.profile_field_visibility (field_key, level);

drop trigger if exists profile_field_visibility_set_updated_at on public.profile_field_visibility;
create trigger profile_field_visibility_set_updated_at
  before update on public.profile_field_visibility
  for each row execute function public.set_updated_at();

alter table public.profile_field_visibility enable row level security;

-- Dueño lee/escribe. Terceros no leen directamente; se expondrá una vista
-- agregada en PR D que sólo devuelve el dato (no el nivel), para evitar
-- filtrar como side-channel qué oculta cada usuario (ADR-002 §Regla de
-- seguridad crítica).
drop policy if exists "pfv_read_self" on public.profile_field_visibility;
create policy "pfv_read_self"
  on public.profile_field_visibility for select
  using (auth.uid() = user_id);

drop policy if exists "pfv_insert_self" on public.profile_field_visibility;
create policy "pfv_insert_self"
  on public.profile_field_visibility for insert
  with check (auth.uid() = user_id);

drop policy if exists "pfv_update_self" on public.profile_field_visibility;
create policy "pfv_update_self"
  on public.profile_field_visibility for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 9. Trigger: al crear profiles_* siembra defaults de visibilidad del bloque
-- ---------------------------------------------------------------------------
create or replace function public.seed_field_visibility_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bloque text;
begin
  v_bloque := case TG_TABLE_NAME
    when 'profiles_core'               then 'identity'
    when 'profiles_morpho'             then 'morpho'
    when 'profiles_conditional'        then 'conditional'
    when 'profiles_technical_football' then 'technical.football'
    else null
  end;

  if v_bloque is null then
    return new;
  end if;

  insert into public.profile_field_visibility (user_id, field_key, level)
  select new.user_id, vf.field_key, vf.default_level
    from public.visibility_fields vf
   where vf.bloque = v_bloque and vf.active = true
  on conflict (user_id, field_key) do nothing;

  return new;
end;
$$;

drop trigger if exists seed_visibility_on_profiles_core on public.profiles_core;
create trigger seed_visibility_on_profiles_core
  after insert on public.profiles_core
  for each row execute function public.seed_field_visibility_defaults();

drop trigger if exists seed_visibility_on_profiles_morpho on public.profiles_morpho;
create trigger seed_visibility_on_profiles_morpho
  after insert on public.profiles_morpho
  for each row execute function public.seed_field_visibility_defaults();

drop trigger if exists seed_visibility_on_profiles_conditional on public.profiles_conditional;
create trigger seed_visibility_on_profiles_conditional
  after insert on public.profiles_conditional
  for each row execute function public.seed_field_visibility_defaults();

drop trigger if exists seed_visibility_on_profiles_technical_football on public.profiles_technical_football;
create trigger seed_visibility_on_profiles_technical_football
  after insert on public.profiles_technical_football
  for each row execute function public.seed_field_visibility_defaults();
