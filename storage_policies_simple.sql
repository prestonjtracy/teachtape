-- Simple storage policies for coach-gallery bucket

-- Public read access
CREATE POLICY IF NOT EXISTS "Coach gallery public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'coach-gallery');

-- Coach upload access
CREATE POLICY IF NOT EXISTS "Coach gallery upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'coach-gallery' 
  AND auth.uid() IS NOT NULL
);

-- Coach update access  
CREATE POLICY IF NOT EXISTS "Coach gallery update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'coach-gallery' 
  AND auth.uid() IS NOT NULL
);

-- Coach delete access
CREATE POLICY IF NOT EXISTS "Coach gallery delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'coach-gallery' 
  AND auth.uid() IS NOT NULL
);