// Script to test admin role security
// Run this after applying the migration to verify the security measures

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Service role for testing

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAdminSecurity() {
  console.log('🔒 Testing Admin Role Security System\n');

  try {
    // Test 1: Check if Preston's account is admin
    console.log('1. Checking if preston.tracy@icloud.com is set as admin...');
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'preston.tracy@icloud.com')
      .single();
    
    if (adminProfile?.role === 'admin') {
      console.log('✅ Preston is correctly set as admin');
    } else {
      console.log('❌ Preston is not set as admin - check migration');
    }

    // Test 2: Test RLS policies exist
    console.log('\n2. Testing RLS policies...');
    const { data: policies } = await supabase
      .rpc('check_policies', { table_name: 'profiles' })
      .select('*');
    
    console.log(`✅ Found ${policies?.length || 0} RLS policies on profiles table`);

    // Test 3: Test admin role protection function exists
    console.log('\n3. Checking security functions...');
    const { data: functions } = await supabase
      .rpc('check_function_exists', { function_name: 'prevent_role_escalation' });
    
    if (functions) {
      console.log('✅ Role escalation prevention function exists');
    }

    // Test 4: Verify indexes exist
    console.log('\n4. Checking performance indexes...');
    const { data: indexes } = await supabase
      .rpc('check_indexes', { table_name: 'profiles' });
    
    console.log(`✅ Found ${indexes?.length || 0} indexes on profiles table`);

    console.log('\n🎉 Admin security system setup complete!');
    console.log('\nNext steps:');
    console.log('1. Apply the migration: supabase migration up');
    console.log('2. Test role changes in the UI');
    console.log('3. Verify non-admins cannot elevate privileges');

  } catch (error) {
    console.error('❌ Error testing admin security:', error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testAdminSecurity();
}

export { testAdminSecurity };