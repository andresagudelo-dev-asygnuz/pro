-- Performance indexes for cursor-based pagination
-- Generated: 2026-05-25

-- Feed / matches pagination (cursor on starts_at DESC)
-- Note: matches_starts_at_idx already exists (ASC). This adds a DESC-optimized index.
CREATE INDEX IF NOT EXISTS idx_matches_starts_at
  ON matches(starts_at DESC);

-- Conversations pagination (cursor on last_message_at DESC)
-- Note: conv_updated exists on updated_at DESC. last_message_at has no dedicated index.
CREATE INDEX IF NOT EXISTS idx_conversations_last_message
  ON conversations(last_message_at DESC);

-- Recurring bookings already has rb_cancha_status (created in Phase 4)
-- feed_posts table does not exist — feed uses matches table directly

-- DOWN:
-- DROP INDEX IF EXISTS idx_matches_starts_at;
-- DROP INDEX IF EXISTS idx_conversations_last_message;
