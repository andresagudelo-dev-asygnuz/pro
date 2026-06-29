-- =============================================================================
-- RPC: leave_conversation
-- Permite a un usuario salir de una conversación (elimina su participación).
-- SECURITY DEFINER bypasea RLS pero valida auth.uid() en el WHERE.
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- =============================================================================

CREATE OR REPLACE FUNCTION leave_conversation(conv_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM conversation_participants
  WHERE conversation_id = conv_id
    AND user_id = auth.uid();
END;
$$;

-- Sólo usuarios autenticados pueden llamar esta función
REVOKE ALL ON FUNCTION leave_conversation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION leave_conversation(UUID) TO authenticated;
