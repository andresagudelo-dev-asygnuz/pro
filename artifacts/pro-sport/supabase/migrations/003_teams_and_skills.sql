-- ============================================================
-- 003: Teams feature + Player skills + Avatar storage policies
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Add player skill columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS skill_pace       SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS skill_shooting   SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS skill_passing    SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS skill_dribbling  SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS skill_defending  SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS skill_physical   SMALLINT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS position         TEXT CHECK (position IN ('arquero','defensa','mediocampista','delantero'));

-- 2. Teams table
CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url    TEXT,
  sport_type  TEXT NOT NULL DEFAULT 'futbol_5',
  city        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public   BOOLEAN NOT NULL DEFAULT true,
  max_members SMALLINT NOT NULL DEFAULT 20,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Team members
CREATE TABLE IF NOT EXISTS team_members (
  team_id   UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('owner','captain','player')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- 4. RLS for teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='teams_select') THEN
    CREATE POLICY teams_select ON teams FOR SELECT USING (
      is_public
      OR owner_id = auth.uid()
      OR EXISTS (SELECT 1 FROM team_members WHERE team_id = teams.id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='teams_insert') THEN
    CREATE POLICY teams_insert ON teams FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='teams_update') THEN
    CREATE POLICY teams_update ON teams FOR UPDATE TO authenticated USING (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='teams_delete') THEN
    CREATE POLICY teams_delete ON teams FOR DELETE TO authenticated USING (owner_id = auth.uid());
  END IF;
END $$;

-- 5. RLS for team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_members' AND policyname='tm_select') THEN
    CREATE POLICY tm_select ON team_members FOR SELECT USING (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM teams WHERE id = team_id AND (is_public OR owner_id = auth.uid()))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_members' AND policyname='tm_insert') THEN
    CREATE POLICY tm_insert ON team_members FOR INSERT TO authenticated WITH CHECK (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='team_members' AND policyname='tm_delete') THEN
    CREATE POLICY tm_delete ON team_members FOR DELETE TO authenticated USING (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
    );
  END IF;
END $$;

-- 6. Avatar bucket + storage policies
INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop first so re-running is idempotent
DROP POLICY IF EXISTS avatars_public_read  ON storage.objects;
DROP POLICY IF EXISTS avatars_auth_insert  ON storage.objects;
DROP POLICY IF EXISTS avatars_auth_update  ON storage.objects;

CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY avatars_auth_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY avatars_auth_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
