-- Fix public listings visibility by ensuring all coaches have a record in the coaches table
-- This fixes the "No Sessions Available" issue when viewing coach profiles

-- Step 1: Create coach records for all existing coach profiles that don't have one
INSERT INTO public.coaches (profile_id, sport, is_public)
SELECT
  p.id,
  p.sport,
  true  -- Default to public so their listings show up
FROM public.profiles p
WHERE p.role = 'coach'
  AND NOT EXISTS (
    SELECT 1 FROM public.coaches c WHERE c.profile_id = p.id
  )
ON CONFLICT (profile_id) DO NOTHING;

-- Step 2: Ensure all existing coach records are set to public by default
-- (This helps with coaches who might have been created with is_public = false)
UPDATE public.coaches
SET is_public = true
WHERE is_public = false OR is_public IS NULL;

-- Step 3: Add a comment explaining the coaches table requirement
COMMENT ON TABLE public.coaches IS 'Extended coach information. A record must exist here with is_public=true for coach listings to be visible on public profile pages.';
