-- Add stripe_account_id column to coaches table
ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS stripe_account_id text;