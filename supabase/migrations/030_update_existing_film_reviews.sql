-- Update any existing listings that are film reviews to have the correct data
-- This ensures existing data is properly typed after adding the new columns

-- If you have film review listings that were created before the migration,
-- they need to be updated with the listing_type set to 'film_review'
-- You'll need to run this manually for each film review listing:

-- Example (replace the title with your actual listing title):
-- UPDATE public.listings
-- SET
--   listing_type = 'film_review',
--   turnaround_hours = 48  -- or whatever turnaround you want
-- WHERE title = 'Football Film review';

-- Or if you want to update ALL listings with "film review" in the title:
UPDATE public.listings
SET
  listing_type = 'film_review',
  turnaround_hours = COALESCE(turnaround_hours, 48)  -- Default to 48 if null
WHERE
  listing_type = 'live_lesson'  -- Current default
  AND (
    LOWER(title) LIKE '%film%review%'
    OR LOWER(title) LIKE '%film%analysis%'
    OR LOWER(description) LIKE '%film%review%'
  );

-- Show what was updated
SELECT id, title, listing_type, turnaround_hours, price_cents
FROM public.listings
WHERE listing_type = 'film_review';
