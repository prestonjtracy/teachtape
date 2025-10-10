-- Add metadata column to messages table for storing structured message data
-- This is needed for booking_accepted messages to store Zoom URLs and other booking details

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Add index for faster metadata queries
CREATE INDEX IF NOT EXISTS messages_metadata_idx ON public.messages USING gin(metadata);

-- Add comment
COMMENT ON COLUMN public.messages.metadata IS 'Structured data for special message types like booking_accepted';
