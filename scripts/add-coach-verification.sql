-- Add verification status to coaches table
-- This provides more granular control than just using is_public

ALTER TABLE public.coaches 
ADD COLUMN IF NOT EXISTS verified_at timestamptz,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id);

-- Create index for faster verification queries
CREATE INDEX IF NOT EXISTS coaches_verified_at_idx ON public.coaches(verified_at);