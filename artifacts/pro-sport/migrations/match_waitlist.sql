-- Migration: match_waitlist
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.match_waitlist (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id   uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  joined_at  timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT match_waitlist_unique UNIQUE(match_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_match_waitlist_match_joined
  ON public.match_waitlist(match_id, joined_at);

ALTER TABLE public.match_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Waitlist visible to all authenticated"
  ON public.match_waitlist FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can join waitlist"
  ON public.match_waitlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave waitlist"
  ON public.match_waitlist FOR DELETE
  USING (auth.uid() = user_id);
