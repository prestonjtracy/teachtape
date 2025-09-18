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

async function verifyAdminFix() {
  try {
    console.log('📋 Checking final admin status...');

    // Get all admin users
    const { data: adminUsers, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, email, auth_user_id')
      .eq('role', 'admin');

    if (error) {
      console.error('❌ Error fetching admins:', error);
      return;
    }

    console.log(`\n✅ Found ${adminUsers.length} admin user(s):`);
    
    for (const admin of adminUsers) {
      // Get auth email for verification
      const { data: authUser } = await supabase.auth.admin.getUserById(admin.auth_user_id);
      const authEmail = authUser.user?.email || 'N/A';
      
      console.log(`  - ${admin.full_name || 'No name'}`);
      console.log(`    Profile Email: ${admin.email || 'Not set'}`);
      console.log(`    Auth Email: ${authEmail}`);
      console.log(`    Profile ID: ${admin.id}`);
      console.log(`    Role: ${admin.role}`);
      console.log('');
    }

    // Check if Sarah Johnson still exists
    const { data: sarahProfile } = await supabase
      .from('profiles')
      .select('*')
      .ilike('full_name', '%sarah%johnson%')
      .single();

    if (sarahProfile) {
      console.log(`📝 Sarah Johnson profile status: ${sarahProfile.role} (ID: ${sarahProfile.id})`);
    } else {
      console.log('📝 Sarah Johnson profile: Not found (successfully removed)');
    }

    // Final verification
    if (adminUsers.length === 1 && 
        (adminUsers[0].email === 'preston.tracy@icloud.com' || 
         adminUsers[0].full_name === 'Preston Tracy')) {
      console.log('🎉 SUCCESS: Only Preston Tracy has admin privileges!');
    } else {
      console.log('⚠️  Warning: Admin setup may not be correct');
    }

  } catch (error) {
    console.error('❌ Verification error:', error);
  }
}

verifyAdminFix();