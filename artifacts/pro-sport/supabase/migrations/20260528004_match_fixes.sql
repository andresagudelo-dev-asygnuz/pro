-- =============================================================================
-- Fix 1: confirmed_at en match_participants (si no existe)
-- Fix 2: messages_select que soporte chat de partidos Y chat de conversaciones
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =============================================================================

-- ── confirmed_at en match_participants ────────────────────────────────────────
ALTER TABLE match_participants
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ DEFAULT NULL;

-- ── messages: política SELECT corregida ──────────────────────────────────────
-- La anterior solo cubría conversation_participants; los mensajes de partidos
-- usan conversation_id = match_id (sin pasar por conversation_participants).
DROP POLICY IF EXISTS messages_select ON messages;
DROP POLICY IF EXISTS msg_select      ON messages;

CREATE POLICY messages_select ON messages FOR SELECT TO authenticated
  USING (
    -- Chat de partido: participante o organizador
    conversation_id IN (
      SELECT match_id FROM match_participants WHERE user_id = auth.uid()
      UNION
      SELECT id        FROM matches             WHERE organizer_id = auth.uid()
    )
    OR
    -- Chat de conversación (amigos, reservas, torneos)
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    )
  );

-- ── messages: política INSERT corregida ──────────────────────────────────────
DROP POLICY IF EXISTS messages_insert ON messages;
DROP POLICY IF EXISTS msg_insert      ON messages;

CREATE POLICY messages_insert ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      -- Chat de partido
      conversation_id IN (
        SELECT match_id FROM match_participants WHERE user_id = auth.uid()
        UNION
        SELECT id        FROM matches             WHERE organizer_id = auth.uid()
      )
      OR
      -- Chat de conversación
      conversation_id IN (
        SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
      )
    )
  );

-- Verificación
SELECT tablename, policyname, cmd
FROM   pg_policies
WHERE  tablename IN ('messages','match_participants')
ORDER  BY tablename, cmd;
