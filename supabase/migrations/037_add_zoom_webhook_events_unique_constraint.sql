-- Migration: Ensure zoom_webhook_events table exists and add unique constraint
-- This is self-contained - creates table if missing, then adds constraint

-- ==========================================
-- Part 1: Ensure bookings has zoom_meeting_id column
-- ==========================================

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT;

CREATE INDEX IF NOT EXISTS bookings_zoom_meeting_id_idx
ON public.bookings(zoom_meeting_id);

-- ==========================================
-- Part 2: Create zoom_webhook_events table if not exists
-- ==========================================

CREATE TABLE IF NOT EXISTS public.zoom_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zoom_meeting_id TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  participant_name TEXT,
  participant_user_id TEXT,
  participant_email TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- Add indexes
CREATE INDEX IF NOT EXISTS zoom_webhook_events_meeting_id_idx
ON public.zoom_webhook_events(zoom_meeting_id);

CREATE INDEX IF NOT EXISTS zoom_webhook_events_booking_id_idx
ON public.zoom_webhook_events(booking_id);

CREATE INDEX IF NOT EXISTS zoom_webhook_events_occurred_at_idx
ON public.zoom_webhook_events(occurred_at DESC);

CREATE INDEX IF NOT EXISTS zoom_webhook_events_event_type_idx
ON public.zoom_webhook_events(event_type);

-- ==========================================
-- Part 3: Enable RLS and policies
-- ==========================================

ALTER TABLE public.zoom_webhook_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Admin can view zoom webhook events" ON public.zoom_webhook_events;
DROP POLICY IF EXISTS "System can insert zoom webhook events" ON public.zoom_webhook_events;

-- Admin can view all webhook events
CREATE POLICY "Admin can view zoom webhook events" ON public.zoom_webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- System can insert webhook events
CREATE POLICY "System can insert zoom webhook events" ON public.zoom_webhook_events
  FOR INSERT WITH CHECK (true);

-- ==========================================
-- Part 4: Add unique constraint for upsert idempotency
-- ==========================================

-- Drop constraint if exists (for idempotent re-runs)
ALTER TABLE public.zoom_webhook_events
DROP CONSTRAINT IF EXISTS zoom_webhook_events_unique_event;

-- Add unique constraint for upsert operations
ALTER TABLE public.zoom_webhook_events
ADD CONSTRAINT zoom_webhook_events_unique_event
UNIQUE (zoom_meeting_id, event_type, occurred_at);

-- ==========================================
-- Part 5: Add comments
-- ==========================================

COMMENT ON TABLE public.zoom_webhook_events IS 'Stores events received from Zoom webhooks for meeting lifecycle tracking';
COMMENT ON CONSTRAINT zoom_webhook_events_unique_event ON public.zoom_webhook_events
IS 'Enables idempotent webhook processing - prevents duplicate events from Zoom retries';
