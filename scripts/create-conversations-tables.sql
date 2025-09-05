-- Create missing conversation tables for TeachTape messaging system

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

-- Add conversation_id column to messages table if it doesn't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Add kind column to messages table if it doesn't exist  
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS kind text DEFAULT 'text';

-- Enable RLS on new tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for conversations
CREATE POLICY IF NOT EXISTS "Users can view conversations they participate in"
ON public.conversations FOR SELECT
USING (
  id IN (
    SELECT conversation_id 
    FROM public.conversation_participants cp
    JOIN public.profiles p ON cp.user_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Basic RLS policy for conversation participants
CREATE POLICY IF NOT EXISTS "Users can view participants in their conversations"  
ON public.conversation_participants FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM public.conversation_participants cp
    JOIN public.profiles p ON cp.user_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversation_participants TO authenticated;