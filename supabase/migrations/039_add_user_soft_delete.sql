-- Migration 039: Add soft delete support for user profiles
--
-- This migration adds:
-- 1. Status field with enum type for user account states
-- 2. deleted_at timestamp for tracking deletion time
-- 3. Indexes for efficient status filtering
-- 4. Updated RLS policies to exclude non-active users from public queries
-- 5. Function to check if user is active (for auth middleware)

-- =====================================================
-- STEP 1: Create status enum type
-- =====================================================

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'disabled', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- STEP 2: Add columns to profiles table
-- =====================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status public.user_status DEFAULT 'active' NOT NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =====================================================
-- STEP 3: Add indexes for efficient querying
-- =====================================================

CREATE INDEX IF NOT EXISTS profiles_status_idx
ON public.profiles(status);

CREATE INDEX IF NOT EXISTS profiles_status_active_idx
ON public.profiles(id)
WHERE status = 'active';

-- =====================================================
-- STEP 4: Update RLS policies for public coach profiles
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "public_coach_profiles_readable" ON public.profiles;

-- Recreate with status check - only show active coaches publicly
CREATE POLICY "public_coach_profiles_readable"
ON public.profiles
FOR SELECT
USING (role = 'coach' AND status = 'active');

-- Add policy for users to read their own profile regardless of status
DROP POLICY IF EXISTS "users_read_own_profile" ON public.profiles;
CREATE POLICY "users_read_own_profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = auth_user_id);

-- Add policy for admins to read all profiles
DROP POLICY IF EXISTS "admins_read_all_profiles" ON public.profiles;
CREATE POLICY "admins_read_all_profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
    AND p.role = 'admin'
  )
);

-- =====================================================
-- STEP 5: Create function to check user status
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_status(user_id UUID)
RETURNS public.user_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_status public.user_status;
BEGIN
  SELECT status INTO user_status
  FROM public.profiles
  WHERE auth_user_id = user_id;

  RETURN COALESCE(user_status, 'active');
END;
$$;

-- =====================================================
-- STEP 6: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN public.profiles.status IS 'User account status: active (normal), disabled (admin suspended), deleted (user or admin deleted)';
COMMENT ON COLUMN public.profiles.deleted_at IS 'Timestamp when user was soft deleted - null for active/disabled users';
COMMENT ON FUNCTION public.get_user_status IS 'Returns the status of a user by their auth_user_id - used for auth middleware checks';
