-- Add athlete_id to bookings table and create RLS policies for coaches/athletes to view their bookings

-- Add athlete_id column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS athlete_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for faster athlete queries
CREATE INDEX IF NOT EXISTS bookings_athlete_id_idx ON public.bookings(athlete_id);

-- Drop existing restrictive service-role-only policy
DROP POLICY IF EXISTS "service_role_bookings_all" ON public.bookings;

-- Create new RLS policies for bookings

-- Policy 1: Coaches can view their own bookings
CREATE POLICY "coaches_view_own_bookings"
ON public.bookings
FOR SELECT
USING (
  coach_id IN (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
  )
);

-- Policy 2: Athletes can view their own bookings
CREATE POLICY "athletes_view_own_bookings"
ON public.bookings
FOR SELECT
USING (
  athlete_id IN (
    SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
  )
  OR
  customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Policy 3: Service role retains full access
CREATE POLICY "service_role_bookings_all"
ON public.bookings
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Add comment
COMMENT ON COLUMN public.bookings.athlete_id IS 'Reference to the athlete profile who booked the session';
