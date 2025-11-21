-- Fix listing types - make sure live lesson is correct
UPDATE public.listings
SET listing_type = 'live_lesson'
WHERE (
  LOWER(title) LIKE '%live%'
  OR LOWER(title) LIKE '%coaching session%'
  OR LOWER(title) LIKE '%lesson%'
)
AND listing_type != 'live_lesson';

-- Ensure film reviews are correct
UPDATE public.listings
SET listing_type = 'film_review'
WHERE (
  LOWER(title) LIKE '%film review%'
  OR LOWER(title) LIKE '%film analysis%'
)
AND listing_type != 'film_review';

-- Show final state
SELECT id, title, listing_type, turnaround_hours, price_cents
FROM public.listings
WHERE is_active = true
ORDER BY created_at DESC;
