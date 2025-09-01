-- Create missing tables for booking flow
-- Run this in your Supabase SQL editor

-- 1. Create coaches table (extending profiles)
CREATE TABLE IF NOT EXISTS public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  sport text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create unique index on profile_id
CREATE UNIQUE INDEX IF NOT EXISTS coaches_profile_id_unique ON public.coaches(profile_id);

-- 2. Create services table (replacing listings)
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES public.coaches(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 60,
  price_cents integer NOT NULL,
  currency text DEFAULT 'usd',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. Create availabilities table
CREATE TABLE IF NOT EXISTS public.availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Add constraint to ensure ends_at > starts_at
ALTER TABLE public.availabilities 
ADD CONSTRAINT IF NOT EXISTS availabilities_valid_time_range 
CHECK (ends_at > starts_at);

-- Create indexes on availabilities
CREATE UNIQUE INDEX IF NOT EXISTS availabilities_coach_starts_unique 
ON public.availabilities(coach_id, starts_at);

CREATE INDEX IF NOT EXISTS availabilities_coach_time_idx 
ON public.availabilities(coach_id, starts_at);

-- 4. Create or update bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES public.coaches(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  athlete_email text,
  athlete_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text DEFAULT 'pending',
  stripe_payment_intent text,
  zoom_join_url text,
  zoom_start_url text,
  created_at timestamptz DEFAULT now()
);

-- Add constraint for booking status
ALTER TABLE public.bookings 
ADD CONSTRAINT IF NOT EXISTS bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'));

-- Create index for faster booking queries
CREATE INDEX IF NOT EXISTS bookings_coach_time_idx 
ON public.bookings(coach_id, starts_at);

-- Enable RLS on new tables
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

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

-- Availabilities: Public can read future availability from public coaches
CREATE POLICY "public_future_availabilities_readable"
ON public.availabilities
FOR SELECT
USING (
  starts_at > now()
  AND coach_id IN (
    SELECT id FROM public.coaches WHERE is_public = true
  )
);

-- Bookings: Service role only (no public access)
CREATE POLICY "service_role_bookings_all"
ON public.bookings
FOR ALL
USING (auth.role() = 'service_role');

-- Migrate existing data from profiles/listings to new structure
INSERT INTO public.coaches (profile_id, sport, is_public)
SELECT id, sport, true 
FROM public.profiles 
WHERE role = 'coach' 
ON CONFLICT (profile_id) DO NOTHING;

-- Migrate existing listings to services
INSERT INTO public.services (coach_id, title, description, duration_minutes, price_cents, active)
SELECT 
  c.id as coach_id,
  l.title,
  l.description,
  l.duration_minutes,
  l.price_cents,
  l.is_active
FROM public.listings l
JOIN public.coaches c ON c.profile_id = l.coach_id
ON CONFLICT DO NOTHING;