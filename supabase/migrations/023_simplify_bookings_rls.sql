-- Simplify RLS policy to directly check auth_user_id relationship
-- The previous IN subquery approach may have performance or evaluation issues

-- Drop existing policies
DROP POLICY IF EXISTS "coaches_view_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "athletes_view_own_bookings" ON public.bookings;

-- Recreate coach policy with direct EXISTS check (more reliable than IN)
CREATE POLICY "coaches_view_own_bookings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = bookings.coach_id
    AND profiles.auth_user_id = auth.uid()
  )
);

-- Recreate athlete policy with direct EXISTS check
CREATE POLICY "athletes_view_own_bookings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = bookings.athlete_id
    AND profiles.auth_user_id = auth.uid()
  )
  OR
  customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Verify service role policy still exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookings'
    AND policyname = 'service_role_bookings_all'
  ) THEN
    CREATE POLICY "service_role_bookings_all"
    ON public.bookings
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
