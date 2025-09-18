-- Fix RLS policies for listing-images storage bucket
-- The uploader saves files in public/ folder, so we need to allow that

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can upload their own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own listing images" ON storage.objects;

-- Allow authenticated users to upload listing images to public folder
CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'public'
);

-- Allow anyone to view listing images (public access)
CREATE POLICY "Anyone can view listing images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

-- Allow authenticated users to update listing images in public folder
CREATE POLICY "Authenticated users can update listing images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'public'
);

-- Allow authenticated users to delete listing images in public folder
CREATE POLICY "Authenticated users can delete listing images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'listing-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'public'
);