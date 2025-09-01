-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to coach profiles
CREATE POLICY "public_coach_profiles_readable" 
ON public.profiles 
FOR SELECT 
USING (role = 'coach');

-- Enable RLS on listings table  
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active listings
CREATE POLICY "public_active_listings_readable"
ON public.listings
FOR SELECT
USING (is_active = true);

-- Enable RLS on bookings table (restrict to authenticated users only)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- No public policy for bookings - only accessible via service role
-- This ensures booking data stays private