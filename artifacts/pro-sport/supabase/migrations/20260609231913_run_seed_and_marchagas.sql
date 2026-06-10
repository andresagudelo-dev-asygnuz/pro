-- =============================================================================
-- PRO. — Plataforma Deportiva — SEED DE DATOS PARA PRUEBAS
-- =============================================================================
-- Cómo usar:
--   1. Abrí tu proyecto en supabase.com
--   2. Andá a "SQL Editor" en el menú lateral
--   3. Pegá todo este contenido y ejecutá con "Run"
--   4. Listo — tendrás 3 usuarios de prueba y datos de ejemplo
--
-- Usuarios creados:
--   jugador@pro.test   / Test1234!   → solo jugador
--   promotor@pro.test  / Test1234!   → solo promotor
--   dual@pro.test      / Test1234!   → jugador + promotor
--
-- IMPORTANTE: ejecutar solo una vez. Si lo volvés a correr, los ON CONFLICT
-- evitan duplicados en datos, pero los auth.users pueden fallar si ya existen.
-- Para re-ejecutar limpio, primero eliminá los usuarios desde Auth > Users.
-- =============================================================================

DO $$
DECLARE
  -- UUIDs fijos para reproducibilidad
  uid_player   uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-000000000001';
  uid_promoter uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-000000000002';
  uid_dual     uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-000000000003';

  tid_1 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-000000000001'; -- Copa Manizales (abierto)
  tid_2 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-000000000002'; -- Liga Regio (borrador)
  tid_3 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-000000000003'; -- Torneo Pádel Mixto (abierto)
  tid_4 uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-000000000004'; -- Torneo Basket (cerrado)

  reg_1 uuid := 'cccccccc-cccc-cccc-cccc-000000000001';
  reg_2 uuid := 'cccccccc-cccc-cccc-cccc-000000000002';

BEGIN

