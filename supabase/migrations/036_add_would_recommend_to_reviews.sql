-- Add would_recommend field to reviews table
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS would_recommend boolean DEFAULT true;

-- Add index for would_recommend to help with recommendation queries
CREATE INDEX IF NOT EXISTS reviews_would_recommend_idx ON public.reviews(coach_id, would_recommend);
