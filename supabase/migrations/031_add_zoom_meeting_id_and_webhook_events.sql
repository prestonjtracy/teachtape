-- Migration: Add zoom_meeting_id to bookings and create zoom_webhook_events table
-- This migration fixes the Zoom integration to properly track meetings and webhook events

-- ==========================================
-- Part 1: Add zoom_meeting_id to bookings
-- ==========================================

-- Add zoom_meeting_id column to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT;

-- Create index for faster lookups by Zoom meeting ID
CREATE INDEX IF NOT EXISTS bookings_zoom_meeting_id_idx
ON public.bookings(zoom_meeting_id);

-- Add comment
COMMENT ON COLUMN public.bookings.zoom_meeting_id IS 'Zoom meeting ID for linking webhook events to bookings';

-- ==========================================
-- Part 2: Create zoom_webhook_events table
-- ==========================================

-- Create table for storing Zoom webhook events (separate from button click logs)
CREATE TABLE IF NOT EXISTS public.zoom_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Meeting identification
  zoom_meeting_id TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'meeting.started',
    'meeting.ended',
    'meeting.participant_joined',
    'meeting.participant_left'
  )),

  -- Participant info (for participant events)
  participant_name TEXT,
  participant_user_id TEXT,
  participant_email TEXT,

  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Raw webhook payload for debugging
  raw_data JSONB
);

-- Add indexes for performance
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

-- Enable RLS
ALTER TABLE public.zoom_webhook_events ENABLE ROW LEVEL SECURITY;

-- Admin can view all webhook events
CREATE POLICY "Admin can view zoom webhook events" ON public.zoom_webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- System can insert webhook events (no auth required for webhook endpoint)
CREATE POLICY "System can insert zoom webhook events" ON public.zoom_webhook_events
  FOR INSERT WITH CHECK (true);

-- ==========================================
-- Part 4: Add helpful comments
-- ==========================================

COMMENT ON TABLE public.zoom_webhook_events IS 'Stores events received from Zoom webhooks for meeting lifecycle tracking';
COMMENT ON COLUMN public.zoom_webhook_events.event_type IS 'Type of Zoom webhook event received';
COMMENT ON COLUMN public.zoom_webhook_events.participant_name IS 'Name of participant (for join/leave events)';
COMMENT ON COLUMN public.zoom_webhook_events.occurred_at IS 'When the event occurred according to Zoom';
COMMENT ON COLUMN public.zoom_webhook_events.raw_data IS 'Complete webhook payload for debugging and audit trail';

-- ==========================================
-- Part 5: Update existing zoom_session_logs table comment
-- ==========================================

-- Clarify that zoom_session_logs is for button clicks, not webhook events
COMMENT ON TABLE public.zoom_session_logs IS 'Tracks when users click Zoom meeting buttons (NOT webhook events - see zoom_webhook_events for those)';
