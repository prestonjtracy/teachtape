-- Fix missing columns in database schema
-- Run this script to add missing columns that the app is trying to query

-- Add stripe_account_id to coaches table
ALTER TABLE public.coaches 
ADD COLUMN IF NOT EXISTS stripe_account_id text;

-- Add email to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS coaches_stripe_account_id_idx ON public.coaches(stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Update email from auth.users table if empty
UPDATE public.profiles 
SET email = auth_users.email
FROM auth.users auth_users
WHERE public.profiles.auth_user_id = auth_users.id 
AND public.profiles.email IS NULL;