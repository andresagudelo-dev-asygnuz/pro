-- =============================================================================
-- PRO. — Módulo Canchas (ejecutar en Supabase SQL Editor)
-- PREREQUISITO: haber ejecutado todos los migrations anteriores + seed.sql
-- =============================================================================
-- Qué hace este script:
--   1. Agrega rol `is_cancha` a user_roles
--   2. Actualiza trigger de signup para leer is_cancha de metadata
--   3. Crea tablas: canchas, cancha_schedules, cancha_bookings
--   4. RLS para las 3 tablas nuevas
--   5. Actualiza política de creación de torneos para permitir dueños de cancha
--   6. Agrega cancha_booking_id a matches
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Agregar columna is_cancha a user_roles
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_cancha BOOLEAN NOT NULL DEFAULT false;

-- Actualizar constraint para incluir is_cancha como rol válido
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_at_least_one_role;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_at_least_one_role
  CHECK (is_player OR is_promoter OR is_cancha);

CREATE INDEX IF NOT EXISTS user_roles_cancha_idx
  ON public.user_roles (is_cancha) WHERE is_cancha = true;

-- ---------------------------------------------------------------------------
-- 2. Actualizar trigger handle_new_user_roles para leer is_cancha
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_player   BOOLEAN := COALESCE(
    NULLIF(LOWER(NEW.raw_user_meta_data->>'is_player'), '') IN ('true','t','yes','y','1','on'), false);
  v_is_promoter BOOLEAN := COALESCE(
    NULLIF(LOWER(NEW.raw_user_meta_data->>'is_promoter'), '') IN ('true','t','yes','y','1','on'), false);
  v_is_cancha   BOOLEAN := COALESCE(
    NULLIF(LOWER(NEW.raw_user_meta_data->>'is_cancha'), '') IN ('true','t','yes','y','1','on'), false);
BEGIN
  IF NOT v_is_player AND NOT v_is_promoter AND NOT v_is_cancha THEN
    v_is_player := true;
  END IF;
  INSERT INTO public.user_roles (user_id, is_player, is_promoter, is_cancha)
  VALUES (NEW.id, v_is_player, v_is_promoter, v_is_cancha)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Enum cancha_sport_type
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cancha_sport_type') THEN
    CREATE TYPE public.cancha_sport_type AS ENUM (
      'futbol_11', 'futbol_9', 'futbol_5', 'futbol_sala',
      'padel', 'tenis', 'basket', 'voleibol', 'otro'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Enum booking_status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
    CREATE TYPE public.booking_status AS ENUM ('pendiente', 'confirmada', 'cancelada');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Tabla canchas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.canchas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  description      TEXT,
  sport_type       public.cancha_sport_type NOT NULL DEFAULT 'futbol_5',
  capacity         INT NOT NULL DEFAULT 10 CHECK (capacity > 0),
  address          TEXT NOT NULL,
  city             TEXT NOT NULL,
  price_per_hour   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price_per_hour >= 0),
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  phone            TEXT,
  whatsapp         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS canchas_owner_idx       ON public.canchas (owner_id);
CREATE INDEX IF NOT EXISTS canchas_city_sport_idx  ON public.canchas (city, sport_type);
CREATE INDEX IF NOT EXISTS canchas_active_idx      ON public.canchas (is_active) WHERE is_active = true;

DROP TRIGGER IF EXISTS set_canchas_updated_at ON public.canchas;
CREATE TRIGGER set_canchas_updated_at
  BEFORE UPDATE ON public.canchas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.canchas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "canchas_select" ON public.canchas;
CREATE POLICY "canchas_select"
  ON public.canchas FOR SELECT
  USING (is_active = true OR owner_id = auth.uid());

DROP POLICY IF EXISTS "canchas_insert" ON public.canchas;
CREATE POLICY "canchas_insert"
  ON public.canchas FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND COALESCE((SELECT is_cancha FROM public.user_roles WHERE user_id = auth.uid()), false) = true
  );

DROP POLICY IF EXISTS "canchas_update" ON public.canchas;
CREATE POLICY "canchas_update"
  ON public.canchas FOR UPDATE
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "canchas_delete" ON public.canchas;
CREATE POLICY "canchas_delete"
  ON public.canchas FOR DELETE
  USING (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. Tabla cancha_schedules (horario semanal)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cancha_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id    UUID NOT NULL REFERENCES public.canchas(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at     TIME NOT NULL DEFAULT '08:00',
  closes_at    TIME NOT NULL DEFAULT '22:00',
  is_available BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (cancha_id, day_of_week),
  CONSTRAINT valid_schedule_times CHECK (closes_at > opens_at)
);

CREATE INDEX IF NOT EXISTS cancha_schedules_cancha_idx ON public.cancha_schedules (cancha_id);

ALTER TABLE public.cancha_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cancha_schedules_select" ON public.cancha_schedules;
CREATE POLICY "cancha_schedules_select"
  ON public.cancha_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "cancha_schedules_insert" ON public.cancha_schedules;
CREATE POLICY "cancha_schedules_insert"
  ON public.cancha_schedules FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.canchas c WHERE c.id = cancha_id AND c.owner_id = auth.uid()));

DROP POLICY IF EXISTS "cancha_schedules_update" ON public.cancha_schedules;
CREATE POLICY "cancha_schedules_update"
  ON public.cancha_schedules FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.canchas c WHERE c.id = cancha_id AND c.owner_id = auth.uid()));

