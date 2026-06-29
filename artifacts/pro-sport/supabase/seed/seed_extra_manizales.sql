-- =============================================================================
-- SEED EXTRA: Más canchas en Manizales
-- PREREQUISITO: haber ejecutado canchas_migration.sql primero
-- =============================================================================
DO $$
DECLARE
  uid_cancha  uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-000000000004';
  cid_4       uuid := 'dddddddd-dddd-dddd-dddd-000000000004';
  cid_5       uuid := 'dddddddd-dddd-dddd-dddd-000000000005';
  cid_6       uuid := 'dddddddd-dddd-dddd-dddd-000000000006';
  cid_7       uuid := 'dddddddd-dddd-dddd-dddd-000000000007';
  cid_8       uuid := 'dddddddd-dddd-dddd-dddd-000000000008';
BEGIN
  -- 5 canchas adicionales en Manizales
  INSERT INTO public.canchas
    (id, owner_id, name, description, sport_type, capacity, address, city, price_per_hour, discount_percent, is_active)
  VALUES
    (cid_4, uid_cancha,
     'Estadio Manizales Fútbol 5',
     'Cancha de fútbol 5 en césped sintético premium con vestuarios y graderías',
     'futbol_5', 10, 'Calle 30 #45-12, Chipre', 'Manizales', 75000, 0, true),

    (cid_5, uid_cancha,
     'Club Pádel Los Andes',
     'Tres canchas de pádel techadas con iluminación nocturna y cafetería',
     'padel', 4, 'Av. 12 de Octubre #5-80', 'Manizales', 60000, 15, true),

    (cid_6, uid_cancha,
     'Cancha Los Rosales Fútbol Sala',
     'Cancha de microfútbol en parquet profesional, ideal para torneos',
     'futbol_sala', 12, 'Carrera 25 #70-40, Los Rosales', 'Manizales', 50000, 0, true),

    (cid_7, uid_cancha,
     'Complejo Basket Manizales',
     'Dos canchas de baloncesto con tableros oficiales y gradas cubiertas',
     'basket', 10, 'Calle 56 #23-90, La Estrella', 'Manizales', 45000, 0, true),

    (cid_8, uid_cancha,
     'Arena Tenis Club',
     'Tres canchas de tenis en polvo de ladrillo, nivel competitivo',
     'tenis', 4, 'Av. Santander #89-10, Milán', 'Manizales', 70000, 10, true)
  ON CONFLICT (id) DO NOTHING;

  -- Horarios: Lunes a Sábado 08:00–22:00, Domingo 09:00–18:00
  INSERT INTO public.cancha_schedules (cancha_id, day_of_week, opens_at, closes_at, is_available)
  SELECT c.id,
         d.day,
         CASE WHEN d.day = 0 THEN '09:00'::TIME ELSE '08:00'::TIME END,
         CASE WHEN d.day = 0 THEN '18:00'::TIME ELSE '22:00'::TIME END,
         true
  FROM public.canchas c
  CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(day)
  WHERE c.id IN (cid_4, cid_5, cid_6, cid_7, cid_8)
  ON CONFLICT (cancha_id, day_of_week) DO NOTHING;

END $$;

-- Verificar resultado
SELECT name, sport_type, price_per_hour, address FROM public.canchas
WHERE city = 'Manizales'
ORDER BY name;
