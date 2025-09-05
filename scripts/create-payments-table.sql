-- Create payments tracking table for admin panel
-- This tracks all payment transactions and Stripe Connect payouts

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Payment identifiers
  stripe_payment_intent_id text UNIQUE,
  stripe_session_id text,
  
  -- Related entities
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  booking_request_id uuid REFERENCES public.booking_requests(id) ON DELETE SET NULL,
  coach_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Payment amounts (all in cents)
  total_amount_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  coach_amount_cents integer NOT NULL,
  stripe_fee_cents integer DEFAULT 0,
  
  -- Payment status
  payment_status text CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'canceled', 'refunded')) DEFAULT 'pending',
  
  -- Payout tracking
  payout_status text CHECK (payout_status IN ('pending', 'in_transit', 'paid', 'failed', 'canceled')) DEFAULT 'pending',
  stripe_transfer_id text,
  payout_date timestamptz,
  payout_failed_reason text,
  payout_retry_count integer DEFAULT 0,
  
  -- Metadata
  currency text DEFAULT 'usd',
  description text,
  customer_email text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS payments_coach_id_idx ON public.payments(coach_id);
CREATE INDEX IF NOT EXISTS payments_athlete_id_idx ON public.payments(athlete_id);
CREATE INDEX IF NOT EXISTS payments_payment_status_idx ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS payments_payout_status_idx ON public.payments(payout_status);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON public.payments(created_at);
CREATE INDEX IF NOT EXISTS payments_stripe_payment_intent_id_idx ON public.payments(stripe_payment_intent_id);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only for this table
CREATE POLICY "admin_payments_full_access" 
ON public.payments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (
      SELECT id FROM public.profiles 
      WHERE auth_user_id = auth.uid()
    ) 
    AND role = 'admin'
  )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER payments_updated_at_trigger
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_payments_updated_at();