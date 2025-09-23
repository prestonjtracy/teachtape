#!/usr/bin/env npx tsx

import { createAdminClient } from '../lib/supabase/server';

async function debugZoomLogs() {
  const supabase = createAdminClient();
  
  console.log('🔍 Debugging zoom logs...');
  
  try {
    // 1. Check if zoom_session_logs table exists
    console.log('\n📋 Checking if zoom_session_logs table exists...');
    const { data: testQuery, error: testError } = await supabase
      .from('zoom_session_logs')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log('❌ Table does not exist:', testError.message);
      console.log('\n📝 You need to run this SQL in your Supabase dashboard:');
      console.log(`
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

-- Add RLS policies
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
      `);
      return;
    }
    
    console.log('✅ Table exists!');
    
    // 2. Check total count of logs
    const { count, error: countError } = await supabase
      .from('zoom_session_logs')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ Error counting logs:', countError.message);
      return;
    }
    
    console.log(`📊 Total logs in table: ${count}`);
    
    // 3. Fetch recent logs
    if (count && count > 0) {
      console.log('\n📝 Recent logs:');
      const { data: logs, error: logsError } = await supabase
        .from('zoom_session_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (logsError) {
        console.log('❌ Error fetching logs:', logsError.message);
        return;
      }
      
      logs?.forEach((log, index) => {
        console.log(`${index + 1}. ${log.action_type} at ${log.created_at} (booking: ${log.booking_id})`);
      });
    } else {
      console.log('📭 No logs found - this means no one has clicked Zoom buttons yet, or logging is not working');
      
      // 4. Check if there are any recent bookings to test with
      console.log('\n🔍 Checking recent bookings for testing...');
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, created_at, listing:listings(title)')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (bookingsError) {
        console.log('❌ Error fetching bookings:', bookingsError.message);
        return;
      }
      
      if (bookings && bookings.length > 0) {
        console.log('📋 Recent bookings available for testing:');
        bookings.forEach((booking, index) => {
          console.log(`${index + 1}. Booking ${booking.id} (${booking.listing?.title}) at ${booking.created_at}`);
        });
        console.log('\n💡 Try clicking Zoom buttons in the chat for these bookings to generate logs');
      } else {
        console.log('📭 No bookings found');
      }
    }
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugZoomLogs();