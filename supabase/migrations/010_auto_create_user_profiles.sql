-- Migration 010: Auto-create user profiles on signup
--
-- This migration:
-- 1. Creates a function to automatically create a profile when a user signs up
-- 2. Adds a trigger that runs this function on auth.users insert
-- 3. Fixes any existing users who don't have profiles (including Preston's account)
--
-- Author: Claude Code
-- Date: 2025-10-06

-- =====================================================
-- STEP 1: Create function to handle new user signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create a profile record for the new user
  -- Default role is 'athlete' (students/clients)
  -- Users can be upgraded to 'coach' or 'admin' later
  INSERT INTO public.profiles (auth_user_id, role, full_name)
  VALUES (
    NEW.id,
    'athlete',  -- Default role
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL)  -- Get name from signup metadata if provided
  );

  RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 2: Create trigger on auth.users
-- =====================================================

-- Drop trigger if it already exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 3: Fix existing users without profiles
-- =====================================================

-- This will create profiles for any users in auth.users who don't have a profile yet
-- This includes Preston's current account and any other orphaned accounts

INSERT INTO public.profiles (auth_user_id, role, full_name)
SELECT
  u.id,
  'athlete' AS role,  -- Default to athlete, can be changed manually
  COALESCE(u.raw_user_meta_data->>'full_name', NULL) AS full_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.auth_user_id = u.id
WHERE p.id IS NULL  -- Only create profiles for users who don't have one
ON CONFLICT (auth_user_id) DO NOTHING;  -- Skip if profile already exists (shouldn't happen, but safe)

-- =====================================================
-- STEP 4: Add helpful comment
-- =====================================================

COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a profile record when a new user signs up via Supabase Auth. Default role is athlete.';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'Ensures every new auth.users record gets a corresponding profiles record';

-- =====================================================
-- Verification Query (for manual testing)
-- =====================================================
-- Run this to verify all users have profiles:
-- SELECT
--   u.id as auth_user_id,
--   u.email,
--   p.id as profile_id,
--   p.role,
--   p.full_name
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON p.auth_user_id = u.id
-- ORDER BY u.created_at DESC;
