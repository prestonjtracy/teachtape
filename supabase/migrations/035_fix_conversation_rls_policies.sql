-- Fix conversation RLS policies
-- The original policies in migration 004 used auth.uid() directly
-- but conversation_participants.user_id is a profile ID, not auth user ID
-- Migration 028 added correct policies but the old ones may still exist

-- Drop the old incorrect policies (from migration 004)
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Athletes can view their booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Coaches can view their booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Athletes can create booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Athletes can update their booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Coaches can update their booking requests" ON public.booking_requests;

-- Also drop the policies from migration 028 to recreate them cleanly
DROP POLICY IF EXISTS "users_read_own_conversations" ON public.conversations;
DROP POLICY IF EXISTS "users_read_own_conversation_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "users_read_own_conversation_messages" ON public.messages;
DROP POLICY IF EXISTS "users_create_own_conversation_messages" ON public.messages;

-- Recreate correct policies for conversation_participants
-- Users can select their own participation records directly
CREATE POLICY "users_select_own_participation"
ON public.conversation_participants
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  )
);

-- Users can also see other participants in conversations they're part of
CREATE POLICY "users_view_conversation_participants"
ON public.conversation_participants
FOR SELECT
USING (
  conversation_id IN (
    SELECT cp.conversation_id
    FROM conversation_participants cp
    INNER JOIN profiles p ON cp.user_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Recreate correct policy for conversations
CREATE POLICY "users_read_own_conversations"
ON public.conversations
FOR SELECT
USING (
  id IN (
    SELECT cp.conversation_id
    FROM conversation_participants cp
    INNER JOIN profiles p ON cp.user_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- Recreate correct policies for messages
CREATE POLICY "users_read_own_conversation_messages"
ON public.messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT cp.conversation_id
    FROM conversation_participants cp
    INNER JOIN profiles p ON cp.user_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
);

CREATE POLICY "users_create_own_conversation_messages"
ON public.messages
FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT cp.conversation_id
    FROM conversation_participants cp
    INNER JOIN profiles p ON cp.user_id = p.id
    WHERE p.auth_user_id = auth.uid()
  )
  AND sender_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  )
);

-- Add a comment explaining the fix
COMMENT ON POLICY "users_select_own_participation" ON public.conversation_participants
IS 'Users can select their own participation records. Uses profile.id lookup since user_id references profiles, not auth.users.';
