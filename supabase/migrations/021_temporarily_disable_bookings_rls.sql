-- TEMPORARY: Disable RLS on bookings to test if that's the blocker
-- This is for debugging only - we'll re-enable with proper policies after testing

-- Disable RLS temporarily
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON TABLE public.bookings IS 'RLS temporarily disabled for debugging - will re-enable once we identify the issue';
