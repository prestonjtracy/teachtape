-- Create a helper function to check if user owns a booking as coach
-- This is more reliable than inline subqueries in RLS policies

CREATE OR REPLACE FUNCTION public.is_booking_coach(booking_coach_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = booking_coach_id
    AND profiles.auth_user_id = auth.uid()
  );
$$;

-- Create a helper function to check if user owns a booking as athlete
CREATE OR REPLACE FUNCTION public.is_booking_athlete(booking_athlete_id uuid, booking_customer_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = booking_athlete_id
    AND profiles.auth_user_id = auth.uid()
  )
  OR
  booking_customer_email = (SELECT email FROM auth.users WHERE id = auth.uid());
$$;

-- Drop all existing booking policies
DROP POLICY IF EXISTS "coaches_view_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "athletes_view_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "service_role_bookings_all" ON public.bookings;

-- Create new policies using the helper functions
CREATE POLICY "coaches_view_own_bookings"
ON public.bookings
FOR SELECT
USING (public.is_booking_coach(coach_id));

CREATE POLICY "athletes_view_own_bookings"
ON public.bookings
FOR SELECT
USING (public.is_booking_athlete(athlete_id, customer_email));

CREATE POLICY "service_role_bookings_all"
ON public.bookings
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Add comments
COMMENT ON FUNCTION public.is_booking_coach IS 'Helper function to check if current user is the coach for a booking';
COMMENT ON FUNCTION public.is_booking_athlete IS 'Helper function to check if current user is the athlete for a booking';
COMMENT ON POLICY "coaches_view_own_bookings" ON public.bookings IS 'Allows coaches to view their own bookings using helper function';
COMMENT ON POLICY "athletes_view_own_bookings" ON public.bookings IS 'Allows athletes to view their own bookings using helper function';
