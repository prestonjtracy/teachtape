-- Add payment_intent_id column for webhook idempotency
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_intent_id text;

-- Create unique index to prevent duplicate bookings from the same payment intent
CREATE UNIQUE INDEX IF NOT EXISTS bookings_payment_intent_id_unique 
ON public.bookings(payment_intent_id) 
WHERE payment_intent_id IS NOT NULL;