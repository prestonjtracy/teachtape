import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createZoomLogsTable() {
  try {
    console.log('🔧 Creating zoom_session_logs table...');

    // Check if table already exists
    const { error: checkError } = await supabase
      .from('zoom_session_logs')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table already exists');
      return;
    }

    console.log('📋 Table does not exist, creating it...');

    // Create the table using raw SQL
    const createTableSQL = `
      -- Create zoom session logs table
      CREATE TABLE IF NOT EXISTS zoom_session_logs (
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
      CREATE INDEX IF NOT EXISTS idx_zoom_session_logs_booking_id ON zoom_session_logs(booking_id);
      CREATE INDEX IF NOT EXISTS idx_zoom_session_logs_coach_id ON zoom_session_logs(coach_id);
      CREATE INDEX IF NOT EXISTS idx_zoom_session_logs_athlete_id ON zoom_session_logs(athlete_id);
      CREATE INDEX IF NOT EXISTS idx_zoom_session_logs_created_at ON zoom_session_logs(created_at DESC);

      -- Add RLS policies (admin only access)
      ALTER TABLE zoom_session_logs ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Admin can view zoom session logs" ON zoom_session_logs;
      DROP POLICY IF EXISTS "Users can insert zoom session logs" ON zoom_session_logs;

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
    `;

    // Execute the SQL - we'll need to run this through an API or direct connection
    console.log('SQL to execute:');
    console.log(createTableSQL);

    // For now, let's try creating via a simple API call
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
    
    if (error) {
      console.error('❌ Error creating table via RPC:', error);
      console.log('\n📝 Manual SQL to run in Supabase SQL editor:');
      console.log(createTableSQL);
    } else {
      console.log('✅ Table created successfully!');
    }

    // Test the table
    const { count, error: testError } = await supabase
      .from('zoom_session_logs')
      .select('*', { count: 'exact', head: true });

    if (testError) {
      console.error('❌ Error testing table:', testError);
    } else {
      console.log(`✅ Table verified with ${count || 0} records`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createZoomLogsTable();