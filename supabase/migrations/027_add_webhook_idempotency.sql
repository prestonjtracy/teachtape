-- Create webhook_events table for idempotency tracking
-- This prevents duplicate processing of webhook events

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_event_id ON public.webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON public.webhook_events(processed_at);

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can manage webhook events
CREATE POLICY "service_role_webhook_events_all"
ON public.webhook_events
FOR ALL
USING (auth.role() = 'service_role');

-- Add comment
COMMENT ON TABLE public.webhook_events IS 'Tracks processed webhook events for idempotency';
