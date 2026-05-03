-- =============================================================================
-- PRO. — Fix RLS policies for profiles table
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================
-- Problem: The profiles table has RLS enabled but is missing UPDATE (and
-- potentially INSERT) policies, causing "new row violates row-level security
-- policy" when users try to save their profile.
-- =============================================================================

-- Step 1: Make sure RLS is enabled (idempotent)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies so this script is safe to re-run
DROP POLICY IF EXISTS "profiles_select"         ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert"         ON public.profiles;
DROP POLICY IF EXISTS "profiles_update"         ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete"         ON public.profiles;
-- Also drop any policies using older naming conventions
DROP POLICY IF EXISTS "Users can view all profiles"    ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable"   ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all"     ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id"       ON public.profiles;

-- Step 3: SELECT — anyone (including anonymous visitors) can read profiles.
-- Needed for public profile pages and friend search.
CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
USING (true);

-- Step 4: INSERT — only the authenticated user can create their own profile row.
-- The trigger handle_new_user creates the row automatically on signup,
-- but this policy is needed as a safety net.
CREATE POLICY "profiles_insert"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Step 5: UPDATE — users can only edit their own profile row.
CREATE POLICY "profiles_update"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Step 6: DELETE — users can delete their own profile (GDPR-friendly).
-- Using restrictive check so they can only delete their own.
CREATE POLICY "profiles_delete"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);
