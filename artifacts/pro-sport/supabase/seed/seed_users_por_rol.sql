-- =============================================================================
-- PRO. — Seed: 11 usuarios por rol (jugadores, promotores, dueños de cancha)
-- =============================================================================
-- Contraseña de todos: Test1234!
--
-- JUGADORES (11):
--   carlos.ramirez@pro.test    Portero · Manizales
--   sebastian.torres@pro.test  Defensa · Medellín
--   andres.gomez@pro.test      Lateral · Bogotá
--   felipe.moreno@pro.test     Mediocampista · Cali
--   juanpablo.herrera@pro.test Mediocampista · Manizales
--   diego.martinez@pro.test    Delantero · Pereira
--   santiago.ospina@pro.test   Extremo · Manizales
--   miguel.restrepo@pro.test   Defensa central · Medellín
--   camilo.vargas@pro.test     Volante · Bogotá
--   mateo.cardona@pro.test     Delantero · Cali
--   julian.rios@pro.test       Lateral izquierdo · Manizales
--
-- PROMOTORES (11):
--   ricardo.palacios@pro.test  Manizales
--   luisf.castro@pro.test      Medellín
--   alejandro.silva@pro.test   Bogotá
--   german.rojas@pro.test      Cali
--   jorge.castano@pro.test     Pereira
--   rodrigo.blanco@pro.test    Manizales
--   ernesto.pedraza@pro.test   Barranquilla
--   manuel.guerrero@pro.test   Bucaramanga
--   bernardo.salcedo@pro.test  Cartagena
--   hector.morales@pro.test    Armenia
--   oscar.jimenez@pro.test     Ibagué
--
-- DUEÑOS DE CANCHA (11):
--   pedro.alvarez@pro.test     Manizales
--   ruben.castillo@pro.test    Medellín
--   arturo.londono@pro.test    Cali
--   nicolas.zapata@pro.test    Pereira
--   gustavo.munoz@pro.test     Bogotá
--   ignacio.velez@pro.test     Manizales
--   mauricio.toro@pro.test     Armenia
--   roberto.giraldo@pro.test   Medellín
--   ernesto.cano@pro.test      Cali
--   david.bedoya@pro.test      Pereira
--   fabian.aguirre@pro.test    Manizales
-- =============================================================================

DO $$
DECLARE
  -- ── Jugadores ──────────────────────────────────────────────────────────────
  j01 uuid := '11111111-1111-1111-1111-000000000001';
  j02 uuid := '11111111-1111-1111-1111-000000000002';
  j03 uuid := '11111111-1111-1111-1111-000000000003';
  j04 uuid := '11111111-1111-1111-1111-000000000004';
  j05 uuid := '11111111-1111-1111-1111-000000000005';
  j06 uuid := '11111111-1111-1111-1111-000000000006';
  j07 uuid := '11111111-1111-1111-1111-000000000007';
  j08 uuid := '11111111-1111-1111-1111-000000000008';
  j09 uuid := '11111111-1111-1111-1111-000000000009';
  j10 uuid := '11111111-1111-1111-1111-000000000010';
  j11 uuid := '11111111-1111-1111-1111-000000000011';

  -- ── Promotores ─────────────────────────────────────────────────────────────
  p01 uuid := '22222222-2222-2222-2222-000000000001';
  p02 uuid := '22222222-2222-2222-2222-000000000002';
  p03 uuid := '22222222-2222-2222-2222-000000000003';
  p04 uuid := '22222222-2222-2222-2222-000000000004';
  p05 uuid := '22222222-2222-2222-2222-000000000005';
  p06 uuid := '22222222-2222-2222-2222-000000000006';
  p07 uuid := '22222222-2222-2222-2222-000000000007';
  p08 uuid := '22222222-2222-2222-2222-000000000008';
  p09 uuid := '22222222-2222-2222-2222-000000000009';
  p10 uuid := '22222222-2222-2222-2222-000000000010';
  p11 uuid := '22222222-2222-2222-2222-000000000011';

  -- ── Dueños de cancha ───────────────────────────────────────────────────────
  c01 uuid := '33333333-3333-3333-3333-000000000001';
  c02 uuid := '33333333-3333-3333-3333-000000000002';
  c03 uuid := '33333333-3333-3333-3333-000000000003';
  c04 uuid := '33333333-3333-3333-3333-000000000004';
  c05 uuid := '33333333-3333-3333-3333-000000000005';
  c06 uuid := '33333333-3333-3333-3333-000000000006';
  c07 uuid := '33333333-3333-3333-3333-000000000007';
  c08 uuid := '33333333-3333-3333-3333-000000000008';
  c09 uuid := '33333333-3333-3333-3333-000000000009';
  c10 uuid := '33333333-3333-3333-3333-000000000010';
  c11 uuid := '33333333-3333-3333-3333-000000000011';

