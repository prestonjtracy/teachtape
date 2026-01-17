-- Add structured review content for film reviews
-- This allows coaches to submit detailed, formatted reviews instead of just a link

-- Add review_content column to store structured review data as JSONB
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS review_content JSONB;

-- Add helpful comment
COMMENT ON COLUMN public.bookings.review_content IS 'Structured film review content with overall_assessment, strengths, improvements, drills, timestamps, etc.';

-- Create index for faster lookups on completed reviews with content
CREATE INDEX IF NOT EXISTS idx_bookings_review_content
ON public.bookings(coach_id, review_status)
WHERE review_content IS NOT NULL;
