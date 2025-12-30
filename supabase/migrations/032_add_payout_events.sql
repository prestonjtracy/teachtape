-- Migration: Add payout_events table for tracking coach payouts
-- This tracks when coaches are owed money for completed bookings and film reviews

-- ==========================================
-- Part 1: Create payout_events table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.payout_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Link to booking (required)
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- Coach who receives the payout
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Event type: what triggered this payout
  event_type TEXT NOT NULL CHECK (event_type IN (
    'session_completed',      -- Live coaching session completed
    'film_review_completed'   -- Film review delivered
  )),

  -- Amount in cents (what coach receives after platform fee)
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),

  -- Payout status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Awaiting Stripe payout schedule
    'processing',   -- Payout initiated
    'completed',    -- Funds transferred
    'failed'        -- Payout failed
  )),

  -- Stripe references (populated when payout is processed)
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ==========================================
-- Part 2: Add indexes for performance
-- ==========================================

CREATE INDEX IF NOT EXISTS payout_events_booking_id_idx
ON public.payout_events(booking_id);

CREATE INDEX IF NOT EXISTS payout_events_coach_id_idx
ON public.payout_events(coach_id);

CREATE INDEX IF NOT EXISTS payout_events_status_idx
ON public.payout_events(status);

CREATE INDEX IF NOT EXISTS payout_events_created_at_idx
ON public.payout_events(created_at DESC);

-- Unique constraint: one payout event per booking per event type
CREATE UNIQUE INDEX IF NOT EXISTS payout_events_booking_event_type_unique
ON public.payout_events(booking_id, event_type);

-- ==========================================
-- Part 3: Enable RLS and policies
-- ==========================================

ALTER TABLE public.payout_events ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own payout events
CREATE POLICY "Coaches can view own payout events" ON public.payout_events
  FOR SELECT USING (
    coach_id IN (
      SELECT id FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );

-- Admin can view all payout events
CREATE POLICY "Admin can view all payout events" ON public.payout_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- System can insert payout events (from API routes)
CREATE POLICY "System can insert payout events" ON public.payout_events
  FOR INSERT WITH CHECK (true);

-- Admin can update payout events (for manual corrections)
CREATE POLICY "Admin can update payout events" ON public.payout_events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ==========================================
-- Part 4: Add helpful comments
-- ==========================================

COMMENT ON TABLE public.payout_events IS 'Tracks coach payouts for completed sessions and film reviews';
COMMENT ON COLUMN public.payout_events.event_type IS 'What triggered this payout (session_completed or film_review_completed)';
COMMENT ON COLUMN public.payout_events.amount_cents IS 'Amount coach receives in cents (after platform fee)';
COMMENT ON COLUMN public.payout_events.status IS 'Current payout status: pending -> processing -> completed/failed';
COMMENT ON COLUMN public.payout_events.stripe_transfer_id IS 'Stripe Transfer ID when funds move to connected account';
COMMENT ON COLUMN public.payout_events.stripe_payout_id IS 'Stripe Payout ID when funds leave Stripe to bank';
