-- =============================================================================
-- Fix conv_select y conv_update para permitir a los participantes de un partido
-- leer y actualizar el registro en la tabla conversations.
-- =============================================================================

DROP POLICY IF EXISTS conv_select ON conversations;
DROP POLICY IF EXISTS conv_update ON conversations;

CREATE POLICY conv_select ON conversations FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT match_id FROM match_participants WHERE user_id = auth.uid()
      UNION
      SELECT id        FROM matches             WHERE organizer_id = auth.uid()
    )
    OR
    id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY conv_update ON conversations FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT match_id FROM match_participants WHERE user_id = auth.uid()
      UNION
      SELECT id        FROM matches             WHERE organizer_id = auth.uid()
    )
    OR
    id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );
