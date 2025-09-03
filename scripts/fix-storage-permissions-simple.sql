-- Simple Storage Permissions Fix
-- Run each section separately if needed

-- 1. Drop existing policies first (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Allow authenticated users to view buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Allow authenticated users to view objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- 2. Create bucket viewing policy
CREATE POLICY "authenticated_can_view_buckets"
ON storage.buckets
FOR SELECT
TO authenticated
USING (true);

-- 3. Create object policies for avatars
CREATE POLICY "authenticated_can_view_all_objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "users_can_upload_avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "users_can_update_avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "users_can_delete_avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');