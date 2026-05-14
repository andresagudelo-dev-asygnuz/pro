-- Migration: Create recurring_exceptions table
-- Stores per-occurrence overrides (cancellations or modifications) for recurring bookings

CREATE TABLE IF NOT EXISTS recurring_exceptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id   uuid NOT NULL REFERENCES recurring_bookings(id) ON DELETE CASCADE,
  original_date  date NOT NULL,
  action         text NOT NULL CHECK (action IN ('cancelled', 'modified')),
  new_start      time,
  new_end        time,
  new_price      numeric(12,2),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recurring_id, original_date)
);

CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_recurring_id
  ON recurring_exceptions(recurring_id, original_date);

ALTER TABLE recurring_exceptions ENABLE ROW LEVEL SECURITY;

-- DOWN:
-- DROP TABLE IF EXISTS recurring_exceptions;
