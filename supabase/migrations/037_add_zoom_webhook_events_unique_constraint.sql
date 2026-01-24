-- Migration: Add unique constraint to zoom_webhook_events for upsert support
-- This enables idempotent webhook handling to prevent duplicate events

-- Add unique constraint for upsert operations
-- This allows the webhook handler to safely use upsert with onConflict
ALTER TABLE public.zoom_webhook_events
ADD CONSTRAINT zoom_webhook_events_unique_event
UNIQUE (zoom_meeting_id, event_type, occurred_at);

-- Add comment
COMMENT ON CONSTRAINT zoom_webhook_events_unique_event ON public.zoom_webhook_events
IS 'Enables idempotent webhook processing - prevents duplicate events from Zoom retries';
