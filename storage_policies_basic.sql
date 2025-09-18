-- Basic storage policies for coach-gallery bucket

-- Public read access
CREATE POLICY "Coach gallery public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'coach-gallery');

-- Coach upload access
CREATE POLICY "Coach gallery upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'coach-gallery' 
  AND auth.uid() IS NOT NULL
);

-- Coach update access  
CREATE POLICY "Coach gallery update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'coach-gallery' 
  AND auth.uid() IS NOT NULL
);

-- Coach delete access
CREATE POLICY "Coach gallery delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'coach-gallery' 
  AND auth.uid() IS NOT NULL
);