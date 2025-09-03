#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseAvatar(email: string) {
  console.log(`🔍 Diagnosing avatar for email: ${email}`);
  console.log('=====================================\n');

  try {
    // 1. Find user by email in auth.users
    console.log('1. Looking up auth user...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;
    
    const user = authUsers.users.find(u => u.email === email);
    if (!user) {
      console.log('❌ No auth user found with that email');
      return;
    }
    
    console.log(`✅ Auth user found: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.created_at}`);
    console.log('');

    // 2. Check profiles table
    console.log('2. Checking profiles table...');
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id);
    
    if (profileError) {
      console.log('❌ Error querying profiles:', profileError.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('❌ No profile found in profiles table');
      return;
    }

    const profile = profiles[0];
    console.log(`✅ Profile found:`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Full name: ${profile.full_name}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Avatar URL: ${profile.avatar_url}`);
    console.log(`   Updated at: ${profile.updated_at}`);
    console.log('');

    // 3. Check coaches table if exists
    console.log('3. Checking coaches table...');
    const { data: coaches, error: coachError } = await supabase
      .from('coaches')
      .select('*')
      .eq('profile_id', user.id);
    
    if (coachError && !coachError.message.includes('does not exist')) {
      console.log('❌ Error querying coaches:', coachError.message);
    } else if (!coaches || coaches.length === 0) {
      console.log('ℹ️  No separate coaches table entry (using profiles directly)');
    } else {
      console.log(`✅ Coach entry found: ${coaches[0].id}`);
    }
    console.log('');

    // 4. Test avatar URL accessibility
    if (profile.avatar_url) {
      console.log('4. Testing avatar URL accessibility...');
      try {
        const response = await fetch(profile.avatar_url);
        console.log(`   HTTP Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        console.log(`   Content-Length: ${response.headers.get('content-length')}`);
        
        if (response.ok) {
          console.log('✅ Avatar URL is accessible');
        } else {
          console.log('❌ Avatar URL returned error status');
        }
      } catch (error) {
        console.log('❌ Error accessing avatar URL:', error);
      }
    } else {
      console.log('4. ❌ No avatar_url to test');
    }
    console.log('');

    // 5. Check storage bucket
    console.log('5. Checking Supabase Storage...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    if (bucketError) {
      console.log('❌ Error listing buckets:', bucketError.message);
    } else {
      console.log('✅ Available buckets:');
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
      });
    }

    // Check files in avatars bucket
    if (buckets?.some(b => b.name === 'avatars')) {
      console.log('');
      console.log('   Files in avatars bucket for this user:');
      const { data: files, error: filesError } = await supabase.storage
        .from('avatars')
        .list(user.id);
      
      if (filesError) {
        console.log(`   ❌ Error listing files: ${filesError.message}`);
      } else if (!files || files.length === 0) {
        console.log(`   ℹ️  No files found in avatars/${user.id}/`);
      } else {
        files.forEach(file => {
          console.log(`   ✅ ${file.name} (${file.metadata?.size} bytes, updated: ${file.updated_at})`);
        });
      }
    }

    console.log('\n=====================================');
    console.log('🎯 SUMMARY:');
    console.log(`   Auth ID: ${user.id}`);
    console.log(`   Profile exists: ${profile ? 'YES' : 'NO'}`);
    console.log(`   Avatar URL: ${profile.avatar_url || 'NONE'}`);
    console.log(`   Avatar accessible: ${profile.avatar_url ? 'CHECK ABOVE' : 'N/A'}`);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Get email from command line args
const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/diagnose-avatar.ts <email>');
  process.exit(1);
}

diagnoseAvatar(email);