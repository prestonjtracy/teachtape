-- Check current state of all active listings
SELECT id, title, listing_type, turnaround_hours, price_cents, description
FROM public.listings
WHERE is_active = true
ORDER BY created_at DESC;
