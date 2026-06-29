-- =============================================================================
-- Seed: Marchagás Centro Deportivo — Pereira, Risaralda
-- Credenciales admin: marchagas@pro.test / Test1234!
-- =============================================================================

DO $$
DECLARE
  uid_marchagas   uuid := 'cccccccc-cccc-cccc-cccc-000000000001';
  vid_marchagas   uuid := 'eeeeeeee-eeee-eeee-eeee-000000000001';
  cid_m1          uuid := 'ffffffff-ffff-ffff-ffff-000000000001';
  cid_m2          uuid := 'ffffffff-ffff-ffff-ffff-000000000002';
  cid_m3          uuid := 'ffffffff-ffff-ffff-ffff-000000000003';
BEGIN
  -- ── Usuario admin de Marchagás ────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    uid_marchagas,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'marchagas@pro.test',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    '{"full_name": "Marchagás Admin", "is_player": false, "is_promoter": false, "is_cancha": true}'::jsonb,
    now(), now(), '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, full_name, city, created_at, updated_at)
  VALUES (uid_marchagas, 'Marchagás Admin', 'Pereira', now(), now())
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, city = EXCLUDED.city;

  INSERT INTO public.user_roles (user_id, is_player, is_promoter, is_cancha, created_at, updated_at)
  VALUES (uid_marchagas, false, false, true, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET is_cancha = true;

  -- ── Venue: Marchagás Centro Deportivo ─────────────────────────────────────
  -- Ubicación real: https://maps.app.goo.gl/... (5.0416274, -75.5036872)
  INSERT INTO public.venues (id, name, address, city, lat, lng, description, phone, created_by, created_at, updated_at)
  VALUES (
    vid_marchagas,
    'Marchagás Centro Deportivo',
    'Marchagás, Pereira',
    'Pereira',
    5.0416274,
    -75.5036872,
    'Centro deportivo con 3 canchas de fútbol 9 en césped sintético.',
    NULL,
    uid_marchagas,
    now(), now()
  ) ON CONFLICT (id) DO NOTHING;

  -- ── 3 canchas de Fútbol 9 ─────────────────────────────────────────────────
  INSERT INTO public.canchas (id, owner_id, venue_id, name, description, sport_type, capacity, address, city, lat, lng, price_per_hour, discount_percent, is_active)
  VALUES
    (cid_m1, uid_marchagas, vid_marchagas,
     'Marchagás Cancha 1',
     'Cancha de fútbol 9 en césped sintético de alta calidad con iluminación LED.',
     'futbol_9', 18,
     'Marchagás, Pereira', 'Pereira',
     5.0416274, -75.5036872,
     90000, 0, true),
    (cid_m2, uid_marchagas, vid_marchagas,
     'Marchagás Cancha 2',
     'Cancha de fútbol 9 techada, disponible en cualquier condición climática.',
     'futbol_9', 18,
     'Marchagás, Pereira', 'Pereira',
     5.0416274, -75.5036872,
     95000, 10, true),
    (cid_m3, uid_marchagas, vid_marchagas,
     'Marchagás Cancha 3',
     'Cancha de fútbol 9 con gradería lateral y camerinos propios.',
     'futbol_9', 18,
     'Marchagás, Pereira', 'Pereira',
     5.0416274, -75.5036872,
     90000, 0, true)
  ON CONFLICT (id) DO NOTHING;

  -- ── Horarios (Lunes-Sábado 07:00-22:00, Domingo 08:00-20:00) ─────────────
  INSERT INTO public.cancha_schedules (cancha_id, day_of_week, opens_at, closes_at, is_available)
  SELECT c.id, d.day,
    CASE WHEN d.day = 0 THEN '08:00'::TIME ELSE '07:00'::TIME END,
    CASE WHEN d.day = 0 THEN '20:00'::TIME ELSE '22:00'::TIME END,
    true
  FROM public.canchas c
  CROSS JOIN (VALUES (0),(1),(2),(3),(4),(5),(6)) AS d(day)
  WHERE c.id IN (cid_m1, cid_m2, cid_m3)
  ON CONFLICT (cancha_id, day_of_week) DO NOTHING;

END $$;

-- Verificación
SELECT v.name AS venue, c.name AS cancha, c.sport_type, c.price_per_hour, c.city
FROM public.venues v
JOIN public.canchas c ON c.venue_id = v.id
WHERE v.id = 'eeeeeeee-eeee-eeee-eeee-000000000001'
ORDER BY c.name;

SELECT 'marchagas@pro.test' AS email, 'Test1234!' AS password, 'Admin Marchagás' AS rol;
