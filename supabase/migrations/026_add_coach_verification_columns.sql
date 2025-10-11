-- Add verification status columns to coaches table
-- These columns enable proper tracking of coach verification status

ALTER TABLE public.coaches
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id);

-- Create index for faster verification queries
CREATE INDEX IF NOT EXISTS coaches_verified_at_idx ON public.coaches(verified_at);

-- Add comments
COMMENT ON COLUMN public.coaches.verified_at IS 'Timestamp when the coach was verified by an admin';
COMMENT ON COLUMN public.coaches.verified_by IS 'Profile ID of the admin who verified this coach';
