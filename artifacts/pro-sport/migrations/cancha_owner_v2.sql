-- ─── Cancha Owner v2: Recurring Bookings + Client Tags + RLS ─────────────────

-- 1. Add recurring_booking_id column to cancha_bookings
ALTER TABLE public.cancha_bookings
  ADD COLUMN IF NOT EXISTS recurring_booking_id uuid;

-- 2. Recurring bookings table (pattern: cancha + user + day_of_week + time range + date range)
CREATE TABLE IF NOT EXISTS public.recurring_bookings (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id         uuid         NOT NULL REFERENCES public.canchas(id) ON DELETE CASCADE,
  user_id           uuid         NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  day_of_week       smallint     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time        text         NOT NULL, -- "HH:MM"
  end_time          text         NOT NULL, -- "HH:MM"
  start_date        date         NOT NULL,
  end_date          date         NOT NULL,
  status            text         NOT NULL DEFAULT 'pendiente'
                                  CHECK (status IN ('pendiente','confirmada','cancelada','pausada')),
  price_per_session numeric(10,2) NOT NULL DEFAULT 0,
  notes             text,
  confirmed_at      timestamptz,
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rb_cancha        ON public.recurring_bookings(cancha_id);
CREATE INDEX IF NOT EXISTS rb_user          ON public.recurring_bookings(user_id);
CREATE INDEX IF NOT EXISTS rb_cancha_status ON public.recurring_bookings(cancha_id, status);

-- 3. FK from cancha_bookings to recurring_bookings (safe: only add if column exists + table exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_recurring_booking'
      AND table_name = 'cancha_bookings'
  ) THEN
    ALTER TABLE public.cancha_bookings
      ADD CONSTRAINT fk_recurring_booking
      FOREIGN KEY (recurring_booking_id) REFERENCES public.recurring_bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Client tags (VIP / Frecuente / Bloqueado) — one tag per client per cancha
CREATE TABLE IF NOT EXISTS public.cancha_client_tags (
  cancha_id   uuid  NOT NULL REFERENCES public.canchas(id) ON DELETE CASCADE,
  user_id     uuid  NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  tag         text  NOT NULL CHECK (tag IN ('vip','frecuente','bloqueado')),
  notes       text,
  created_by  uuid  REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cancha_id, user_id)
);

CREATE INDEX IF NOT EXISTS cct_cancha ON public.cancha_client_tags(cancha_id);

-- 5. Function: generate individual cancha_bookings from a recurring booking
CREATE OR REPLACE FUNCTION public.generate_recurring_instances(p_recurring_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  rb  record;
  d   date;
  n   int := 0;
BEGIN
  SELECT * INTO rb FROM public.recurring_bookings WHERE id = p_recurring_id;
  IF rb IS NULL THEN RETURN 0; END IF;

  d := rb.start_date;
  WHILE d <= rb.end_date LOOP
    IF EXTRACT(DOW FROM d)::smallint = rb.day_of_week THEN
      INSERT INTO public.cancha_bookings (
        cancha_id, booked_by, booking_date, start_time, end_time,
        status, total_price, recurring_booking_id
      )
      VALUES (
        rb.cancha_id, rb.user_id, d,
        rb.start_time || ':00',
        rb.end_time   || ':00',
        'confirmada', rb.price_per_session, rb.id
      )
      ON CONFLICT DO NOTHING;
      n := n + 1;
    END IF;
    d := d + 1;
  END LOOP;

  UPDATE public.recurring_bookings
     SET status = 'confirmada', confirmed_at = now(), updated_at = now()
   WHERE id = p_recurring_id;

  RETURN n;
END;
$$;

-- 6. RLS — recurring_bookings
ALTER TABLE public.recurring_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rb_user_select"  ON public.recurring_bookings;
DROP POLICY IF EXISTS "rb_owner_select" ON public.recurring_bookings;
DROP POLICY IF EXISTS "rb_user_insert"  ON public.recurring_bookings;
DROP POLICY IF EXISTS "rb_owner_update" ON public.recurring_bookings;

CREATE POLICY "rb_user_select" ON public.recurring_bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "rb_owner_select" ON public.recurring_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.canchas c
    WHERE c.id = recurring_bookings.cancha_id AND c.owner_id = auth.uid()
  ));

CREATE POLICY "rb_user_insert" ON public.recurring_bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "rb_owner_update" ON public.recurring_bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.canchas c
    WHERE c.id = recurring_bookings.cancha_id AND c.owner_id = auth.uid()
  ));

-- 7. RLS — cancha_client_tags (owner-only)
ALTER TABLE public.cancha_client_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cct_owner_select" ON public.cancha_client_tags;
DROP POLICY IF EXISTS "cct_owner_insert" ON public.cancha_client_tags;
DROP POLICY IF EXISTS "cct_owner_update" ON public.cancha_client_tags;
DROP POLICY IF EXISTS "cct_owner_delete" ON public.cancha_client_tags;

CREATE POLICY "cct_owner_select" ON public.cancha_client_tags FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.canchas c WHERE c.id = cancha_client_tags.cancha_id AND c.owner_id = auth.uid()));
CREATE POLICY "cct_owner_insert" ON public.cancha_client_tags FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.canchas c WHERE c.id = cancha_client_tags.cancha_id AND c.owner_id = auth.uid()));
CREATE POLICY "cct_owner_update" ON public.cancha_client_tags FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.canchas c WHERE c.id = cancha_client_tags.cancha_id AND c.owner_id = auth.uid()));
CREATE POLICY "cct_owner_delete" ON public.cancha_client_tags FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.canchas c WHERE c.id = cancha_client_tags.cancha_id AND c.owner_id = auth.uid()));

-- 8. Ensure cancha_bookings has RLS with owner access (safe: only add if not already exists)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.cancha_bookings ENABLE ROW LEVEL SECURITY;
  EXCEPTION WHEN others THEN NULL;
  END;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cancha_bookings' AND policyname = 'Owner reads cancha bookings'
  ) THEN
    CREATE POLICY "Owner reads cancha bookings" ON public.cancha_bookings FOR SELECT
      USING (
        auth.uid() = booked_by OR
        EXISTS (SELECT 1 FROM public.canchas c WHERE c.id = cancha_bookings.cancha_id AND c.owner_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cancha_bookings' AND policyname = 'Users insert own bookings'
  ) THEN
    CREATE POLICY "Users insert own bookings" ON public.cancha_bookings FOR INSERT
      WITH CHECK (auth.uid() = booked_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cancha_bookings' AND policyname = 'Owner updates booking status'
  ) THEN
    CREATE POLICY "Owner updates booking status" ON public.cancha_bookings FOR UPDATE
      USING (
        auth.uid() = booked_by OR
        EXISTS (SELECT 1 FROM public.canchas c WHERE c.id = cancha_bookings.cancha_id AND c.owner_id = auth.uid())
      );
  END IF;
END $$;
