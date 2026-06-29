-- Migration: profile_conditional table
-- Depends on: 20260518_001_profile_morpho.sql (touch_updated_at function)
-- TypeScript types in: src/lib/types/db.ts (ProfileConditional)

CREATE TABLE IF NOT EXISTS profile_conditional (
  user_id           uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  strength_tags     text[] NOT NULL DEFAULT '{}',
  strength_notes    text CHECK (strength_notes IS NULL OR char_length(strength_notes) <= 500),
  speed_tags        text[] NOT NULL DEFAULT '{}',
  speed_notes       text CHECK (speed_notes IS NULL OR char_length(speed_notes) <= 500),
  endurance_tags    text[] NOT NULL DEFAULT '{}',
  endurance_notes   text CHECK (endurance_notes IS NULL OR char_length(endurance_notes) <= 500),
  flexibility_tags  text[] NOT NULL DEFAULT '{}',
  flexibility_notes text CHECK (flexibility_notes IS NULL OR char_length(flexibility_notes) <= 500),
  visibility        text NOT NULL DEFAULT 'promotores'
                      CHECK (visibility IN ('publico','promotores','privado')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profile_conditional ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profile_conditional_touch
  BEFORE UPDATE ON profile_conditional
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- DOWN:
-- DROP TABLE IF EXISTS profile_conditional CASCADE;
