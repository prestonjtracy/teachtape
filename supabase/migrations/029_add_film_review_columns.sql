-- Add film review support to listings table
-- This migration adds listing_type and turnaround_hours columns

-- Add listing_type column (defaults to 'live_lesson' for existing listings)
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'live_lesson'
CHECK (listing_type IN ('live_lesson', 'film_review'));

-- Add turnaround_hours column (nullable, only for film reviews)
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS turnaround_hours INTEGER;

-- Add review_format column (optional description for film reviews)
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS review_format TEXT;

-- Add helpful comment
COMMENT ON COLUMN public.listings.listing_type IS 'Type of listing: live_lesson for video calls, film_review for async film analysis';
COMMENT ON COLUMN public.listings.turnaround_hours IS 'Expected turnaround time in hours for film reviews (e.g., 24, 48, 72)';
COMMENT ON COLUMN public.listings.review_format IS 'Optional description of review format/delivery method';

-- Create index for filtering by listing type
CREATE INDEX IF NOT EXISTS idx_listings_listing_type ON public.listings(listing_type);
