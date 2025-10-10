-- Debug and fix RLS policy for coach bookings visibility
-- The current policy uses a subquery that may not be efficient

-- Drop the existing policy
DROP POLICY IF EXISTS "coaches_view_own_bookings" ON public.bookings;

-- Recreate with a simpler, more direct policy
-- This checks if the coach_id matches any profile belonging to the current user
CREATE POLICY "coaches_view_own_bookings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = bookings.coach_id
    AND profiles.auth_user_id = auth.uid()
  )
);

-- Add comment
COMMENT ON POLICY "coaches_view_own_bookings" ON public.bookings IS 'Allows coaches to view bookings where they are the coach';
