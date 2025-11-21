-- Add RLS policies for tables that were missing them
-- This ensures data privacy and proper access control

-- ==========================================
-- MESSAGES TABLE
-- ==========================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages in conversations they participate in
CREATE POLICY "users_read_own_conversation_messages"
ON public.messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  )
);

-- Users can create messages in conversations they participate in
CREATE POLICY "users_create_own_conversation_messages"
ON public.messages
FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  )
);

-- Service role can do everything (for API routes)
CREATE POLICY "service_role_messages_all"
ON public.messages
FOR ALL
USING (auth.role() = 'service_role');

-- ==========================================
-- CONVERSATIONS TABLE
-- ==========================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Users can read conversations they participate in
CREATE POLICY "users_read_own_conversations"
ON public.conversations
FOR SELECT
USING (
  id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  )
);

-- Service role can do everything
CREATE POLICY "service_role_conversations_all"
ON public.conversations
FOR ALL
USING (auth.role() = 'service_role');

-- ==========================================
-- CONVERSATION_PARTICIPANTS TABLE
-- ==========================================
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Users can read participants in their own conversations
CREATE POLICY "users_read_own_conversation_participants"
ON public.conversation_participants
FOR SELECT
USING (
  conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id IN (
      SELECT id FROM profiles WHERE auth_user_id = auth.uid()
    )
  )
);

-- Service role can do everything
CREATE POLICY "service_role_conversation_participants_all"
ON public.conversation_participants
FOR ALL
USING (auth.role() = 'service_role');

-- ==========================================
-- BOOKING_REQUESTS TABLE
-- ==========================================
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;

-- Athletes can read their own booking requests
CREATE POLICY "athletes_read_own_booking_requests"
ON public.booking_requests
FOR SELECT
USING (
  athlete_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  )
);

-- Coaches can read booking requests for their listings
CREATE POLICY "coaches_read_own_booking_requests"
ON public.booking_requests
FOR SELECT
USING (
  coach_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  )
);

-- Service role can do everything
CREATE POLICY "service_role_booking_requests_all"
ON public.booking_requests
FOR ALL
USING (auth.role() = 'service_role');

-- ==========================================
-- REVIEWS TABLE
-- ==========================================
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can read reviews (public)
CREATE POLICY "public_read_reviews"
ON public.reviews
FOR SELECT
USING (true);

-- Athletes can create reviews for their own bookings
CREATE POLICY "athletes_create_own_reviews"
ON public.reviews
FOR INSERT
WITH CHECK (
  athlete_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  )
);

-- Service role can do everything
CREATE POLICY "service_role_reviews_all"
ON public.reviews
FOR ALL
USING (auth.role() = 'service_role');

-- Admins can read all
CREATE POLICY "admins_read_all_reviews"
ON public.reviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  )
);

-- ==========================================
-- ENHANCED BOOKINGS RLS
-- Add user-specific policies to bookings table
-- ==========================================

-- Athletes can read their own bookings
CREATE POLICY "athletes_read_own_bookings"
ON public.bookings
FOR SELECT
USING (
  athlete_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  )
  OR customer_email IN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  )
);

-- Coaches can read bookings for their listings
CREATE POLICY "coaches_read_own_bookings"
ON public.bookings
FOR SELECT
USING (
  coach_id IN (
    SELECT id FROM profiles WHERE auth_user_id = auth.uid()
  )
);

-- Admins can read all bookings
CREATE POLICY "admins_read_all_bookings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  )
);

COMMENT ON POLICY "users_read_own_conversation_messages" ON public.messages IS 'Users can only read messages in conversations they participate in';
COMMENT ON POLICY "athletes_read_own_booking_requests" ON public.booking_requests IS 'Athletes can only see their own booking requests';
COMMENT ON POLICY "coaches_read_own_booking_requests" ON public.booking_requests IS 'Coaches can only see requests for their listings';
COMMENT ON POLICY "public_read_reviews" ON public.reviews IS 'Reviews are publicly readable for transparency';
COMMENT ON POLICY "athletes_read_own_bookings" ON public.bookings IS 'Athletes can see their own bookings';
COMMENT ON POLICY "coaches_read_own_bookings" ON public.bookings IS 'Coaches can see bookings for their services';
