-- Optional: Upgrade Preston's account to coach role
--
-- Run this AFTER migration 010 to change your role from 'athlete' to 'coach'
-- This allows you to create listings and receive bookings
--
-- Author: Claude Code
-- Date: 2025-10-06

-- Update Preston's profile to be a coach
UPDATE public.profiles
SET role = 'coach'
WHERE auth_user_id IN (
  SELECT id FROM auth.users WHERE email = 'prestonjtracy@gmail.com'
);

-- Verify the update
SELECT
  u.email,
  p.role,
  p.full_name,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON p.auth_user_id = u.id
WHERE u.email = 'prestonjtracy@gmail.com';
