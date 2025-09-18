import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function manageAdminUsers() {
  try {
    console.log('🔍 Checking current admin users...');
    
    // Get all admin users
    const { data: adminProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role, auth_user_id')
      .eq('role', 'admin');

    if (profileError) {
      console.error('❌ Error fetching admin profiles:', profileError);
      return;
    }

    console.log(`Found ${adminProfiles.length} admin users:`);
    
    // Get auth details for each admin
    for (const profile of adminProfiles) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.auth_user_id);
      const email = authUser.user?.email || 'N/A';
      console.log(`- ${profile.full_name || 'No name'} (${email}) - Profile ID: ${profile.id}`);
    }

    // Find Preston Tracy's profile
    const prestonEmail = 'preston.tracy@icloud.com';
    console.log(`\n🎯 Looking for ${prestonEmail}...`);
    
    const { data: allUsers } = await supabase.auth.admin.listUsers();
    const prestonAuthUser = allUsers.users.find(user => user.email === prestonEmail);
    
    if (!prestonAuthUser) {
      console.error(`❌ Could not find user with email ${prestonEmail}`);
      return;
    }

    const { data: prestonProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', prestonAuthUser.id)
      .single();

    if (!prestonProfile) {
      console.error(`❌ Could not find profile for ${prestonEmail}`);
      return;
    }

    console.log(`✅ Found Preston's profile: ${prestonProfile.id} (current role: ${prestonProfile.role})`);

    // Set Preston as admin if not already
    if (prestonProfile.role !== 'admin') {
      console.log('🔧 Setting Preston as admin...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', prestonProfile.id);

      if (updateError) {
        console.error('❌ Error setting Preston as admin:', updateError);
        return;
      }
      console.log('✅ Preston is now an admin');
    } else {
      console.log('✅ Preston is already an admin');
    }

    // Remove admin from all other users
    console.log('\n🧹 Removing admin privileges from other users...');
    
    const otherAdmins = adminProfiles.filter(profile => profile.auth_user_id !== prestonAuthUser.id);
    
    for (const profile of otherAdmins) {
      const { data: authUser } = await supabase.auth.admin.getUserById(profile.auth_user_id);
      const email = authUser.user?.email || 'N/A';
      
      console.log(`🔧 Removing admin from ${profile.full_name || 'No name'} (${email})...`);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'athlete' }) // Change to athlete role
        .eq('id', profile.id);

      if (updateError) {
        console.error(`❌ Error updating ${email}:`, updateError);
      } else {
        console.log(`✅ Removed admin privileges from ${email}`);
      }
    }

    console.log('\n🎉 Admin privilege management complete!');
    console.log(`Only ${prestonEmail} should now have admin access.`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

manageAdminUsers();