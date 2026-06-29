-- Migration: RLS policies for profile block tables
-- NOTE: is_promoter lives in user_roles, NOT profiles — all promoter checks join user_roles
-- Depends on: 20260518, 20260519, 20260520 profile table migrations

-- ───────── profile_morpho ─────────
CREATE POLICY "morpho_select" ON profile_morpho
  FOR SELECT USING (
    visibility = 'publico'
    OR auth.uid() = user_id
    OR (visibility = 'promotores' AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_promoter = true
    ))
  );

CREATE POLICY "morpho_insert" ON profile_morpho
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "morpho_update" ON profile_morpho
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "morpho_delete" ON profile_morpho
  FOR DELETE USING (auth.uid() = user_id);

-- ───────── profile_conditional ─────────
CREATE POLICY "conditional_select" ON profile_conditional
  FOR SELECT USING (
    visibility = 'publico'
    OR auth.uid() = user_id
    OR (visibility = 'promotores' AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_promoter = true
    ))
  );

CREATE POLICY "conditional_insert" ON profile_conditional
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conditional_update" ON profile_conditional
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conditional_delete" ON profile_conditional
  FOR DELETE USING (auth.uid() = user_id);

-- ───────── profile_technical_football ─────────
CREATE POLICY "technical_select" ON profile_technical_football
  FOR SELECT USING (
    visibility = 'publico'
    OR auth.uid() = user_id
    OR (visibility = 'promotores' AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.is_promoter = true
    ))
  );

CREATE POLICY "technical_insert" ON profile_technical_football
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "technical_update" ON profile_technical_football
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "technical_delete" ON profile_technical_football
  FOR DELETE USING (auth.uid() = user_id);

-- DOWN:
-- DROP POLICY IF EXISTS "morpho_select" ON profile_morpho;
-- DROP POLICY IF EXISTS "morpho_insert" ON profile_morpho;
-- DROP POLICY IF EXISTS "morpho_update" ON profile_morpho;
-- DROP POLICY IF EXISTS "morpho_delete" ON profile_morpho;
-- DROP POLICY IF EXISTS "conditional_select" ON profile_conditional;
-- DROP POLICY IF EXISTS "conditional_insert" ON profile_conditional;
-- DROP POLICY IF EXISTS "conditional_update" ON profile_conditional;
-- DROP POLICY IF EXISTS "conditional_delete" ON profile_conditional;
-- DROP POLICY IF EXISTS "technical_select" ON profile_technical_football;
-- DROP POLICY IF EXISTS "technical_insert" ON profile_technical_football;
-- DROP POLICY IF EXISTS "technical_update" ON profile_technical_football;
-- DROP POLICY IF EXISTS "technical_delete" ON profile_technical_football;
