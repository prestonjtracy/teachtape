-- Add missing fields to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS athlete_name text,
ADD COLUMN IF NOT EXISTS athlete_email text,
ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id) ON DELETE CASCADE;

-- Add index for session_id lookups  
CREATE INDEX IF NOT EXISTS bookings_stripe_session_id_idx ON public.bookings(stripe_session_id);
CREATE INDEX IF NOT EXISTS bookings_service_id_idx ON public.bookings(service_id);