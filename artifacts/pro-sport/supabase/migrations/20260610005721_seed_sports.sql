INSERT INTO "public"."sports" ("id", "name", "icon") VALUES
('futbol5', 'Fútbol 5', '⚽'),
('futbol7', 'Fútbol 7', '⚽'),
('futbol11', 'Fútbol 11', '⚽'),
('tenis', 'Tenis', '🎾'),
('padel', 'Pádel', '🎾'),
('basquet', 'Básquetbol', '🏀'),
('voleibol', 'Voleibol', '🏐')
ON CONFLICT ("id") DO NOTHING;
