-- RLS policies for the booking flow

-- Enable RLS on new tables
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;

-- Update bookings RLS (already enabled from previous migration)

-- Coaches: Public can read public coaches
CREATE POLICY "public_coaches_readable" 
ON public.coaches 
FOR SELECT 
USING (is_public = true);

-- Services: Public can read active services from public coaches
CREATE POLICY "public_services_readable"
ON public.services
FOR SELECT
USING (
  active = true 
  AND coach_id IN (
    SELECT id FROM public.coaches WHERE is_public = true
  )
);

-- Availabilities: Public can read availabilities from public coaches
CREATE POLICY "public_availabilities_readable"
ON public.availabilities
FOR SELECT
USING (
  coach_id IN (
    SELECT id FROM public.coaches WHERE is_public = true
  )
  AND starts_at > now() -- Only future availability
);

-- Bookings: More restrictive - only allow inserts via service role
-- No public read access to protect privacy
CREATE POLICY "service_role_bookings_all"
ON public.bookings
FOR ALL
USING (auth.role() = 'service_role');

-- Update existing policies to work with new schema
-- Update profiles policy to still allow reading coach profiles
DROP POLICY IF EXISTS "public_coach_profiles_readable" ON public.profiles;
CREATE POLICY "public_coach_profiles_readable" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'coach' 
  AND id IN (
    SELECT profile_id FROM public.coaches WHERE is_public = true
  )
);

-- Keep existing listings policy for backward compatibility
-- but limit to coaches that are public
DROP POLICY IF EXISTS "public_active_listings_readable" ON public.listings;
CREATE POLICY "public_active_listings_readable"
ON public.listings
FOR SELECT
USING (
  is_active = true
  AND coach_id IN (
    SELECT profile_id FROM public.coaches WHERE is_public = true
  )
);