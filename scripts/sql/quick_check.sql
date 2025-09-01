-- Quick check for recent bookings with all relevant fields
-- Usage: Run this in your Supabase SQL editor or via psql

SELECT 
    id,
    created_at,
    listing_id,
    coach_id,
    amount_paid_cents,
    status,
    stripe_session_id
FROM bookings
ORDER BY created_at DESC
LIMIT 5;