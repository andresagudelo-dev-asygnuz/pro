-- =========================================================================
-- G4 Sprint 1 — HU-001 (registro con rol) + HU-002 (verificación de edad)
--
-- Crea la base de DB para acceso y verificación de edad del MVP1:
--   user_roles           rol dual jugador/promotor (RF-001)
--   age_verifications    evidencia del trámite de verificación (RF-007)
--   age-verifications    bucket privado para documentos (ADR-003)
--
-- Convenciones:
--   * Aditiva. No toca el esquema v0 (profiles, matches, …).
--   * RLS obligatoria con policies por operación (ver db/data-model.md §3.1 y
--     §3.2, ADR-003).
--   * Triggers updated_at vía `public.set_updated_at()` (ya existe desde v0).
--   * El documento de identidad NUNCA se expone al cliente directamente; el
--     bucket es privado y sólo service_role genera URLs firmadas.
-- =========================================================================

-- ---------------------------------------------------------------------------
-- 1. Enum de estado de verificación
-- ---------------------------------------------------------------------------
do $enum$
begin
  if not exists (select 1 from pg_type where typname = 'age_verification_status') then
    create type public.age_verification_status as enum
      ('pendiente', 'aprobada', 'rechazada', 'menor_edad');
  end if;
end
$enum$;

-- ---------------------------------------------------------------------------
-- 2. user_roles  (RF-001)
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  is_player    boolean not null default false,
  is_promoter  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint user_roles_at_least_one_role check (is_player or is_promoter)
);

create index if not exists user_roles_promoter_idx
  on public.user_roles (is_promoter) where is_promoter = true;

drop trigger if exists user_roles_set_updated_at on public.user_roles;
create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

alter table public.user_roles enable row level security;

-- Dueño lee su propia fila.
drop policy if exists "user_roles_read_self" on public.user_roles;
create policy "user_roles_read_self"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Cualquier autenticado puede leer columnas públicas de roles (para mostrar
-- badge "promotor" en perfil público); el detalle granular queda cubierto por
-- la policy de read_self arriba. Mantenemos una segunda policy permisiva de
-- lectura sólo mientras no haya vista específica; ver ADR-004 §4.
drop policy if exists "user_roles_read_public_badges" on public.user_roles;
create policy "user_roles_read_public_badges"
  on public.user_roles for select
  using (auth.role() = 'authenticated');

-- Inserción: sólo el dueño (el trigger de auth.users lo cubre con security
-- definer, pero dejamos la policy por completitud para clientes autenticados).
drop policy if exists "user_roles_insert_self" on public.user_roles;
create policy "user_roles_insert_self"
  on public.user_roles for insert
  with check (auth.uid() = user_id);

-- Update: sólo dueño.
drop policy if exists "user_roles_update_self" on public.user_roles;
create policy "user_roles_update_self"
  on public.user_roles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Delete: nunca desde cliente (on delete cascade de auth.users se encarga).

-- ---------------------------------------------------------------------------
-- 3. Trigger de seed: al crear auth.users, crear fila en user_roles
--    Lee raw_user_meta_data->>'is_player' / 'is_promoter'; si ambos vienen
--    en false/nulos, default is_player = true (signup mínimo = jugador).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Parseo tolerante a JSON no confiable: cualquier valor no booleano o
  -- ausente se trata como false. Evita ::boolean directo que aborta el
  -- trigger ante metadata inesperada (RF-001, RF-007).
  v_is_player   boolean := coalesce(
    nullif(lower(new.raw_user_meta_data->>'is_player'), '') in ('true','t','yes','y','1','on'),
    false);
  v_is_promoter boolean := coalesce(
    nullif(lower(new.raw_user_meta_data->>'is_promoter'), '') in ('true','t','yes','y','1','on'),
    false);
begin
  if not v_is_player and not v_is_promoter then
    v_is_player := true;
  end if;

  insert into public.user_roles (user_id, is_player, is_promoter)
  values (new.id, v_is_player, v_is_promoter)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_roles on auth.users;
create trigger on_auth_user_created_roles
  after insert on auth.users
  for each row execute function public.handle_new_user_roles();

-- ---------------------------------------------------------------------------
-- 4. age_verifications  (RF-007)
-- ---------------------------------------------------------------------------
create table if not exists public.age_verifications (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  status            public.age_verification_status not null default 'pendiente',
  storage_path      text,
  mime_type         text check (mime_type in ('image/jpeg','image/png','application/pdf')),
  file_size_bytes   integer check (file_size_bytes is null or (file_size_bytes > 0 and file_size_bytes <= 5 * 1024 * 1024)),
  uploaded_at       timestamptz,
  reviewed_at       timestamptz,
  reviewed_by       uuid references auth.users(id),
  review_notes      text check (review_notes is null or char_length(review_notes) <= 1000),
  rejection_reason  text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint age_verifications_reviewed_requires_reviewer
    check (
      (status in ('aprobada','rechazada','menor_edad') and reviewed_at is not null and reviewed_by is not null)
      or status = 'pendiente'
    )
);

create index if not exists age_verifications_user_status_idx
  on public.age_verifications (user_id, status);

create index if not exists age_verifications_queue_idx
  on public.age_verifications (status, created_at)
  where status = 'pendiente';

drop trigger if exists age_verifications_set_updated_at on public.age_verifications;
create trigger age_verifications_set_updated_at
  before update on public.age_verifications
  for each row execute function public.set_updated_at();

alter table public.age_verifications enable row level security;

-- Select: dueño.
drop policy if exists "age_verifications_read_self" on public.age_verifications;
create policy "age_verifications_read_self"
  on public.age_verifications for select
  using (auth.uid() = user_id);

-- Insert: dueño, sólo con status = 'pendiente' (la admin aprueba después).
drop policy if exists "age_verifications_insert_self_pendiente" on public.age_verifications;
create policy "age_verifications_insert_self_pendiente"
  on public.age_verifications for insert
  with check (auth.uid() = user_id and status = 'pendiente');

-- Update: nunca desde cliente autenticado. El admin actúa vía service_role
-- (Edge Function o Server Action server-side).
drop policy if exists "age_verifications_update_blocked" on public.age_verifications;
create policy "age_verifications_update_blocked"
  on public.age_verifications for update
  using (false);

-- Delete: nunca desde cliente.
drop policy if exists "age_verifications_delete_blocked" on public.age_verifications;
create policy "age_verifications_delete_blocked"
  on public.age_verifications for delete
  using (false);

-- ---------------------------------------------------------------------------
-- 5. Helper: ensure_verification_aprobada (usada por HU-003/004/005)
-- ---------------------------------------------------------------------------
create or replace function public.ensure_verification_aprobada(p_user uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.age_verifications
    where user_id = p_user and status = 'aprobada'
  ) then
    raise exception 'age_verification_required'
      using errcode = 'check_violation',
            hint = format('El usuario %s no tiene verificación de edad aprobada.', p_user);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Storage: bucket privado age-verifications
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('age-verifications', 'age-verifications', false)
on conflict (id) do nothing;

-- Policies sobre storage.objects: sólo service_role lee/escribe. El cliente
-- sube vía Server Action que usa service_role; nunca toca el bucket directo.
-- Se borran policies previas por idempotencia.
drop policy if exists "age_verifications_objects_service_only_select" on storage.objects;
create policy "age_verifications_objects_service_only_select"
  on storage.objects for select
  using (bucket_id = 'age-verifications' and auth.role() = 'service_role');

drop policy if exists "age_verifications_objects_service_only_insert" on storage.objects;
create policy "age_verifications_objects_service_only_insert"
  on storage.objects for insert
  with check (bucket_id = 'age-verifications' and auth.role() = 'service_role');

drop policy if exists "age_verifications_objects_service_only_update" on storage.objects;
create policy "age_verifications_objects_service_only_update"
  on storage.objects for update
  using (bucket_id = 'age-verifications' and auth.role() = 'service_role');

drop policy if exists "age_verifications_objects_service_only_delete" on storage.objects;
create policy "age_verifications_objects_service_only_delete"
  on storage.objects for delete
  using (bucket_id = 'age-verifications' and auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 7. Comentarios (documentación en DB)
-- ---------------------------------------------------------------------------
comment on table public.user_roles is
  'RF-001 · Rol dual jugador/promotor por usuario. Un usuario puede tener ambos.';
comment on table public.age_verifications is
  'RF-007 · Evidencia del trámite de verificación de edad. El documento vive en bucket privado age-verifications; sólo service_role lo lee.';
comment on function public.ensure_verification_aprobada(uuid) is
  'Lanza error si el usuario no tiene age_verifications.status = aprobada. Uso previsto: tournament_registrations.insert (HU-005) y guards de HU-003/004.';
