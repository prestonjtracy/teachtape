-- Migration: Add scheduling + chat primitives
-- This adds conversation system and booking request flow
-- while preserving existing booking tables

-- ==========================================
-- CONVERSATIONS SYSTEM
-- ==========================================

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create conversation participants table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text CHECK (role IN ('athlete','coach')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

-- Enhance existing messages table to support conversations
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS kind text DEFAULT 'text';

-- Update messages table sender_id to reference profiles properly
-- (it was referencing profiles but let's ensure it's consistent)
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for faster conversation message queries
CREATE INDEX IF NOT EXISTS messages_conversation_id_created_at_idx 
ON public.messages(conversation_id, created_at);

-- ==========================================
-- BOOKING REQUESTS SYSTEM
-- ==========================================

-- Create booking_requests table for scheduling flow
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  coach_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  proposed_start timestamptz NOT NULL,
  proposed_end timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  status text CHECK (status IN ('pending','accepted','declined','cancelled')) DEFAULT 'pending',
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  setup_intent_id text,
  payment_method_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure proposed_end > proposed_start
  CONSTRAINT booking_requests_valid_time_range CHECK (proposed_end > proposed_start)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS booking_requests_coach_id_status_idx 
ON public.booking_requests(coach_id, status);

CREATE INDEX IF NOT EXISTS booking_requests_athlete_id_status_idx 
ON public.booking_requests(athlete_id, status);

CREATE INDEX IF NOT EXISTS booking_requests_listing_id_idx 
ON public.booking_requests(listing_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at 
  BEFORE UPDATE ON public.conversations 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Apply trigger to booking_requests
DROP TRIGGER IF EXISTS update_booking_requests_updated_at ON public.booking_requests;
CREATE TRIGGER update_booking_requests_updated_at 
  BEFORE UPDATE ON public.booking_requests 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Conversations: Participants can read/write their conversations
CREATE POLICY "Users can view conversations they participate in"
ON public.conversations FOR SELECT
USING (
  id IN (
    SELECT conversation_id 
    FROM public.conversation_participants 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update conversations they participate in"
ON public.conversations FOR UPDATE
USING (
  id IN (
    SELECT conversation_id 
    FROM public.conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Conversation participants: Users can view participants in their conversations
CREATE POLICY "Users can view participants in their conversations"
ON public.conversation_participants FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM public.conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- Messages: Participants can read/write messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM public.conversation_participants 
    WHERE user_id = auth.uid()
  ) OR booking_id IN (
    SELECT id FROM public.bookings 
    WHERE coach_id = auth.uid() 
    OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can insert messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  (conversation_id IN (
    SELECT conversation_id 
    FROM public.conversation_participants 
    WHERE user_id = auth.uid()
  ) AND sender_id = auth.uid())
  OR 
  (booking_id IN (
    SELECT id FROM public.bookings 
    WHERE coach_id = auth.uid() 
    OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ) AND sender_id = auth.uid())
);

-- Booking requests: Athletes and coaches can read their requests
CREATE POLICY "Athletes can view their booking requests"
ON public.booking_requests FOR SELECT
USING (athlete_id = auth.uid());

CREATE POLICY "Coaches can view their booking requests"
ON public.booking_requests FOR SELECT
USING (coach_id = auth.uid());

-- Athletes can create booking requests
CREATE POLICY "Athletes can create booking requests"
ON public.booking_requests FOR INSERT
WITH CHECK (athlete_id = auth.uid());

-- Athletes and coaches can update their booking requests
CREATE POLICY "Athletes can update their booking requests"
ON public.booking_requests FOR UPDATE
USING (athlete_id = auth.uid());

CREATE POLICY "Coaches can update their booking requests"
ON public.booking_requests FOR UPDATE
USING (coach_id = auth.uid());

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to create a conversation between two users
CREATE OR REPLACE FUNCTION create_conversation_between_users(
  user1_id uuid,
  user1_role text,
  user2_id uuid,
  user2_role text
) RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  conversation_id uuid;
BEGIN
  -- Create the conversation
  INSERT INTO public.conversations DEFAULT VALUES
  RETURNING id INTO conversation_id;
  
  -- Add participants
  INSERT INTO public.conversation_participants (conversation_id, user_id, role)
  VALUES 
    (conversation_id, user1_id, user1_role),
    (conversation_id, user2_id, user2_role);
  
  RETURN conversation_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_conversation_between_users TO authenticated;

-- ==========================================
-- COMMENTS
-- ==========================================

COMMENT ON TABLE public.conversations IS 'Chat conversations between users';
COMMENT ON TABLE public.conversation_participants IS 'Users participating in conversations with their roles';
COMMENT ON TABLE public.booking_requests IS 'Scheduling requests between athletes and coaches';
COMMENT ON COLUMN public.booking_requests.setup_intent_id IS 'Stripe Setup Intent ID for payment method collection';
COMMENT ON COLUMN public.booking_requests.payment_method_id IS 'Stripe Payment Method ID for future payments';
COMMENT ON COLUMN public.messages.kind IS 'Message type: text, image, system, etc.';
COMMENT ON COLUMN public.messages.conversation_id IS 'Reference to conversation (for chat system)';
COMMENT ON COLUMN public.messages.booking_id IS 'Reference to booking (for legacy booking messages)';