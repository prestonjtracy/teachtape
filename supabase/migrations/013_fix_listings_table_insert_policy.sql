-- Fix RLS policies for listings table to allow coaches to manage their own listings
-- This fixes the "new row violates row-level security policy" error

-- Add INSERT policy - coaches can create their own listings
CREATE POLICY "coaches_can_insert_own_listings"
  ON public.listings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = listings.coach_id
      AND profiles.auth_user_id = auth.uid()
      AND profiles.role = 'coach'
    )
  );

-- Add UPDATE policy - coaches can update their own listings
CREATE POLICY "coaches_can_update_own_listings"
  ON public.listings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = listings.coach_id
      AND profiles.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = listings.coach_id
      AND profiles.auth_user_id = auth.uid()
    )
  );

-- Add DELETE policy - coaches can delete their own listings
CREATE POLICY "coaches_can_delete_own_listings"
  ON public.listings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = listings.coach_id
      AND profiles.auth_user_id = auth.uid()
    )
  );
