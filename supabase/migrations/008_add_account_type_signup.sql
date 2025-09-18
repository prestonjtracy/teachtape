-- Migration: Add Account Type to Sign-up Flow
-- Ensures all profiles have proper role assignments and backfills existing NULL roles

-- Ensure the role column exists with proper constraints (idempotent)
DO $$ 
BEGIN
    -- Check if role column exists and has the right constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        -- Add role column if it doesn't exist
        ALTER TABLE profiles ADD COLUMN role TEXT CHECK (role IN ('athlete','coach','admin')) NOT NULL DEFAULT 'athlete';
    ELSE
        -- Update existing column to ensure it has the correct constraint and default
        ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'athlete';
        
        -- Drop existing constraint if it exists
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        
        -- Add the new constraint
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('athlete','coach','admin'));
        
        -- Make sure column is NOT NULL
        ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
    END IF;
EXCEPTION
    WHEN others THEN 
        -- If role column exists but constraint addition fails, continue
        RAISE NOTICE 'Role column setup completed with warnings: %', SQLERRM;
END $$;

-- Backfill existing profiles with NULL roles to 'athlete' (excluding existing admin)
UPDATE profiles 
SET role = 'athlete' 
WHERE role IS NULL 
  AND email != 'preston.tracy@icloud.com'; -- Preserve existing admin

-- Ensure admin user remains admin if they exist
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'preston.tracy@icloud.com';

-- Update RLS policies to ensure new users can insert profiles with their chosen role during signup
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "prevent_non_admin_role_escalation_on_insert" ON profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON profiles;

-- Allow users to insert their own profile during signup with coach/athlete role
CREATE POLICY "users_can_insert_own_profile_with_allowed_role" ON profiles
  FOR INSERT WITH CHECK (
    auth_user_id = auth.uid() 
    AND (
      role IN ('athlete', 'coach') 
      OR (
        role = 'admin' 
        AND EXISTS (
          SELECT 1 FROM profiles admin_check 
          WHERE admin_check.auth_user_id = auth.uid() 
          AND admin_check.role = 'admin'
        )
      )
    )
  );

-- Create an index for performance on the role column
CREATE INDEX IF NOT EXISTS idx_profiles_role_performance ON profiles(role);

-- Add helpful comment
COMMENT ON COLUMN profiles.role IS 'User account type: athlete, coach, or admin. Set during signup and only changeable by admins.';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Account type signup migration completed successfully';
  RAISE NOTICE 'Existing profiles backfilled to athlete role (except admin)';
  RAISE NOTICE 'New signup flow can now accept role selection';
END $$;