-- Migration: tournaments table
-- Applies before: Phase 2 tournament UI tasks
-- TypeScript types in: src/lib/tournaments/api.ts (TournamentRow)

CREATE TABLE IF NOT EXISTS tournaments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  format        text NOT NULL CHECK (format IN ('liga', 'eliminatoria', 'fase_grupos_eliminatoria')),
  slots         integer NOT NULL DEFAULT 8,
  slots_filled  integer NOT NULL DEFAULT 0,
  location      text,
  city          text,
  start_date    date,
  end_date      date,
  status        text NOT NULL DEFAULT 'borrador'
                  CHECK (status IN ('borrador', 'abierto_inscripciones', 'cerrado_inscripciones', 'cancelado', 'finalizado')),
  description   text,
  categories    jsonb NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_select_authenticated"
  ON tournaments FOR SELECT TO authenticated USING (true);

CREATE POLICY "tournaments_insert_owner"
  ON tournaments FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "tournaments_update_owner"
  ON tournaments FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "tournaments_delete_owner"
  ON tournaments FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- DOWN:
-- DROP TABLE IF EXISTS tournaments CASCADE;
-- DROP FUNCTION IF EXISTS set_updated_at CASCADE;
