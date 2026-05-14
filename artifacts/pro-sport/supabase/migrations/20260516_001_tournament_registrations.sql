-- Migration: tournament_registrations table
-- Depends on: 20260515_010_tournaments.sql
-- TypeScript types in: src/lib/tournaments/registrations.ts (RegistrationRow)

CREATE TABLE IF NOT EXISTS tournament_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id         uuid REFERENCES teams(id) ON DELETE SET NULL,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'confirmada'
                    CHECK (status IN ('confirmada', 'cancelada', 'lista_espera')),
  registered_by   uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- Either team_id or user_id must be present
  CONSTRAINT registration_has_subject CHECK (
    (team_id IS NOT NULL) OR (user_id IS NOT NULL)
  )
);

-- Prevent duplicate active team registrations
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_team_registration
  ON tournament_registrations (tournament_id, team_id)
  WHERE team_id IS NOT NULL AND status != 'cancelada';

-- Prevent duplicate active individual registrations
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_user_registration
  ON tournament_registrations (tournament_id, user_id)
  WHERE user_id IS NOT NULL AND status != 'cancelada';

CREATE TRIGGER tournament_registrations_updated_at
  BEFORE UPDATE ON tournament_registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Keep slots_filled in sync
CREATE OR REPLACE FUNCTION sync_tournament_slots()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmada' THEN
    UPDATE tournaments SET slots_filled = slots_filled + 1 WHERE id = NEW.tournament_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'confirmada' AND NEW.status = 'confirmada' THEN
      UPDATE tournaments SET slots_filled = slots_filled + 1 WHERE id = NEW.tournament_id;
    ELSIF OLD.status = 'confirmada' AND NEW.status != 'confirmada' THEN
      UPDATE tournaments SET slots_filled = GREATEST(0, slots_filled - 1) WHERE id = NEW.tournament_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmada' THEN
    UPDATE tournaments SET slots_filled = GREATEST(0, slots_filled - 1) WHERE id = OLD.tournament_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tournament_registrations_slots_sync
  AFTER INSERT OR UPDATE OR DELETE ON tournament_registrations
  FOR EACH ROW EXECUTE FUNCTION sync_tournament_slots();

-- RLS
ALTER TABLE tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view registrations for a tournament
CREATE POLICY "registrations_select_authenticated"
  ON tournament_registrations FOR SELECT TO authenticated USING (true);

-- Any authenticated user can register (tournament open check is app-level)
CREATE POLICY "registrations_insert_authenticated"
  ON tournament_registrations FOR INSERT TO authenticated
  WITH CHECK (registered_by = auth.uid());

-- The registrant or the tournament owner can update
CREATE POLICY "registrations_update_owner_or_organizer"
  ON tournament_registrations FOR UPDATE TO authenticated
  USING (
    registered_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.owner_id = auth.uid()
    )
  );

-- Only the tournament owner can delete registrations
CREATE POLICY "registrations_delete_organizer"
  ON tournament_registrations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.owner_id = auth.uid()
    )
  );

-- DOWN:
-- DROP TABLE IF EXISTS tournament_registrations CASCADE;
-- DROP FUNCTION IF EXISTS sync_tournament_slots CASCADE;
