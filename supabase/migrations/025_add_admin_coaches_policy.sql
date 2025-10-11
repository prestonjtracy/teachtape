-- Add RLS policy to allow admins to view all coaches (not just public ones)
-- This fixes the issue where the admin coaches page shows no coaches

-- Create policy to allow admins to view all coaches
CREATE POLICY "admins_view_all_coaches"
ON public.coaches
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add similar admin policies for services and availabilities for consistency
CREATE POLICY "admins_view_all_services"
ON public.services
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "admins_view_all_availabilities"
ON public.availabilities
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Add comments
COMMENT ON POLICY "admins_view_all_coaches" ON public.coaches IS 'Allows admins to view all coaches regardless of is_public status';
COMMENT ON POLICY "admins_view_all_services" ON public.services IS 'Allows admins to view all services regardless of active status';
COMMENT ON POLICY "admins_view_all_availabilities" ON public.availabilities IS 'Allows admins to view all availabilities';