DROP POLICY IF EXISTS "cancha_schedules_delete" ON public.cancha_schedules;
CREATE POLICY "cancha_schedules_delete"
  ON public.cancha_schedules FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.canchas c WHERE c.id = cancha_id AND c.owner_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 7. Tabla cancha_bookings (reservas)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cancha_bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id      UUID NOT NULL REFERENCES public.canchas(id) ON DELETE CASCADE,
  booked_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_date   DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  status         public.booking_status NOT NULL DEFAULT 'pendiente',
  match_id       UUID,
  total_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_booking_times CHECK (end_time > start_time)
);

-- Evitar doble reserva del mismo horario (permite re-reservar si fue cancelada)
CREATE UNIQUE INDEX IF NOT EXISTS cancha_bookings_no_overlap
  ON public.cancha_bookings (cancha_id, booking_date, start_time)
  WHERE status <> 'cancelada';

CREATE INDEX IF NOT EXISTS cancha_bookings_cancha_date_idx ON public.cancha_bookings (cancha_id, booking_date);
CREATE INDEX IF NOT EXISTS cancha_bookings_booked_by_idx   ON public.cancha_bookings (booked_by);

DROP TRIGGER IF EXISTS set_cancha_bookings_updated_at ON public.cancha_bookings;
CREATE TRIGGER set_cancha_bookings_updated_at
  BEFORE UPDATE ON public.cancha_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cancha_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cancha_bookings_select" ON public.cancha_bookings;
CREATE POLICY "cancha_bookings_select"
  ON public.cancha_bookings FOR SELECT
  USING (
    booked_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.canchas c WHERE c.id = cancha_id AND c.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "cancha_bookings_insert" ON public.cancha_bookings;
CREATE POLICY "cancha_bookings_insert"
  ON public.cancha_bookings FOR INSERT
  WITH CHECK (booked_by = auth.uid());

DROP POLICY IF EXISTS "cancha_bookings_update" ON public.cancha_bookings;
CREATE POLICY "cancha_bookings_update"
  ON public.cancha_bookings FOR UPDATE
  USING (
    booked_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.canchas c WHERE c.id = cancha_id AND c.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 8. Permitir que dueños de cancha también creen torneos
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Solo los promotores pueden crear torneos" ON public.tournaments;
DROP POLICY IF EXISTS "Promotores y dueños de cancha pueden crear torneos" ON public.tournaments;

CREATE POLICY "Promotores y dueños de cancha pueden crear torneos"
  ON public.tournaments FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND (
      COALESCE((SELECT is_promoter FROM public.user_roles WHERE user_id = auth.uid()), false) = true
      OR COALESCE((SELECT is_cancha FROM public.user_roles WHERE user_id = auth.uid()), false) = true
    )
  );

-- ---------------------------------------------------------------------------
-- 9. Agregar cancha_booking_id a matches
-- ---------------------------------------------------------------------------
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS cancha_booking_id UUID;

-- =============================================================================
-- SEED DE CANCHAS (usuarios y canchas de prueba)
-- =============================================================================
DO $$
DECLARE
  uid_cancha   uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004';
  cid_1        uuid := 'dddddddd-dddd-dddd-dddd-000000000001';
  cid_2        uuid := 'dddddddd-dddd-dddd-dddd-000000000002';
  cid_3        uuid := 'dddddddd-dddd-dddd-dddd-000000000003';
BEGIN
  -- Usuario dueño de canchas
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    uid_cancha, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'cancha@pro.test', crypt('Test1234!', gen_salt('bf')), now(),
    '{"full_name": "Carlos Cancha", "is_player": false, "is_promoter": false, "is_cancha": true}'::jsonb,
    now(), now(), '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Perfil
  INSERT INTO public.profiles (id, full_name, city, created_at, updated_at)
  VALUES (uid_cancha, 'Carlos Cancha', 'Manizales', now(), now())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Roles (is_cancha=true)
  INSERT INTO public.user_roles (user_id, is_player, is_promoter, is_cancha, created_at, updated_at)
  VALUES (uid_cancha, false, false, true, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET is_cancha = true;

  -- Canchas
  INSERT INTO public.canchas (id, owner_id, name, description, sport_type, capacity, address, city, price_per_hour, discount_percent, is_active)
  VALUES
    (cid_1, uid_cancha, 'La Bombonera', 'Cancha sintética de última generación con iluminación LED', 'futbol_5', 10, 'Calle 50 #23-45', 'Manizales', 80000, 0, true),
    (cid_2, uid_cancha, 'El Paladar Pádel', 'Dos canchas de pádel techadas con cristal panorámico', 'padel', 4, 'Av. Santander #12-30', 'Manizales', 55000, 10, true),
    (cid_3, uid_cancha, 'Arena Fútbol 9', 'Cancha de fútbol 9 en césped natural certificado', 'futbol_9', 18, 'Carrera 22 #67-10', 'Manizales', 120000, 0, true)
  ON CONFLICT (id) DO NOTHING;

  -- Horarios (Lunes-Sábado 08:00-22:00, Domingo cerrado)
  INSERT INTO public.cancha_schedules (cancha_id, day_of_week, opens_at, closes_at, is_available)
  SELECT c.id, d.day, '08:00'::TIME, '22:00'::TIME, d.day <> 0
  FROM public.canchas c
  CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(day)
  WHERE c.id IN (cid_1, cid_2, cid_3)
  ON CONFLICT (cancha_id, day_of_week) DO NOTHING;

END $$;

-- Resumen
SELECT name, sport_type, city, price_per_hour, is_active FROM public.canchas ORDER BY name;
SELECT 'cancha@pro.test' AS email, 'Test1234!' AS password, 'Solo Cancha' AS rol;
