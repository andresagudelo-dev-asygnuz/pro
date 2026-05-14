-- Migration: ensure profiles.full_name and teams.name are readable by all authenticated users
-- Required before: tournament UI that joins registrations → teams/profiles for display
-- Applies before: Phase 2 task [DB] 2.0

-- profiles: any authenticated user can read (columnar access enforced by explicit select() in queries)
DROP POLICY IF EXISTS "profiles_select_public_names" ON profiles;
CREATE POLICY "profiles_select_public_names"
  ON profiles FOR SELECT TO authenticated USING (true);

-- teams: any authenticated user can read
DROP POLICY IF EXISTS "teams_select_public_names" ON teams;
CREATE POLICY "teams_select_public_names"
  ON teams FOR SELECT TO authenticated USING (true);

-- DOWN:
-- DROP POLICY IF EXISTS "profiles_select_public_names" ON profiles;
-- DROP POLICY IF EXISTS "teams_select_public_names" ON teams;
