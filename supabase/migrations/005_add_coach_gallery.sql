-- Migration: Add coach gallery feature
-- This adds a coach gallery table with image storage capabilities
-- and proper RLS policies for public viewing and coach-only management

-- ==========================================
-- COACH GALLERY TABLE
-- ==========================================

-- Create coach_gallery table
CREATE TABLE IF NOT EXISTS public.coach_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure position is non-negative
  CONSTRAINT coach_gallery_position_positive CHECK (position >= 0)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS coach_gallery_coach_id_position_idx 
ON public.coach_gallery(coach_id, position);

CREATE INDEX IF NOT EXISTS coach_gallery_coach_id_created_at_idx 
ON public.coach_gallery(coach_id, created_at DESC);

-- Add trigger to update updated_at timestamp (reuse existing function)
DROP TRIGGER IF EXISTS update_coach_gallery_updated_at ON public.coach_gallery;
CREATE TRIGGER update_coach_gallery_updated_at 
  BEFORE UPDATE ON public.coach_gallery 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- CONSTRAINT: MAX 5 IMAGES PER COACH
-- ==========================================

-- Function to enforce max 5 images per coach
CREATE OR REPLACE FUNCTION check_coach_gallery_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.coach_gallery WHERE coach_id = NEW.coach_id) >= 5 THEN
    RAISE EXCEPTION 'Coach can have maximum 5 gallery images';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply constraint trigger
DROP TRIGGER IF EXISTS enforce_coach_gallery_limit ON public.coach_gallery;
CREATE TRIGGER enforce_coach_gallery_limit
  BEFORE INSERT ON public.coach_gallery
  FOR EACH ROW EXECUTE FUNCTION check_coach_gallery_limit();

-- ==========================================
-- SUPABASE STORAGE BUCKET
-- ==========================================

-- Create storage bucket for coach gallery images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('coach-gallery', 'coach-gallery', true)
ON CONFLICT (id) DO NOTHING;

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

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on coach_gallery table
ALTER TABLE public.coach_gallery ENABLE ROW LEVEL SECURITY;

-- SELECT: Open/public - anyone can view gallery images
CREATE POLICY IF NOT EXISTS "Coach gallery images are publicly viewable"
ON public.coach_gallery FOR SELECT
USING (true);

-- INSERT: Only coaches can add to their own gallery
CREATE POLICY IF NOT EXISTS "Coaches can add to their own gallery"
ON public.coach_gallery FOR INSERT
WITH CHECK (coach_id = auth.uid());

-- UPDATE: Only coaches can update their own gallery
CREATE POLICY IF NOT EXISTS "Coaches can update their own gallery"
ON public.coach_gallery FOR UPDATE
USING (coach_id = auth.uid());

-- DELETE: Only coaches can delete from their own gallery
CREATE POLICY IF NOT EXISTS "Coaches can delete from their own gallery"
ON public.coach_gallery FOR DELETE
USING (coach_id = auth.uid());

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE public.coach_gallery IS 'Gallery images for coach profiles (max 5 per coach)';
COMMENT ON COLUMN public.coach_gallery.coach_id IS 'Reference to the coach profile';
COMMENT ON COLUMN public.coach_gallery.image_url IS 'URL to the gallery image (typically from Supabase storage)';
COMMENT ON COLUMN public.coach_gallery.caption IS 'Optional caption for the gallery image';
COMMENT ON COLUMN public.coach_gallery.position IS 'Display order position (0-based)';