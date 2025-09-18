-- Storage policies for coach-gallery bucket
-- Run this in Supabase SQL Editor

-- Storage policies: Public read, owner write/delete
CREATE POLICY IF NOT EXISTS "Coach gallery images are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'coach-gallery');

CREATE POLICY IF NOT EXISTS "Coaches can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'coach-gallery' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Coaches can update their gallery images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'coach-gallery' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY IF NOT EXISTS "Coaches can delete their gallery images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'coach-gallery' 
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);