-- ---------------------------------------------------------------------------
-- 1. USUARIOS en auth.users
--    El trigger on_auth_user_created crea profiles automáticamente.
--    El trigger on_auth_user_created_roles crea user_roles automáticamente.
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password, email_confirmed_at,
  raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES
  (
    uid_player,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'jugador@pro.test',
    extensions.crypt('Test1234!', extensions.gen_salt('bf')),
    now(),
    '{"full_name": "Juan Jugador", "is_player": true, "is_promoter": false}'::jsonb,
    now(), now(),
    '', '', '', ''
  ),
  (
    uid_promoter,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'promotor@pro.test',
    extensions.crypt('Test1234!', extensions.gen_salt('bf')),
    now(),
    '{"full_name": "Pedro Promotor", "is_player": false, "is_promoter": true}'::jsonb,
    now(), now(),
    '', '', '', ''
  ),
  (
    uid_dual,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'dual@pro.test',
    extensions.crypt('Test1234!', extensions.gen_salt('bf')),
    now(),
    '{"full_name": "Diana Dual", "is_player": true, "is_promoter": true}'::jsonb,
    now(), now(),
    '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. PERFILES (si el trigger no los creó, los creamos manualmente)
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (id, full_name, city, created_at, updated_at)
VALUES
  (uid_player,   'Juan Jugador',  'Medellín',   now(), now()),
  (uid_promoter, 'Pedro Promotor','Manizales',  now(), now()),
  (uid_dual,     'Diana Dual',    'Bogotá',     now(), now())
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      city      = EXCLUDED.city;

-- ---------------------------------------------------------------------------
-- 3. ROLES (si el trigger no los creó, los creamos manualmente)
-- ---------------------------------------------------------------------------
INSERT INTO public.user_roles (user_id, is_player, is_promoter, created_at, updated_at)
VALUES
  (uid_player,   true,  false, now(), now()),
  (uid_promoter, false, true,  now(), now()),
  (uid_dual,     true,  true,  now(), now())
ON CONFLICT (user_id) DO UPDATE
  SET is_player   = EXCLUDED.is_player,
      is_promoter = EXCLUDED.is_promoter;

-- ---------------------------------------------------------------------------
-- 4. TORNEOS (todos creados por promotor o dual)
-- ---------------------------------------------------------------------------
INSERT INTO public.tournaments (
  id, owner_id, name, format, slots, slots_filled,
  location, start_date, end_date, status, categories,
  created_at, updated_at
)
VALUES
  (
    tid_1, uid_promoter,
    'Copa Manizales 2026', 'eliminatoria', 16, 0,
    'Manizales', '2026-06-01', '2026-06-30',
    'abierto_inscripciones', '[]'::jsonb,
    now(), now()
  ),
  (
    tid_2, uid_promoter,
    'Liga Regio Fútbol', 'liga', 8, 0,
    'Medellín', '2026-07-01', '2026-08-31',
    'borrador', '[]'::jsonb,
    now(), now()
  ),
  (
    tid_3, uid_dual,
    'Torneo Pádel Mixto', 'fase_grupos_eliminatoria', 12, 0,
    'Bogotá', '2026-06-15', '2026-06-25',
    'abierto_inscripciones', '[]'::jsonb,
    now(), now()
  ),
  (
    tid_4, uid_dual,
    'Torneo Basket Universitario', 'liga', 10, 0,
    'Bogotá', '2026-05-01', '2026-05-31',
    'cerrado_inscripciones', '[]'::jsonb,
    now() - interval '10 days', now()
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. INSCRIPCIONES (jugador inscripto en torneos abiertos)
--    Insertamos directamente sin pasar por el trigger enforce_tournament_capacity
--    para simplificar el seed. Actualizamos slots_filled manualmente.
-- ---------------------------------------------------------------------------

-- Deshabilitar temporalmente el trigger de capacidad para el seed

INSERT INTO public.tournament_registrations (
  id, tournament_id, user_id, team_id, status, registered_by, created_at, updated_at
)
VALUES
  -- Juan Jugador inscripto en Copa Manizales (abierto)
  (
    reg_1, tid_1, uid_player, null,
    'confirmada', uid_player,
    now(), now()
  ),
  -- Juan Jugador inscripto en Torneo Pádel Mixto (abierto)
  (
    reg_2, tid_3, uid_player, null,
    'confirmada', uid_player,
    now(), now()
  )
ON CONFLICT DO NOTHING;

-- Re-habilitar el trigger

-- Actualizar slots_filled manualmente para reflejar las inscripciones
UPDATE public.tournaments SET slots_filled = 1 WHERE id = tid_1;
UPDATE public.tournaments SET slots_filled = 1 WHERE id = tid_3;

END $$;

-- =============================================================================
-- ACTUALIZAR CONSTRAINT user_roles si aún no existe is_cancha
-- (ejecutar SOLO si ya corriste canchas_migration.sql primero)
-- =============================================================================
-- Si el campo is_cancha ya existe (corriste canchas_migration.sql), los
-- INSERT de user_roles abajo incluyen la columna. Si no lo corriste aún,
-- comentá la columna is_cancha en los VALUES y correlo después.

-- =============================================================================
-- RESUMEN DE USUARIOS DE PRUEBA
-- =============================================================================
SELECT
  u.email,
  p.full_name,
  r.is_player,
  r.is_promoter,
  CASE
    WHEN r.is_player AND r.is_promoter THEN 'Jugador + Promotor'
    WHEN r.is_promoter THEN 'Solo Promotor'
    WHEN r.is_player THEN 'Solo Jugador'
    ELSE 'Sin rol'
  END AS rol,
  'Test1234!' AS password
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE u.email IN ('jugador@pro.test', 'promotor@pro.test', 'dual@pro.test')
ORDER BY u.email;

-- =============================================================================
-- RESUMEN DE TORNEOS
-- =============================================================================
SELECT
  t.name,
  p.full_name AS organizador,
  t.status,
  t.location,
  t.slots_filled || '/' || t.slots AS cupos,
  t.start_date::text || ' → ' || t.end_date::text AS fechas
FROM public.tournaments t
JOIN public.profiles p ON p.id = t.owner_id
WHERE t.id IN (
  'bbbbbbbb-bbbb-bbbb-bbbb-000000000001',
  'bbbbbbbb-bbbb-bbbb-bbbb-000000000002',
  'bbbbbbbb-bbbb-bbbb-bbbb-000000000003',
  'bbbbbbbb-bbbb-bbbb-bbbb-000000000004'
)
ORDER BY t.created_at;



DO $$
DECLARE
  v_user_id uuid;
  uid_cancha uuid := 'dddddddd-dddd-dddd-dddd-000000000001';
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'marchagas@pro.test';

  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password, email_confirmed_at,
      raw_user_meta_data,
      created_at, updated_at
    )
    VALUES (
      uid_cancha, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'marchagas@pro.test', extensions.crypt('Test1234!', extensions.gen_salt('bf')), now(),
      '{"full_name": "Mar Chagas", "is_player": false, "is_promoter": false, "is_cancha": true}'::jsonb,
      now(), now()
    );
    v_user_id := uid_cancha;
  END IF;

  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (v_user_id, 'Mar Chagas', now(), now())
  ON CONFLICT (id) DO UPDATE SET full_name = 'Mar Chagas';

  INSERT INTO public.user_roles (user_id, is_player, is_cancha, created_at, updated_at)
  VALUES (v_user_id, false, true, now(), now())
  ON CONFLICT (user_id) DO UPDATE SET is_cancha = true, is_player = false;
END $$;
