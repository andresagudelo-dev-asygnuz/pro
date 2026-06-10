-- Add is_admin flag to user_roles for platform admin access
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
