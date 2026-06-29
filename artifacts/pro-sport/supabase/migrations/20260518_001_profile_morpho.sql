-- Migration: profile_morpho table
-- Applies before: Phase 3 player profile tasks
-- TypeScript types in: src/lib/types/db.ts (ProfileMorpho)

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE IF NOT EXISTS profile_morpho (
  user_id     uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  height_m    numeric(4,2) CHECK (height_m IS NULL OR (height_m BETWEEN 1.00 AND 2.50)),
  weight_kg   numeric(5,2) CHECK (weight_kg IS NULL OR (weight_kg BETWEEN 30.00 AND 200.00)),
  wingspan_m  numeric(4,2) CHECK (wingspan_m IS NULL OR (wingspan_m BETWEEN 1.00 AND 2.80)),
  laterality  text CHECK (laterality IN ('diestro','zurdo','ambos')),
  somatotype  text CHECK (somatotype IN ('ectomorfo','mesomorfo','endomorfo','mixto')),
  visibility  text NOT NULL DEFAULT 'promotores'
                CHECK (visibility IN ('publico','promotores','privado')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profile_morpho ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profile_morpho_touch
  BEFORE UPDATE ON profile_morpho
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- DOWN:
-- DROP TABLE IF EXISTS profile_morpho CASCADE;
