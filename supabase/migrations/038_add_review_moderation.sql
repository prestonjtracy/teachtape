-- Migration: Add review moderation capabilities and data integrity
-- This migration adds:
-- 1. Unique constraint on booking_id to prevent duplicate reviews
-- 2. Moderation columns for admin to hide inappropriate reviews
-- 3. RLS policy for admin updates

-- ==========================================
-- Part 1: Add unique constraint on booking_id
-- ==========================================

-- Ensure only one review per booking (data integrity)
-- The application already checks this, but DB constraint is safer
ALTER TABLE public.reviews
DROP CONSTRAINT IF EXISTS reviews_booking_id_unique;

ALTER TABLE public.reviews
ADD CONSTRAINT reviews_booking_id_unique UNIQUE (booking_id);

-- ==========================================
-- Part 2: Add moderation columns
-- ==========================================

-- Hidden flag - admins can hide inappropriate reviews
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- Audit trail for hiding actions
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- ==========================================
-- Part 3: Add indexes
-- ==========================================

-- Index for filtering hidden reviews (commonly queried)
CREATE INDEX IF NOT EXISTS reviews_is_hidden_idx
ON public.reviews(is_hidden);

-- Composite index for coach reviews excluding hidden
CREATE INDEX IF NOT EXISTS reviews_coach_visible_idx
ON public.reviews(coach_id, is_hidden)
WHERE is_hidden = false;

-- ==========================================
-- Part 4: Add RLS policy for admin updates
-- ==========================================

-- Drop if exists for idempotent reruns
DROP POLICY IF EXISTS "admins_update_reviews" ON public.reviews;

-- Admin can update reviews (hide/unhide)
CREATE POLICY "admins_update_reviews" ON public.reviews
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ==========================================
-- Part 5: Add comments
-- ==========================================

COMMENT ON COLUMN public.reviews.is_hidden IS 'Admin can hide inappropriate reviews - hidden reviews excluded from public display';
COMMENT ON COLUMN public.reviews.hidden_at IS 'Timestamp when review was hidden by admin';
COMMENT ON COLUMN public.reviews.hidden_by IS 'Profile ID of admin who hid the review';
COMMENT ON CONSTRAINT reviews_booking_id_unique ON public.reviews IS 'Ensures only one review per booking - prevents duplicate submissions';
