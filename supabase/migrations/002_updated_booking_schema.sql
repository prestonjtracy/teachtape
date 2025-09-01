-- Updated schema for complete booking flow
-- This migration updates the existing schema to match the new requirements

-- Update profiles table to add email field
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS name text;

-- Update the name field from existing full_name data
UPDATE public.profiles SET name = full_name WHERE name IS NULL;

-- Create coaches table (extending profiles)
CREATE TABLE IF NOT EXISTS public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  sport text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create unique index on profile_id to ensure one coach record per profile
CREATE UNIQUE INDEX IF NOT EXISTS coaches_profile_id_unique ON public.coaches(profile_id);

-- Create services table (replacing listings)
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

-- Create availabilities table (replacing the old availability table)
CREATE TABLE IF NOT EXISTS public.availabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES public.coaches(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  capacity integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Add constraint to ensure ends_at > starts_at
ALTER TABLE public.availabilities 
ADD CONSTRAINT IF NOT EXISTS availabilities_valid_time_range 
CHECK (ends_at > starts_at);

-- Update bookings table structure
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS athlete_email text,
ADD COLUMN IF NOT EXISTS athlete_name text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent text,
ADD COLUMN IF NOT EXISTS zoom_join_url text,
ADD COLUMN IF NOT EXISTS zoom_start_url text;

-- Update bookings status constraint
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'));

-- Update default status
ALTER TABLE public.bookings 
ALTER COLUMN status SET DEFAULT 'pending';

-- Create index for faster availability queries
CREATE INDEX IF NOT EXISTS availabilities_coach_time_idx ON public.availabilities(coach_id, starts_at);
CREATE INDEX IF NOT EXISTS bookings_coach_time_idx ON public.bookings(coach_id, starts_at);

-- Migrate existing data
-- Create coach records for existing coach profiles
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