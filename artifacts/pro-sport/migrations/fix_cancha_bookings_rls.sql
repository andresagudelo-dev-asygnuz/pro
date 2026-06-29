-- Permitir leer las reservas para que el feed pueda saber en qué cancha es cada partido
DROP POLICY IF EXISTS "cancha_bookings_select" ON public.cancha_bookings;
CREATE POLICY "cancha_bookings_select"
  ON public.cancha_bookings FOR SELECT
  USING (true);
