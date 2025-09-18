import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient();

    console.log('🔧 Creating zoom_session_logs table...');

    // Create the table with a direct SQL query
    const { error } = await supabase
      .from('zoom_session_logs')
      .select('id')
      .limit(1);

    if (!error) {
      return NextResponse.json({ 
        success: true, 
        message: 'Table already exists'
      });
    }

    // If table doesn't exist, we need to create it via SQL
    // Since we can't execute raw SQL directly, let's try a different approach
    
    // First, let's check what tables exist
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_tables');

    console.log('Available tables:', tables);

    return NextResponse.json({ 
      success: false,
      message: 'Table does not exist in schema cache. Please create manually in Supabase SQL editor.',
      sqlToRun: `
-- Create zoom session logs table
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
      `
    });

  } catch (error) {
    console.error('Error in create zoom table API:', error);
    return NextResponse.json({ 
      error: "Server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}