-- Migration: profile_technical_football table
-- Depends on: 20260518_001_profile_morpho.sql (touch_updated_at function)
-- TypeScript types in: src/lib/types/db.ts (ProfileTechnicalFootball)

CREATE TABLE IF NOT EXISTS profile_technical_football (
  user_id              uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  position             text CHECK (position IN ('arquero','defensa','mediocampista','delantero')),
  dominant_foot        text CHECK (dominant_foot IN ('derecho','izquierdo','ambos')),
  performance_notes    text CHECK (performance_notes IS NULL OR char_length(performance_notes) <= 500),
  tactical_role_notes  text CHECK (tactical_role_notes IS NULL OR char_length(tactical_role_notes) <= 500),
  visibility           text NOT NULL DEFAULT 'publico'
                         CHECK (visibility IN ('publico','promotores','privado')),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profile_technical_football ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profile_technical_football_touch
  BEFORE UPDATE ON profile_technical_football
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- DOWN:
-- DROP TABLE IF EXISTS profile_technical_football CASCADE;
