-- Migration 010: Fix missing user profiles
--
-- This migration fixes existing users who don't have profiles (including Preston's account)
-- The auto-trigger for new users must be set up via Supabase Dashboard (see instructions below)
--
-- Author: Claude Code
-- Date: 2025-10-06

-- =====================================================
-- FIX: Create profiles for existing users without them
-- =====================================================

-- This will create profiles for any users in auth.users who don't have a profile yet
INSERT INTO public.profiles (auth_user_id, role, full_name)
SELECT
  u.id,
  'athlete' AS role,  -- Default to athlete, can be upgraded to coach
  COALESCE(u.raw_user_meta_data->>'full_name', NULL) AS full_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.auth_user_id = u.id
WHERE p.id IS NULL  -- Only create profiles for users who don't have one
ON CONFLICT DO NOTHING;  -- Safety check

-- =====================================================
-- VERIFY: Check that all users now have profiles
-- =====================================================

SELECT
  u.id as auth_user_id,
  u.email,
  p.id as profile_id,
  p.role,
  p.full_name,
  CASE
    WHEN p.id IS NULL THEN '❌ MISSING PROFILE'
    ELSE '✅ HAS PROFILE'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.auth_user_id = u.id
ORDER BY u.created_at DESC;
