-- Fix notifications table schema to match frontend expectations
ALTER TABLE public.notifications 
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS message,
  DROP COLUMN IF EXISTS link,
  DROP COLUMN IF EXISTS is_read;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS read_at timestamp with time zone;
