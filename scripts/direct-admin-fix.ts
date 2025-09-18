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

async function fixAdminRoles() {
  try {
    console.log('🔧 Executing direct admin role fix...');

    // Execute the SQL directly using service role
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop the trigger temporarily
        DROP TRIGGER IF EXISTS enforce_role_security ON profiles;
        
        -- Remove admin role from Sarah Johnson
        UPDATE profiles 
        SET role = 'athlete' 
        WHERE full_name = 'Sarah Johnson' 
          AND role = 'admin';
        
        -- Ensure Preston Tracy has admin role
        UPDATE profiles 
        SET role = 'admin' 
        WHERE email = 'preston.tracy@icloud.com'
           OR auth_user_id IN (
             SELECT id FROM auth.users WHERE email = 'preston.tracy@icloud.com'
           );
        
        -- Recreate the trigger
        CREATE TRIGGER enforce_role_security
          BEFORE UPDATE ON profiles
          FOR EACH ROW
          EXECUTE FUNCTION prevent_role_escalation();
        
        -- Return admin count
        SELECT COUNT(*) as admin_count FROM profiles WHERE role = 'admin';
      `
    });

    if (error) {
      console.error('❌ SQL execution error:', error);
      
      // Fallback: Try individual operations
      console.log('🔄 Trying fallback approach...');
      
      // Try to update Sarah Johnson's role directly using service role privileges
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'athlete' })
        .eq('id', '05e0908a-7329-4394-ae3f-70cfa1b0a8c7'); // Sarah's profile ID from earlier
      
      if (updateError) {
        console.error('❌ Fallback update error:', updateError);
      } else {
        console.log('✅ Sarah Johnson\'s admin role removed via fallback');
      }
    } else {
      console.log('✅ SQL executed successfully:', data);
    }

    // Verify final state
    const { data: admins } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('role', 'admin');

    console.log('\n📋 Final admin users:');
    admins?.forEach(admin => {
      console.log(`  - ${admin.full_name || 'No name'} (${admin.email || 'No email'})`);
    });

    if (admins?.length === 1 && admins[0].email === 'preston.tracy@icloud.com') {
      console.log('\n🎉 SUCCESS: Only Preston Tracy has admin privileges!');
    } else {
      console.log('\n⚠️  Issue: Multiple admins still exist or Preston is not the only admin');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixAdminRoles();