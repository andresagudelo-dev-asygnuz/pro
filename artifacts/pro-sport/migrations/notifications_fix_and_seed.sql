-- ─── NOTIFICATIONS: Fix RLS + Seed data ──────────────────────────────────────
-- Ejecutar en Supabase SQL Editor (Dashboard → SQL Editor → New query → Run)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Asegurar que la tabla existe con la estructura correcta
create table if not exists public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  type        text        not null,
  data        jsonb       not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_created
  on public.notifications (user_id, created_at desc);

-- 2. Habilitar RLS
alter table public.notifications enable row level security;

-- 3. Eliminar policies anteriores para recrearlas limpias
drop policy if exists "Users read own notifications"         on public.notifications;
drop policy if exists "Users update own notifications"       on public.notifications;
drop policy if exists "Authenticated insert notifications"   on public.notifications;

-- 4. Recrear policies correctas
-- Lectura: solo las propias
create policy "Users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Actualizar (marcar leída): solo las propias
create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Insertar: cualquier usuario autenticado puede crear notificaciones para otros
-- (necesario para que un jugador notifique al dueño al reservar, y viceversa)
create policy "Authenticated insert notifications"
  on public.notifications for insert
  with check (auth.uid() is not null);

-- ─── SEED: Notificaciones de prueba para andres.agudelo@asygnuz.com ──────────
-- ID del usuario Andres Agudelo (andres_asy): d2b3edfb-be53-4e21-9b99-9be6e0298d9d

do $$
declare
  uid uuid := 'd2b3edfb-be53-4e21-9b99-9be6e0298d9d';
begin

  -- Borrar seed anterior para no duplicar
  delete from public.notifications where user_id = uid and created_at > now() - interval '1 hour';

  -- 1. Solicitud de reserva nueva (como dueño de cancha)
  insert into public.notifications (user_id, type, data, created_at) values
  (uid, 'booking_new_request', jsonb_build_object(
    'cancha_id',    'cancha-test-001',
    'cancha_name',  'Cancha Los Pinos',
    'booking_date', to_char(now() + interval '2 days', 'YYYY-MM-DD'),
    'start_time',   '18:00',
    'end_time',     '19:00',
    'booker_name',  'Juan Pablo Ríos',
    'booker_id',    '6c78ca20-2c32-474f-b2ad-2200f34ea988'
  ), now() - interval '5 minutes');

  -- 2. Reserva confirmada (como jugador)
  insert into public.notifications (user_id, type, data, created_at) values
  (uid, 'booking_confirmed', jsonb_build_object(
    'cancha_id',    'cancha-test-001',
    'cancha_name',  'Cancha Los Pinos',
    'booking_date', to_char(now() + interval '3 days', 'YYYY-MM-DD'),
    'start_time',   '10:00',
    'end_time',     '11:00',
    'total_price',  50000
  ), now() - interval '20 minutes');

  -- 3. Reserva cancelada por el dueño
  insert into public.notifications (user_id, type, data, created_at) values
  (uid, 'booking_cancelled_owner', jsonb_build_object(
    'cancha_id',    'cancha-test-002',
    'cancha_name',  'Cancha El Bosque',
    'booking_date', to_char(now() + interval '1 day', 'YYYY-MM-DD'),
    'start_time',   '16:00',
    'end_time',     '17:00',
    'total_price',  40000
  ), now() - interval '1 hour');

  -- 4. Solicitud de partido (match_request)
  insert into public.notifications (user_id, type, data, created_at) values
  (uid, 'match_request', jsonb_build_object(
    'player_name',  'Carlos García',
    'player_id',    'aaaaaaaa-aaaa-aaaa-aaaa-000000000001',
    'match_id',     'match-test-001',
    'match_title',  'Fútbol 5 - Sábado tarde'
  ), now() - interval '2 hours');

  -- 5. Match invitación aceptada
  insert into public.notifications (user_id, type, data, created_at) values
  (uid, 'match_accepted', jsonb_build_object(
    'player_name',  'Pedro Promotor',
    'match_id',     'match-test-002',
    'match_title',  'Pádel dobles - Domingo'
  ), now() - interval '3 hours');

  -- 6. Partido actualizado
  insert into public.notifications (user_id, type, data, created_at) values
  (uid, 'match_updated', jsonb_build_object(
    'match_id',        'match-test-001',
    'match_title',     'Fútbol 5 - Sábado tarde',
    'changes',         'Cambio de hora: ahora es a las 16:00',
    'needs_reconfirm', true
  ), now() - interval '4 hours');

  raise notice 'Seed de notificaciones creado para usuario %', uid;
end;
$$;

-- Verificar que se insertaron
select type, created_at, read_at
from public.notifications
where user_id = 'd2b3edfb-be53-4e21-9b99-9be6e0298d9d'
order by created_at desc;
