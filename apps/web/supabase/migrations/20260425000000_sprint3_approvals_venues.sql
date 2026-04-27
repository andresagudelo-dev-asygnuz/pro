-- =========================================================================
-- G4 Sprint 3 — Gestión de Partidos (Aprobaciones) y Canchas (Venues)
-- =========================================================================

-- 1. Actualizar participant_status enum
-- Nota: En Postgres no se puede ejecutar ALTER TYPE ADD VALUE dentro de una transacción
-- o bloque DO de forma sencilla si el tipo se usa en la misma transacción.
-- Supabase corre las migraciones de forma que esto suele permitirse.
ALTER TYPE public.participant_status ADD VALUE IF NOT EXISTS 'requested';
ALTER TYPE public.participant_status ADD VALUE IF NOT EXISTS 'invited';

-- 2. Notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'match_request', 'match_invite', 'match_accepted', 'reservation_confirmed'
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_read_self" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_update_self" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Canchas (Venues)
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS venues_city_idx ON public.venues(city);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "venues_read_all" ON public.venues FOR SELECT USING (true);
CREATE POLICY "venues_owner_all" ON public.venues FOR ALL USING (auth.uid() = owner_id);

-- 4. Canchas Individuales (Courts)
CREATE TABLE IF NOT EXISTS public.venue_courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity_players INTEGER NOT NULL DEFAULT 10,
    price_per_hour NUMERIC(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.venue_courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courts_read_all" ON public.venue_courts FOR SELECT USING (true);
CREATE POLICY "courts_admin_all" ON public.venue_courts FOR ALL
    USING (EXISTS (SELECT 1 FROM public.venues WHERE id = venue_id AND owner_id = auth.uid()));

-- 5. Reservas (Reservations)
CREATE TABLE IF NOT EXISTS public.venue_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID NOT NULL REFERENCES public.venue_courts(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
    reserved_by UUID NOT NULL REFERENCES auth.users(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'cancelled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT reservation_time_check CHECK (ends_at > starts_at)
);

ALTER TABLE public.venue_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reservations_read_involved" ON public.venue_reservations
    FOR SELECT USING (
        auth.uid() = reserved_by OR
        EXISTS (
            SELECT 1 FROM public.venue_courts c
            JOIN public.venues v ON v.id = c.venue_id
            WHERE c.id = court_id AND v.owner_id = auth.uid()
        )
    );

CREATE POLICY "reservations_insert_auth" ON public.venue_reservations
    FOR INSERT WITH CHECK (auth.uid() = reserved_by);

-- 6. Triggers para updated_at
CREATE TRIGGER venues_set_updated_at BEFORE UPDATE ON public.venues
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER venue_courts_set_updated_at BEFORE UPDATE ON public.venue_courts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER venue_reservations_set_updated_at BEFORE UPDATE ON public.venue_reservations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. Realtime para notificaciones
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