BEGIN

-- ============================================================================
-- JUGADORES
-- ============================================================================

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES
  (j01,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','carlos.ramirez@pro.test',   crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Carlos Ramírez",     "is_player":true,"is_promoter":false,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (j02,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','sebastian.torres@pro.test',  crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Sebastián Torres",   "is_player":true,"is_promoter":false,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (j03,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','andres.gomez@pro.test',      crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Andrés Gómez",       "is_player":true,"is_promoter":false,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (j04,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','felipe.moreno@pro.test',     crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Felipe Moreno",      "is_player":true,"is_promoter":false,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (j05,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','juanpablo.herrera@pro.test', crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Juan Pablo Herrera", "is_player":true,"is_promoter":false,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (j06,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','diego.martinez@pro.test',    crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Diego Martínez",     "is_player":true,"is_promoter":false,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (j07,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','santiago.ospina@pro.test',   crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Santiago Ospina",    "is_player":true,"is_promoter":false,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (j08,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','miguel.restrepo@pro.test',   crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Miguel Restrepo",    "is_player":true,"is_promoter":false,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (j09,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','camilo.vargas@pro.test',     crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Camilo Vargas",      "is_player":true,"is_promoter":false,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (j10,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','mateo.cardona@pro.test',     crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Mateo Cardona",      "is_player":true,"is_promoter":false,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (j11,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','julian.rios@pro.test',       crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Julián Ríos",        "is_player":true,"is_promoter":false,"is_cancha":false}'::jsonb,now(),now(),'','','','')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, username, city, bio, primary_skill_level, position, preferred_foot, skill_pace, skill_shooting, skill_passing, skill_dribbling, skill_defending, skill_physical, created_at, updated_at)
VALUES
  (j01,'Carlos Ramírez',    'carlos_gk',     'Manizales', 'Portero con buenos reflejos y salida de balón.',                    'intermedio',  'portero',          'derecho',    55, 42, 58, 45, 72, 74, now(), now()),
  (j02,'Sebastián Torres',  'sebas_defensa', 'Medellín',  'Central sólido, buen juego aéreo y lectura táctica.',               'avanzado',    'defensa',          'derecho',    62, 44, 65, 50, 85, 80, now(), now()),
  (j03,'Andrés Gómez',      'andres_lat',    'Bogotá',    'Lateral con buen despliegue físico y llegada al ataque.',           'intermedio',  'defensa',          'derecho',    78, 58, 68, 65, 70, 76, now(), now()),
  (j04,'Felipe Moreno',     'felipe_mf',     'Cali',      'Mediocampista con visión de juego y buen primer toque.',            'avanzado',    'mediocampista',    'ambos',      70, 65, 82, 78, 62, 71, now(), now()),
  (j05,'Juan Pablo Herrera','jp_10',         'Manizales', 'Enganche creativo, especialista en pase filtrado y jugadas de set.','avanzado',    'mediocampista',    'derecho',    68, 72, 88, 83, 52, 64, now(), now()),
  (j06,'Diego Martínez',    'diego_9',       'Pereira',   'Delantero centro, potente y eficaz en el área.',                    'avanzado',    'delantero',        'derecho',    80, 84, 62, 70, 40, 82, now(), now()),
  (j07,'Santiago Ospina',   'santi_ext',     'Manizales', 'Extremo veloz con buen regate y centros precisos.',                 'principiante','delantero',        'derecho',    88, 62, 60, 74, 38, 68, now(), now()),
  (j08,'Miguel Restrepo',   'migue_central', 'Medellín',  'Defensa central experimentado, capitán nato.',                      'pro',         'defensa',          'izquierdo',  60, 48, 70, 55, 90, 85, now(), now()),
  (j09,'Camilo Vargas',     'camilo_vol',    'Bogotá',    'Volante defensivo, recuperador y buen distribuidor.',               'intermedio',  'mediocampista',    'derecho',    72, 55, 74, 65, 78, 79, now(), now()),
  (j10,'Mateo Cardona',     'mateo_fwd',     'Cali',      'Delantero joven con mucho futuro, rápido y habilidoso.',            'principiante','delantero',        'izquierdo',  85, 68, 58, 78, 35, 72, now(), now()),
  (j11,'Julián Ríos',       'julian_lat_i',  'Manizales', 'Lateral izquierdo con proyección ofensiva y buen disparo.',         'intermedio',  'defensa',          'izquierdo',  76, 60, 66, 68, 68, 73, now(), now())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, username = EXCLUDED.username, city = EXCLUDED.city,
  bio = EXCLUDED.bio, primary_skill_level = EXCLUDED.primary_skill_level,
  position = EXCLUDED.position, preferred_foot = EXCLUDED.preferred_foot,
  skill_pace = EXCLUDED.skill_pace, skill_shooting = EXCLUDED.skill_shooting,
  skill_passing = EXCLUDED.skill_passing, skill_dribbling = EXCLUDED.skill_dribbling,
  skill_defending = EXCLUDED.skill_defending, skill_physical = EXCLUDED.skill_physical,
  updated_at = now();

INSERT INTO public.user_roles (user_id, is_player, is_promoter, is_cancha, created_at, updated_at)
VALUES
  (j01, true, false, false, now(), now()),
  (j02, true, false, false, now(), now()),
  (j03, true, false, false, now(), now()),
  (j04, true, false, false, now(), now()),
  (j05, true, false, false, now(), now()),
  (j06, true, false, false, now(), now()),
  (j07, true, false, false, now(), now()),
  (j08, true, false, false, now(), now()),
  (j09, true, false, false, now(), now()),
  (j10, true, false, false, now(), now()),
  (j11, true, false, false, now(), now())
ON CONFLICT (user_id) DO UPDATE SET is_player = true, updated_at = now();

-- ============================================================================
-- PROMOTORES
-- ============================================================================

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES
  (p01,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','ricardo.palacios@pro.test', crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Ricardo Palacios",  "is_player":false,"is_promoter":true,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (p02,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','luisf.castro@pro.test',     crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Luis Fernando Castro","is_player":false,"is_promoter":true,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (p03,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','alejandro.silva@pro.test',  crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Alejandro Silva",   "is_player":false,"is_promoter":true,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (p04,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','german.rojas@pro.test',     crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Germán Rojas",      "is_player":false,"is_promoter":true,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (p05,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','jorge.castano@pro.test',    crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Jorge Castaño",     "is_player":false,"is_promoter":true,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (p06,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','rodrigo.blanco@pro.test',   crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Rodrigo Blanco",    "is_player":false,"is_promoter":true,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (p07,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','ernesto.pedraza@pro.test',  crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Ernesto Pedraza",   "is_player":false,"is_promoter":true,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (p08,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','manuel.guerrero@pro.test',  crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Manuel Guerrero",   "is_player":false,"is_promoter":true,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (p09,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','bernardo.salcedo@pro.test', crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Bernardo Salcedo",  "is_player":false,"is_promoter":true,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (p10,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','hector.morales@pro.test',   crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Héctor Morales",    "is_player":false,"is_promoter":true,"is_cancha":false}'::jsonb,now(),now(),'','','',''),
  (p11,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','oscar.jimenez@pro.test',    crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Óscar Jiménez",     "is_player":false,"is_promoter":true,"is_cancha":false}'::jsonb,now(),now(),'','','','')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, username, city, bio, created_at, updated_at)
VALUES
  (p01,'Ricardo Palacios',   'ricardop_pro',   'Manizales',   'Promotor con 8 años organizando torneos en el Eje Cafetero.',          now(), now()),
  (p02,'Luis Fernando Castro','luisf_torneos', 'Medellín',    'Organizador de la Liga Amateur del Valle de Aburrá.',                  now(), now()),
  (p03,'Alejandro Silva',    'ale_silva_dep',  'Bogotá',      'Promotor deportivo, especialista en torneos de fútbol 7 y 9.',        now(), now()),
  (p04,'Germán Rojas',       'german_rojas',   'Cali',        'Impulsor del deporte barrial en el Sur de Cali.',                     now(), now()),
  (p05,'Jorge Castaño',      'jcastano_promo', 'Pereira',     'Organizador de la Copa Ciudad de Pereira desde 2019.',                now(), now()),
  (p06,'Rodrigo Blanco',     'rodrigo_dep',    'Manizales',   'Director técnico y promotor de torneos universitarios.',              now(), now()),
  (p07,'Ernesto Pedraza',    'ernesto_baq',    'Barranquilla','Promotor de eventos deportivos en la Costa Caribe.',                  now(), now()),
  (p08,'Manuel Guerrero',    'manuel_buc',     'Bucaramanga', 'Organizador del Torneo Interclubes de Santander.',                    now(), now()),
  (p09,'Bernardo Salcedo',   'bsalcedo_dep',   'Cartagena',   'Liga Deportiva del Caribe — torneos de playa y cancha.',              now(), now()),
  (p10,'Héctor Morales',     'hector_arm',     'Armenia',     'Promotor de torneos escolares y universitarios en el Quindío.',      now(), now()),
  (p11,'Óscar Jiménez',      'oscar_ibague',   'Ibagué',      'Organizador de la Copa Tolima de Fútbol Amateur.',                   now(), now())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, username = EXCLUDED.username,
  city = EXCLUDED.city, bio = EXCLUDED.bio, updated_at = now();

INSERT INTO public.user_roles (user_id, is_player, is_promoter, is_cancha, created_at, updated_at)
VALUES
  (p01, false, true, false, now(), now()),
  (p02, false, true, false, now(), now()),
  (p03, false, true, false, now(), now()),
  (p04, false, true, false, now(), now()),
  (p05, false, true, false, now(), now()),
  (p06, false, true, false, now(), now()),
  (p07, false, true, false, now(), now()),
  (p08, false, true, false, now(), now()),
  (p09, false, true, false, now(), now()),
  (p10, false, true, false, now(), now()),
  (p11, false, true, false, now(), now())
ON CONFLICT (user_id) DO UPDATE SET is_promoter = true, updated_at = now();

-- ============================================================================
-- DUEÑOS DE CANCHA
-- ============================================================================

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES
  (c01,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','pedro.alvarez@pro.test',   crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Pedro Álvarez",    "is_player":false,"is_promoter":false,"is_cancha":true}'::jsonb,now(),now(),'','','',''),
  (c02,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','ruben.castillo@pro.test',  crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Rubén Castillo",   "is_player":false,"is_promoter":false,"is_cancha":true}'::jsonb,now(),now(),'','','',''),
  (c03,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','arturo.londono@pro.test',  crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Arturo Londoño",   "is_player":false,"is_promoter":false,"is_cancha":true}'::jsonb,now(),now(),'','','',''),
  (c04,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','nicolas.zapata@pro.test',  crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Nicolás Zapata",   "is_player":false,"is_promoter":false,"is_cancha":true}'::jsonb,now(),now(),'','','',''),
  (c05,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','gustavo.munoz@pro.test',   crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Gustavo Muñoz",    "is_player":false,"is_promoter":false,"is_cancha":true}'::jsonb,now(),now(),'','','',''),
  (c06,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','ignacio.velez@pro.test',   crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Ignacio Vélez",    "is_player":false,"is_promoter":false,"is_cancha":true}'::jsonb,now(),now(),'','','',''),
  (c07,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','mauricio.toro@pro.test',   crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Mauricio Toro",    "is_player":false,"is_promoter":false,"is_cancha":true}'::jsonb,now(),now(),'','','',''),
  (c08,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','roberto.giraldo@pro.test', crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Roberto Giraldo",  "is_player":false,"is_promoter":false,"is_cancha":true}'::jsonb,now(),now(),'','','',''),
  (c09,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','ernesto.cano@pro.test',    crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Ernesto Cano",     "is_player":false,"is_promoter":false,"is_cancha":true}'::jsonb,now(),now(),'','','',''),
  (c10,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','david.bedoya@pro.test',    crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"David Bedoya",     "is_player":false,"is_promoter":false,"is_cancha":true}'::jsonb,now(),now(),'','','',''),
  (c11,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','fabian.aguirre@pro.test',  crypt('Test1234!',gen_salt('bf')),now(),'{"full_name":"Fabián Aguirre",   "is_player":false,"is_promoter":false,"is_cancha":true}'::jsonb,now(),now(),'','','','')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, username, city, bio, created_at, updated_at)
VALUES
  (c01,'Pedro Álvarez',   'pedro_canchas',   'Manizales',   'Dueño de Canchas La Avenida, 2 canchas de fútbol 7 y pádel.',         now(), now()),
  (c02,'Rubén Castillo',  'ruben_bello',     'Medellín',    'Administrador del Complejo Deportivo Bello Norte.',                   now(), now()),
  (c03,'Arturo Londoño',  'arturo_cali_dep', 'Cali',        'Propietario de Centro Deportivo El Cedro, Valle del Cauca.',          now(), now()),
  (c04,'Nicolás Zapata',  'nico_pereira',    'Pereira',     'Dueño de Canchas El Cóndor, canchas de grama sintética premium.',     now(), now()),
  (c05,'Gustavo Muñoz',   'gustavo_bogota',  'Bogotá',      'Administrador del Polideportivo Sur, Bogotá.',                        now(), now()),
  (c06,'Ignacio Vélez',   'nacho_manizales', 'Manizales',   'Propietario de Canchas Los Robles, en el sector del Cable.',          now(), now()),
  (c07,'Mauricio Toro',   'mauri_armenia',   'Armenia',     'Dueño del Parque Deportivo Quindío, fútbol y tenis.',                 now(), now()),
  (c08,'Roberto Giraldo', 'rober_dep_med',   'Medellín',    'Administrador de canchas en Envigado, Antioquia.',                    now(), now()),
  (c09,'Ernesto Cano',    'ernesto_cali2',   'Cali',        'Propietario de la Cancha Los Álamos, Norte de Cali.',                 now(), now()),
  (c10,'David Bedoya',    'david_rda',       'Pereira',     'Dueño del Complejo Deportivo Risaralda, 4 canchas multideporte.',     now(), now()),
  (c11,'Fabián Aguirre',  'fabian_maniz',    'Manizales',   'Administrador del Centro Deportivo Chipre, Manizales.',               now(), now())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name, username = EXCLUDED.username,
  city = EXCLUDED.city, bio = EXCLUDED.bio, updated_at = now();

INSERT INTO public.user_roles (user_id, is_player, is_promoter, is_cancha, created_at, updated_at)
VALUES
  (c01, false, false, true, now(), now()),
  (c02, false, false, true, now(), now()),
  (c03, false, false, true, now(), now()),
  (c04, false, false, true, now(), now()),
  (c05, false, false, true, now(), now()),
  (c06, false, false, true, now(), now()),
  (c07, false, false, true, now(), now()),
  (c08, false, false, true, now(), now()),
  (c09, false, false, true, now(), now()),
  (c10, false, false, true, now(), now()),
  (c11, false, false, true, now(), now())
ON CONFLICT (user_id) DO UPDATE SET is_cancha = true, updated_at = now();

END $$;
