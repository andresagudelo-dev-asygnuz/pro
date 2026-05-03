-- =============================================================================
-- PRO. — Fix RLS policies for profiles table (v2)
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- Step 1: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies dynamically (handles any naming)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
  END LOOP;
END $$;

-- Step 3: Public SELECT — everyone can read profiles (friend search, public profiles)
CREATE POLICY "profiles_select_all"
ON public.profiles
FOR SELECT
USING (true);

-- Step 4: Authenticated users can INSERT / UPDATE / DELETE their own row.
-- Using FOR ALL covers upsert (INSERT + UPDATE) correctly in one policy.
CREATE POLICY "profiles_modify_own"
ON public.profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
