-- Migration 012: Fix coaches table RLS policy for self-insertion
--
-- Problem: Coaches cannot create their own coach record when setting up Stripe
-- Error: code 42501 (insufficient privilege)
--
-- Solution: Add RLS policy allowing users with 'coach' role to insert their own coach record
--
-- Author: Claude Code
-- Date: 2025-10-06

-- Enable RLS on coaches table (if not already enabled)
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Coaches can insert their own record" ON coaches;

-- Allow coaches to insert their own coach record
CREATE POLICY "Coaches can insert their own record"
  ON coaches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must have 'coach' role in their profile
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = coaches.profile_id
      AND profiles.role = 'coach'
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Also ensure coaches can read their own record
DROP POLICY IF EXISTS "Coaches can view their own record" ON coaches;

CREATE POLICY "Coaches can view their own record"
  ON coaches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = coaches.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Allow coaches to update their own record (for Stripe account updates)
DROP POLICY IF EXISTS "Coaches can update their own record" ON coaches;

CREATE POLICY "Coaches can update their own record"
  ON coaches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = coaches.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = coaches.profile_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Verify policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'coaches'
ORDER BY policyname;
