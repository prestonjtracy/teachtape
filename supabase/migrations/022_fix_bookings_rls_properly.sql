-- Re-enable RLS and create working policies for bookings
-- This fixes the issue where coaches couldn't see their bookings

-- Re-enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "coaches_view_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "athletes_view_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "service_role_bookings_all" ON public.bookings;

-- Policy 1: Coaches can view their bookings
-- Using a direct join approach that's more reliable
CREATE POLICY "coaches_view_own_bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  coach_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Policy 2: Athletes can view their bookings
CREATE POLICY "athletes_view_own_bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  athlete_id IN (
    SELECT p.id
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
  )
  OR
  customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy 3: Service role has full access
CREATE POLICY "service_role_bookings_all"
ON public.bookings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add helpful comments
COMMENT ON POLICY "coaches_view_own_bookings" ON public.bookings IS 'Allows authenticated coaches to view their own bookings';
COMMENT ON POLICY "athletes_view_own_bookings" ON public.bookings IS 'Allows authenticated athletes to view their own bookings';
COMMENT ON POLICY "service_role_bookings_all" ON public.bookings IS 'Service role has full access for system operations';
