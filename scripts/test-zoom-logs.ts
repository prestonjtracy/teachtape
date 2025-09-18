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

async function testZoomLogs() {
  try {
    console.log('🔍 Testing zoom_session_logs table...');

    // Test if table exists and get count
    const { count, error: countError } = await supabase
      .from('zoom_session_logs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error accessing zoom_session_logs table:', countError);
      return;
    }

    console.log(`✅ Table exists with ${count || 0} records`);

    // Try to fetch any existing logs
    const { data: logs, error: logsError } = await supabase
      .from('zoom_session_logs')
      .select('*')
      .limit(5);

    if (logsError) {
      console.error('❌ Error fetching logs:', logsError);
      return;
    }

    if (logs && logs.length > 0) {
      console.log('📋 Sample logs:');
      logs.forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.action_type} at ${log.created_at}`);
      });
    } else {
      console.log('📋 No logs found (this is expected if no Zoom meetings have been started)');
    }

    // Test the complex query used by the admin panel
    console.log('\n🔍 Testing complex query used by admin panel...');
    
    const { data: complexData, error: complexError } = await supabase
      .from('zoom_session_logs')
      .select(`
        id,
        booking_id,
        action_type,
        user_agent,
        ip_address,
        created_at,
        coach:coach_id(id, full_name),
        athlete:athlete_id(id, full_name),
        bookings!inner(
          id,
          listings!inner(title),
          booking_requests!inner(proposed_start)
        )
      `)
      .limit(1);

    if (complexError) {
      console.error('❌ Complex query error:', complexError);
      console.log('This might be due to missing relationships or data');
    } else {
      console.log('✅ Complex query works fine');
      if (complexData && complexData.length > 0) {
        console.log('Sample complex data:', complexData[0]);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testZoomLogs();