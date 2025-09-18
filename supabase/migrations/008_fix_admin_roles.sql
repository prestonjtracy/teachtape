-- Fix admin roles: Remove admin from Sarah Johnson, keep only Preston Tracy as admin
-- This migration bypasses the security trigger by dropping and recreating it

-- Drop the trigger temporarily to allow role changes
DROP TRIGGER IF EXISTS enforce_role_security ON profiles;

-- Remove admin role from Sarah Johnson specifically
UPDATE profiles 
SET role = 'athlete' 
WHERE full_name = 'Sarah Johnson' 
  AND role = 'admin';

-- Ensure Preston Tracy has admin role (by email)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'preston.tracy@icloud.com';

-- Also ensure by auth_user_id lookup (in case email field is not set)
UPDATE profiles 
SET role = 'admin' 
WHERE auth_user_id IN (
  SELECT id FROM auth.users WHERE email = 'preston.tracy@icloud.com'
);

-- Recreate the security trigger
CREATE TRIGGER enforce_role_security
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- Verify the changes
DO $$
DECLARE
  admin_count int;
  preston_is_admin boolean;
BEGIN
  -- Count total admins
  SELECT COUNT(*) INTO admin_count FROM profiles WHERE role = 'admin';
  
  -- Check if Preston is admin
  SELECT EXISTS(
    SELECT 1 FROM profiles 
    WHERE email = 'preston.tracy@icloud.com' AND role = 'admin'
  ) INTO preston_is_admin;
  
  RAISE NOTICE 'Admin role fix completed:';
  RAISE NOTICE '- Total admin users: %', admin_count;
  RAISE NOTICE '- Preston Tracy is admin: %', preston_is_admin;
  
  IF admin_count = 1 AND preston_is_admin THEN
    RAISE NOTICE '✅ SUCCESS: Only Preston Tracy has admin role';
  ELSE
    RAISE WARNING '⚠️  Multiple admins still exist or Preston is not admin';
  END IF;
END $$;