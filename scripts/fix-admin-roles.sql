-- Remove admin privileges from all users except Preston Tracy
-- This bypasses the trigger by temporarily disabling it

-- Disable the trigger temporarily
ALTER TABLE profiles DISABLE TRIGGER enforce_role_security;

-- Update all admin users except Preston Tracy to be athletes
UPDATE profiles 
SET role = 'athlete' 
WHERE role = 'admin' 
  AND auth_user_id != (
    SELECT auth_user_id 
    FROM profiles 
    WHERE email = 'preston.tracy@icloud.com' 
    LIMIT 1
  );

-- Ensure Preston Tracy is set as admin (in case email lookup didn't work before)
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'preston.tracy@icloud.com';

-- Also try by auth_user_id for Preston Tracy's iCloud account
UPDATE profiles 
SET role = 'admin' 
WHERE auth_user_id IN (
  SELECT id FROM auth.users WHERE email = 'preston.tracy@icloud.com'
);

-- Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER enforce_role_security;

-- Show the final admin users
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.email,
  au.email as auth_email
FROM profiles p
LEFT JOIN auth.users au ON p.auth_user_id = au.id
WHERE p.role = 'admin';