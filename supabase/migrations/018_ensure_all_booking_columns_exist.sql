-- Comprehensive fix: Ensure all required booking columns exist
-- This migration safely adds any missing columns that may not have been added by previous migrations

-- Add athlete_id if it doesn't exist (from migration 017)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add Zoom URL columns if they don't exist (should have been added by migration 002)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS zoom_join_url text,
ADD COLUMN IF NOT EXISTS zoom_start_url text;

-- Add other potentially missing columns from migration 002
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS athlete_email text,
ADD COLUMN IF NOT EXISTS athlete_name text,
ADD COLUMN IF NOT EXISTS stripe_payment_intent text;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS bookings_athlete_id_idx ON public.bookings(athlete_id);
CREATE INDEX IF NOT EXISTS bookings_coach_id_idx ON public.bookings(coach_id);
CREATE INDEX IF NOT EXISTS bookings_starts_at_idx ON public.bookings(starts_at);

-- Verify the table structure
COMMENT ON TABLE public.bookings IS 'Booking records with Zoom integration and proper athlete tracking';
