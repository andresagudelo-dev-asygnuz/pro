-- =============================================================================
-- Chat RLS — versión corregida sin auto-referencias circulares
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =============================================================================

ALTER TABLE conversations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                 ENABLE ROW LEVEL SECURITY;

-- ── conversation_participants ─────────────────────────────────────────────────
-- Borramos TODAS las versiones anteriores (incluyendo las circulares)
DROP POLICY IF EXISTS cp_select        ON conversation_participants;
DROP POLICY IF EXISTS cp_select_shared ON conversation_participants;
DROP POLICY IF EXISTS cp_insert        ON conversation_participants;
DROP POLICY IF EXISTS cp_update        ON conversation_participants;
DROP POLICY IF EXISTS cp_delete        ON conversation_participants;

-- SELECT abierto para authenticated: la tabla solo tiene UUIDs, el contenido
-- sensible está protegido en conversations y messages.
CREATE POLICY cp_select ON conversation_participants FOR SELECT TO authenticated
  USING (true);

CREATE POLICY cp_insert ON conversation_participants FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY cp_update ON conversation_participants FOR UPDATE TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY cp_delete ON conversation_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── conversations ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS conv_select ON conversations;
DROP POLICY IF EXISTS conv_insert ON conversations;
DROP POLICY IF EXISTS conv_update ON conversations;

-- Ahora que cp_select es USING(true), este subquery no tiene recursión.
CREATE POLICY conv_select ON conversations FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY conv_insert ON conversations FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY conv_update ON conversations FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- ── messages ──────────────────────────────────────────────────────────────────
-- Borramos políticas viejas basadas en match_id (sistema anterior)
DROP POLICY IF EXISTS msg_select      ON messages;
DROP POLICY IF EXISTS msg_insert      ON messages;
DROP POLICY IF EXISTS messages_select ON messages;
DROP POLICY IF EXISTS messages_insert ON messages;

CREATE POLICY messages_select ON messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY messages_insert ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- ── RPCs (idempotentes) ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_or_create_friend_conversation(other_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conv_id UUID; me UUID := auth.uid(); BEGIN
  SELECT cp1.conversation_id INTO conv_id
  FROM   conversation_participants cp1
  JOIN   conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  JOIN   conversations c ON c.id = cp1.conversation_id
  WHERE  cp1.user_id = me AND cp2.user_id = other_user_id AND c.type = 'friend' LIMIT 1;
  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;
  conv_id := gen_random_uuid();
  INSERT INTO conversations (id, type, reference_id, title, subtitle, metadata)
    VALUES (conv_id, 'friend', NULL, 'Chat', NULL, '{}');
  INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (conv_id, me), (conv_id, other_user_id);
  RETURN conv_id;
END; $$;
REVOKE ALL   ON FUNCTION get_or_create_friend_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_friend_conversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION leave_conversation(conv_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM conversation_participants
  WHERE conversation_id = conv_id AND user_id = auth.uid();
END; $$;
REVOKE ALL   ON FUNCTION leave_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION leave_conversation(UUID) TO authenticated;

-- Verificación final
SELECT tablename, policyname, cmd, qual
FROM   pg_policies
WHERE  tablename IN ('conversations','conversation_participants','messages')
ORDER  BY tablename, cmd;
