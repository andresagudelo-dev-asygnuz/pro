-- =============================================================================
-- Chat RLS policies — conversations, conversation_participants, messages
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- Es idempotente: puede correrse múltiples veces.
-- =============================================================================

-- ── conversations ─────────────────────────────────────────────────────────────
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conv_select     ON conversations;
DROP POLICY IF EXISTS conv_insert     ON conversations;
DROP POLICY IF EXISTS conv_update     ON conversations;

-- Solo participantes pueden leer la conversación
CREATE POLICY conv_select ON conversations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
        AND user_id = auth.uid()
    )
  );

-- Cualquier usuario autenticado puede crear conversaciones
CREATE POLICY conv_insert ON conversations FOR INSERT TO authenticated
  WITH CHECK (true);

-- Solo participantes pueden actualizar (e.g. last_message_at)
CREATE POLICY conv_update ON conversations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
        AND user_id = auth.uid()
    )
  );

-- ── conversation_participants ─────────────────────────────────────────────────
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cp_select       ON conversation_participants;
DROP POLICY IF EXISTS cp_insert       ON conversation_participants;
DROP POLICY IF EXISTS cp_delete       ON conversation_participants;

-- Participantes ven a los demás miembros de sus conversaciones
CREATE POLICY cp_select ON conversation_participants FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id
        AND cp2.user_id = auth.uid()
    )
  );

-- Cualquier usuario autenticado puede ser añadido (lo hace el creador vía la app)
CREATE POLICY cp_insert ON conversation_participants FOR INSERT TO authenticated
  WITH CHECK (true);

-- Cada usuario puede salir de sus propias conversaciones (eliminar su participación)
CREATE POLICY cp_delete ON conversation_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- UPDATE (last_read_at): solo el propio participante
DROP POLICY IF EXISTS cp_update ON conversation_participants;
CREATE POLICY cp_update ON conversation_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── messages ──────────────────────────────────────────────────────────────────
-- Reemplaza las viejas políticas basadas en match_id (ya no aplican al chat nuevo)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_select  ON messages;
DROP POLICY IF EXISTS messages_insert  ON messages;
DROP POLICY IF EXISTS msg_select       ON messages;
DROP POLICY IF EXISTS msg_insert       ON messages;

-- Solo participantes de la conversación pueden leer mensajes
CREATE POLICY messages_select ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- Solo participantes pueden enviar mensajes
CREATE POLICY messages_insert ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
  );

-- Verificación rápida
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename, cmd;
