-- Migration: Sprint 7 — Match Lobby, Venue Selection, and Profile Stats
-- Description:
--   1. Adds 'is_public' and 'venue_id' to matches.
--   2. Adds confirmation logic to match_participants.
--   3. Adds seeds for real venues in Manizales.
--   4. Adds trigger to aggregate Tournament stats into Profiles.

-- ---------------------------------------------------------------------------
-- 1. Actualización de esquema de Matches (Pickup Games)
-- ---------------------------------------------------------------------------

-- Agregar venue_id y flag de visibilidad/privacidad
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Agregar estado de confirmación a participantes
ALTER TABLE public.match_participants ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2. Seeds de Canchas (Manizales)
-- ---------------------------------------------------------------------------

-- Nota: Usamos un usuario 'admin' o el primer usuario del sistema como owner de las canchas por defecto en este seed.
DO $$
DECLARE
    v_owner_id UUID;
BEGIN
    SELECT id INTO v_owner_id FROM auth.users LIMIT 1;
    
    IF v_owner_id IS NOT NULL THEN
        INSERT INTO public.venues (owner_id, name, city, address, description)
        VALUES 
            (v_owner_id, 'Canchas Palermo', 'Manizales', 'Carrera 23 # 70-40', 'Canchas sintéticas de alta calidad en el corazón de Palermo.'),
            (v_owner_id, 'Complejo Deportivo Chipre', 'Manizales', 'Avenida 12 # 8-30', 'Canchas múltiples con vista a los atardeceres de Chipre.'),
            (v_owner_id, 'La Enea Fútbol 5', 'Manizales', 'Calle 100 # 32-15', 'Canchas de fútbol 5 techadas.'),
            (v_owner_id, 'Bosque Popular El Prado', 'Manizales', 'Vía al Magdalena', 'Canchas de césped natural para fútbol 11.'),
            (v_owner_id, 'Cancha Sintética Baja Suiza', 'Manizales', 'Barrio Baja Suiza', 'Escenario deportivo de grama sintética profesional.')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Agregación de Stats (Tournament -> Profiles)
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tournament_goals INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tournament_matches INTEGER DEFAULT 0;

-- Función para actualizar stats del perfil desde torneos
CREATE OR REPLACE FUNCTION public.update_profile_stats_from_tournaments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Recalcular para todos los jugadores involucrados en el torneo (o al menos los del match)
    -- Por eficiencia, solo para los jugadores del match actual (NEW.id)
    
    WITH stats AS (
        SELECT 
            me.player_id,
            COUNT(*) FILTER (WHERE me.event_type = 'gol') as goals
        FROM public.match_events me
        WHERE me.match_id = NEW.id
          AND me.player_id IS NOT NULL
        GROUP BY me.player_id
    )
    UPDATE public.profiles p
    SET 
        tournament_goals = p.tournament_goals + COALESCE(s.goals, 0),
        tournament_matches = p.tournament_matches + 1,
        updated_at = now()
    FROM stats s
    WHERE p.id = s.player_id;

    -- Si el jugador no tuvo eventos (goles), igual sumarle el partido jugado
    -- Necesitamos identificar a los jugadores inscritos en este match
    UPDATE public.profiles p
    SET tournament_matches = tournament_matches + 1
    WHERE id IN (
        SELECT tr.player_id 
        FROM public.tournament_registrations tr
        WHERE tr.id IN (NEW.home_registration_id, NEW.away_registration_id)
          AND tr.player_id IS NOT NULL
    )
    -- Evitar doble update para los que ya se actualizaron arriba con goles
    AND id NOT IN (SELECT player_id FROM public.match_events WHERE match_id = NEW.id AND player_id IS NOT NULL);

    RETURN NEW;
END;
$$;

-- Trigger al finalizar match de torneo
CREATE TRIGGER tm_after_finalize_update_profile_stats
    AFTER UPDATE OF status ON public.tournament_matches
    FOR EACH ROW
    WHEN (NEW.status = 'finalizado' AND OLD.status <> 'finalizado')
    EXECUTE FUNCTION public.update_profile_stats_from_tournaments();

-- ---------------------------------------------------------------------------
-- 4. Lógica de Auto-Kick (Lobby)
-- ---------------------------------------------------------------------------

-- Función para quitar participantes no confirmados 3h antes
CREATE OR REPLACE FUNCTION public.auto_kick_unconfirmed_participants()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Actualizar el estado de los participantes que no han confirmado 3 horas antes del partido.
    -- Los marcamos como 'left' para liberar el cupo.
    UPDATE public.match_participants mp
    SET status = 'left'
    FROM public.matches m
    WHERE mp.match_id = m.id
      AND mp.status = 'joined'
      AND mp.confirmed_at IS NULL
      AND m.starts_at <= (now() + interval '3 hours')
      AND m.status = 'open';
      
    -- En un sistema real, aquí enviaríamos las notificaciones de cupo abierto.
END;
$$;
