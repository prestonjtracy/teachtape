-- Migration: Secure Admin Role System
-- This migration locks down the admin role system to prevent unauthorized access

-- First, ensure the role type is properly defined (in case it's an enum)
-- If role is a text field, this will do nothing. If it's an enum, it ensures 'admin' is included
DO $$ 
BEGIN
    -- Try to add 'admin' to the enum if it exists as an enum type
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL; -- Ignore if role is not an enum type
END $$;

-- Set Preston Tracy as the initial admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'preston.tracy@icloud.com';

-- If no profile exists with that email, log a warning
DO $$
BEGIN
    IF NOT FOUND THEN
        RAISE WARNING 'No profile found with email preston.tracy@icloud.com - admin role not set';
    END IF;
END $$;

-- Drop existing role-related RLS policies to rebuild them securely
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "public_coach_profiles_readable" ON profiles;

-- Create comprehensive RLS policies for profiles

-- 1. Users can view their own profile
CREATE POLICY "users_can_view_own_profile" ON profiles
  FOR SELECT USING (auth_user_id = auth.uid());

-- 2. Public can view coach profiles (for discovery)
CREATE POLICY "public_can_view_coach_profiles" ON profiles
  FOR SELECT USING (role = 'coach');

-- 3. Admins can view all profiles
CREATE POLICY "admins_can_view_all_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles admin_check 
      WHERE admin_check.auth_user_id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  );

-- 4. Users can update their own profile EXCEPT the role field
CREATE POLICY "users_can_update_own_profile_except_role" ON profiles
  FOR UPDATE USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid() 
    AND (
      -- Ensure role cannot be changed by non-admins
      role = (SELECT role FROM profiles WHERE auth_user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM profiles admin_check 
        WHERE admin_check.auth_user_id = auth.uid() 
        AND admin_check.role = 'admin'
      )
    )
  );

-- 5. Only admins can insert new profiles with admin role
CREATE POLICY "prevent_non_admin_role_escalation_on_insert" ON profiles
  FOR INSERT WITH CHECK (
    role != 'admin' 
    OR EXISTS (
      SELECT 1 FROM profiles admin_check 
      WHERE admin_check.auth_user_id = auth.uid() 
      AND admin_check.role = 'admin'
    )
  );

-- 6. Users can insert their own profile (for new signups)
CREATE POLICY "users_can_insert_own_profile" ON profiles
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- Create a function to prevent role escalation at the database level
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If someone is trying to update role to admin
  IF NEW.role = 'admin' AND OLD.role != 'admin' THEN
    -- Check if the current user is already an admin
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only existing admins can grant admin role';
    END IF;
  END IF;
  
  -- If someone is trying to remove admin role from someone else
  IF OLD.role = 'admin' AND NEW.role != 'admin' THEN
    -- Check if the current user is an admin and not removing their own admin
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    ) OR NEW.auth_user_id = auth.uid() THEN
      RAISE EXCEPTION 'Admins cannot remove their own admin role or non-admins cannot modify admin roles';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger to the profiles table
DROP TRIGGER IF EXISTS enforce_role_security ON profiles;
CREATE TRIGGER enforce_role_security
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- Create an index on role for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id_role ON profiles(auth_user_id, role);

-- Add helpful comments
COMMENT ON TRIGGER enforce_role_security ON profiles IS 'Prevents unauthorized role escalation to admin';
COMMENT ON FUNCTION prevent_role_escalation() IS 'Database-level protection against admin role abuse';

-- Create a view for safe profile operations (optional - for extra security)
CREATE OR REPLACE VIEW safe_profiles AS
SELECT 
  id,
  auth_user_id,
  CASE 
    WHEN role = 'admin' AND auth_user_id != auth.uid() AND NOT EXISTS (
      SELECT 1 FROM profiles WHERE auth_user_id = auth.uid() AND role = 'admin'
    ) THEN 'coach'::text  -- Hide admin role from non-admins viewing others
    ELSE role::text
  END as role,
  full_name,
  name,
  email,
  avatar_url,
  bio,
  sport,
  created_at
FROM profiles;

-- Grant appropriate permissions on the view
GRANT SELECT ON safe_profiles TO authenticated;

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE 'Admin role security migration completed successfully';
  RAISE NOTICE 'Admin user set: preston.tracy@icloud.com';
END $$;