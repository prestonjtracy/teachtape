-- Migration: Add zoom session logs table
-- This table tracks when coaches click "Start Meeting" buttons for zoom sessions

CREATE TABLE zoom_session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('start_meeting', 'join_meeting')),
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_zoom_session_logs_booking_id ON zoom_session_logs(booking_id);
CREATE INDEX idx_zoom_session_logs_coach_id ON zoom_session_logs(coach_id);
CREATE INDEX idx_zoom_session_logs_athlete_id ON zoom_session_logs(athlete_id);
CREATE INDEX idx_zoom_session_logs_created_at ON zoom_session_logs(created_at DESC);

-- Add RLS policies (admin only access)
ALTER TABLE zoom_session_logs ENABLE ROW LEVEL SECURITY;

-- Only allow admins to read zoom session logs
CREATE POLICY "Admin can view zoom session logs" ON zoom_session_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.auth_user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Allow authenticated users to insert their own logs
CREATE POLICY "Users can insert zoom session logs" ON zoom_session_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Add helpful comments
COMMENT ON TABLE zoom_session_logs IS 'Tracks when users click zoom meeting buttons for auditing purposes';
COMMENT ON COLUMN zoom_session_logs.action_type IS 'Type of action: start_meeting (coach) or join_meeting (athlete)';
COMMENT ON COLUMN zoom_session_logs.user_agent IS 'Browser user agent string for debugging';
COMMENT ON COLUMN zoom_session_logs.ip_address IS 'IP address of the user for security auditing';