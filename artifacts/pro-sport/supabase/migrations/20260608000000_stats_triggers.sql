-- =============================================================================
-- Stats triggers: matches_played, rating_avg, auto-attended on match complete
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================================================

-- ── 1. Re-aplicar trigger de ratings (idempotente) ───────────────────────────
-- Garantiza que rating_avg y rating_count se actualicen al insertar/editar ratings
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET
    rating_avg   = (SELECT COALESCE(AVG(rating)::numeric(4,2), 0)
                    FROM match_ratings WHERE rated_id = NEW.rated_id),
    rating_count = (SELECT COUNT(*)
                    FROM match_ratings WHERE rated_id = NEW.rated_id),
    updated_at   = NOW()
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_profile_rating ON match_ratings;
CREATE TRIGGER trg_update_profile_rating
  AFTER INSERT OR UPDATE ON match_ratings
  FOR EACH ROW EXECUTE FUNCTION update_profile_rating();

-- ── 2. Auto-marcar participantes como "attended" al completar partido ────────
-- Cuando matches.status cambia a 'completed', todos los que tenían 'joined'
-- pasan automáticamente a 'attended'.
CREATE OR REPLACE FUNCTION auto_attend_on_match_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE match_participants
    SET    status     = 'attended',
           updated_at = NOW()
    WHERE  match_id = NEW.id
      AND  status   = 'joined';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_attend_on_complete ON matches;
CREATE TRIGGER trg_auto_attend_on_complete
  AFTER UPDATE OF status ON matches
  FOR EACH ROW EXECUTE FUNCTION auto_attend_on_match_complete();

-- ── 3. Incrementar matches_played al pasar a "attended" ─────────────────────
-- Cada vez que un participante pasa de cualquier estado a 'attended',
-- se incrementa profiles.matches_played en 1.
CREATE OR REPLACE FUNCTION increment_matches_played()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'attended' AND (OLD.status IS DISTINCT FROM 'attended') THEN
    UPDATE profiles
    SET    matches_played = COALESCE(matches_played, 0) + 1,
           updated_at     = NOW()
    WHERE  id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_matches_played ON match_participants;
CREATE TRIGGER trg_increment_matches_played
  AFTER UPDATE OF status ON match_participants
  FOR EACH ROW EXECUTE FUNCTION increment_matches_played();

-- ── Verificación ──────────────────────────────────────────────────────────────
SELECT tgname, tgrelid::regclass AS tabla, tgenabled
FROM   pg_trigger
WHERE  tgname IN (
  'trg_update_profile_rating',
  'trg_auto_attend_on_complete',
  'trg_increment_matches_played'
)
ORDER BY tgname;
