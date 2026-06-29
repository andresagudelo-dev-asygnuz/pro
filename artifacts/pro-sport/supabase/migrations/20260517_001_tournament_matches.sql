-- Migration: tournament_matches, match_events, standings tables
-- Depends on: 20260515_011_tournament_registrations.sql
-- TypeScript types in: src/lib/tournaments/matches.ts (MatchRow, MatchEventRow, StandingRow)

-- ── tournament_matches ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournament_matches (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id               uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  home_registration_id        uuid REFERENCES tournament_registrations(id) ON DELETE SET NULL,
  away_registration_id        uuid REFERENCES tournament_registrations(id) ON DELETE SET NULL,
  round                       integer NOT NULL,
  group_code                  text,
  fixture_order               integer,
  scheduled_at                timestamptz,
  venue                       text,
  home_score                  integer,
  away_score                  integer,
  status                      text NOT NULL DEFAULT 'programado'
                                CHECK (status IN ('programado', 'en_juego', 'finalizado', 'w_o', 'cancelado')),
  correction_window_ends_at   timestamptz,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER tournament_matches_updated_at
  BEFORE UPDATE ON tournament_matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tm_select_authenticated"
  ON tournament_matches FOR SELECT TO authenticated USING (true);

-- Only the tournament owner can insert/update matches
CREATE POLICY "tm_insert_organizer"
  ON tournament_matches FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "tm_update_organizer"
  ON tournament_matches FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      WHERE t.id = tournament_id AND t.owner_id = auth.uid()
    )
  );

-- ── match_events ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
  event_type  text NOT NULL
                CHECK (event_type IN ('gol', 'auto_gol', 'amarilla', 'roja', 'sustitucion')),
  minute      integer,
  player_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  team_side   text CHECK (team_side IN ('home', 'away')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "me_select_authenticated"
  ON match_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "me_insert_organizer"
  ON match_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament_matches tm
      JOIN tournaments t ON t.id = tm.tournament_id
      WHERE tm.id = match_id AND t.owner_id = auth.uid()
    )
  );

-- ── standings ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS standings (
  tournament_id      uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  registration_id    uuid NOT NULL REFERENCES tournament_registrations(id) ON DELETE CASCADE,
  played             integer NOT NULL DEFAULT 0,
  wins               integer NOT NULL DEFAULT 0,
  draws              integer NOT NULL DEFAULT 0,
  losses             integer NOT NULL DEFAULT 0,
  goals_for          integer NOT NULL DEFAULT 0,
  goals_against      integer NOT NULL DEFAULT 0,
  goal_difference    integer GENERATED ALWAYS AS (goals_for - goals_against) STORED,
  points             integer GENERATED ALWAYS AS (wins * 3 + draws) STORED,
  PRIMARY KEY (tournament_id, registration_id)
);

ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "standings_select_authenticated"
  ON standings FOR SELECT TO authenticated USING (true);

-- Only the tournament owner can upsert standings
CREATE POLICY "standings_upsert_organizer"
  ON standings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.owner_id = auth.uid()
    )
  );

CREATE POLICY "standings_update_organizer"
  ON standings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tournaments t WHERE t.id = tournament_id AND t.owner_id = auth.uid()
    )
  );

-- DOWN:
-- DROP TABLE IF EXISTS standings CASCADE;
-- DROP TABLE IF EXISTS match_events CASCADE;
-- DROP TABLE IF EXISTS tournament_matches CASCADE;
