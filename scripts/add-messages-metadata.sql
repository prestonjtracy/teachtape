-- Add metadata column to messages table for storing structured data like Zoom meeting info
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.messages.metadata IS 'JSON metadata for structured message data (e.g., Zoom meeting details, booking info)';