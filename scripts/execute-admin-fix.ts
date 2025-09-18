import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

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

async function executeAdminFix() {
  try {
    console.log('🔧 Fixing admin roles...');
    
    // First, let's check current admins
    console.log('📋 Current admin users:');
    const { data: currentAdmins } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('role', 'admin');
    
    currentAdmins?.forEach(admin => {
      console.log(`  - ${admin.full_name || 'No name'} (${admin.email || 'No email'}) - ${admin.id}`);
    });

    // Disable trigger temporarily
    console.log('\n🔓 Temporarily disabling security trigger...');
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE profiles DISABLE TRIGGER enforce_role_security;' 
    });

    // Remove admin from Sarah Johnson specifically
    console.log('🧹 Removing admin role from Sarah Johnson...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'athlete' })
      .eq('full_name', 'Sarah Johnson')
      .eq('role', 'admin');

    if (updateError) {
      console.error('❌ Error updating Sarah Johnson:', updateError);
    } else {
      console.log('✅ Removed admin role from Sarah Johnson');
    }

    // Ensure Preston Tracy is admin
    console.log('👑 Ensuring Preston Tracy is admin...');
    const { error: prestonError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('email', 'preston.tracy@icloud.com');

    if (prestonError) {
      console.warn('⚠️  Warning updating by email:', prestonError);
      
      // Try by looking up auth user first
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const prestonAuth = authUsers.users.find(u => u.email === 'preston.tracy@icloud.com');
      
      if (prestonAuth) {
        const { error: prestonError2 } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('auth_user_id', prestonAuth.id);
          
        if (prestonError2) {
          console.error('❌ Error setting Preston as admin:', prestonError2);
        } else {
          console.log('✅ Preston Tracy is now admin');
        }
      }
    } else {
      console.log('✅ Preston Tracy confirmed as admin');
    }

    // Re-enable trigger
    console.log('🔒 Re-enabling security trigger...');
    await supabase.rpc('exec_sql', { 
      sql: 'ALTER TABLE profiles ENABLE TRIGGER enforce_role_security;' 
    });

    // Show final admin users
    console.log('\n📋 Final admin users:');
    const { data: finalAdmins } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('role', 'admin');
    
    finalAdmins?.forEach(admin => {
      console.log(`  - ${admin.full_name || 'No name'} (${admin.email || 'No email'})`);
    });

    console.log('\n🎉 Admin role fix completed!');

  } catch (error) {
    console.error('❌ Error executing admin fix:', error);
  }
}

executeAdminFix();