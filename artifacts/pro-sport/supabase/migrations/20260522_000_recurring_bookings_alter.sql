-- Migration: Adjust recurring_bookings to match spec design
-- Changes:
--   1. Make end_date nullable (nullable = indefinite / no end date)
--   2. Add frequency column (weekly | biweekly | monthly)
--   3. Add set_updated_at trigger (columns notes, confirmed_at, updated_at already exist)
--   4. Add composite index for cancha_id + status + day_of_week
-- Note: notes, confirmed_at, updated_at already exist in the live schema — skipped.

-- 1. Make end_date nullable
ALTER TABLE recurring_bookings ALTER COLUMN end_date DROP NOT NULL;

-- 2. Add frequency column
ALTER TABLE recurring_bookings
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'weekly'
    CHECK (frequency IN ('weekly', 'biweekly', 'monthly'));

-- 3. updated_at trigger (set_updated_at function already exists in the DB)
CREATE OR REPLACE TRIGGER set_recurring_bookings_updated_at
  BEFORE UPDATE ON recurring_bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 4. Composite index for common owner queries
CREATE INDEX IF NOT EXISTS idx_recurring_cancha_status
  ON recurring_bookings(cancha_id, status, day_of_week);

-- DOWN:
-- DROP TRIGGER IF EXISTS set_recurring_bookings_updated_at ON recurring_bookings;
-- DROP INDEX IF EXISTS idx_recurring_cancha_status;
-- ALTER TABLE recurring_bookings DROP COLUMN IF EXISTS frequency;
-- ALTER TABLE recurring_bookings ALTER COLUMN end_date SET NOT NULL;
