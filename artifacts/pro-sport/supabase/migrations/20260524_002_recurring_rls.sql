-- Migration: RLS policies for recurring_bookings and recurring_exceptions
-- recurring_bookings RLS is already enabled in the live DB.
-- Existing policies: rb_owner_select, rb_owner_update, rb_user_insert, rb_user_select
-- This migration adds a unified owner ALL policy and full CRUD for the owner,
-- plus policies for recurring_exceptions.

-- ───────── recurring_bookings — owner full access ─────────
-- Drop old partial policies first for idempotence, then replace with a full ALL policy.
DROP POLICY IF EXISTS "rb_owner_all" ON recurring_bookings;
DROP POLICY IF EXISTS "recurring_owner_all" ON recurring_bookings;

CREATE POLICY "recurring_owner_all" ON recurring_bookings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM canchas c
      WHERE c.id = cancha_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canchas c
      WHERE c.id = cancha_id AND c.owner_id = auth.uid()
    )
  );

-- Keep existing user policies intact (rb_user_insert, rb_user_select already cover the booker).

-- ───────── recurring_exceptions — owner full access (via recurring → cancha) ─────────
DROP POLICY IF EXISTS "exceptions_owner_all" ON recurring_exceptions;

CREATE POLICY "exceptions_owner_all" ON recurring_exceptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM recurring_bookings rb
      JOIN canchas c ON c.id = rb.cancha_id
      WHERE rb.id = recurring_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM recurring_bookings rb
      JOIN canchas c ON c.id = rb.cancha_id
      WHERE rb.id = recurring_id AND c.owner_id = auth.uid()
    )
  );

-- ───────── recurring_exceptions — booker can view their own exceptions ─────────
DROP POLICY IF EXISTS "exceptions_user_select" ON recurring_exceptions;

CREATE POLICY "exceptions_user_select" ON recurring_exceptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM recurring_bookings rb
      WHERE rb.id = recurring_id AND rb.user_id = auth.uid()
    )
  );

-- DOWN:
-- DROP POLICY IF EXISTS "recurring_owner_all" ON recurring_bookings;
-- DROP POLICY IF EXISTS "exceptions_owner_all" ON recurring_exceptions;
-- DROP POLICY IF EXISTS "exceptions_user_select" ON recurring_exceptions;
