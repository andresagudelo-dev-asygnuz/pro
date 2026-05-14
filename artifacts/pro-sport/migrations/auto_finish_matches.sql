-- =============================================================================
-- PRO. — Auto Finish Past Matches
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_finish_past_matches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Actualiza los partidos que ya pasaron su hora de inicio + duración
  -- a estado 'completed' si estaban en estado 'open', 'full', o 'in_progress'
  UPDATE public.matches
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE status IN ('open', 'full', 'in_progress')
    AND starts_at + (duration_minutes || ' minutes')::interval < NOW();
END;
$$;
