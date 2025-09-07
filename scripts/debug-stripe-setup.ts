import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atjwhulpsbloxubpkjkl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0andodWxwc2Jsb3h1YnBramtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTEwMTg1MiwiZXhwIjoyMDcwNjc3ODUyfQ.dRYSxtnm2yyRM0nGchWOFQ5oPOglFT2syDZbmwGc97E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugStripeSetup() {
  try {
    console.log('🔍 Debugging Stripe setup issue...\n');

    // Get all profiles with role 'coach'
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, auth_user_id, full_name, role')
      .eq('role', 'coach');

    if (profileError) {
      console.error('❌ Error fetching profiles:', profileError);
      return;
    }

    console.log('👥 Coach profiles:');
    profiles?.forEach(profile => {
      console.log(`  - ID: ${profile.id}, Auth ID: ${profile.auth_user_id}, Name: ${profile.full_name}`);
    });

    console.log('\n');

    // Get all coaches records
    const { data: coaches, error: coachError } = await supabase
      .from('coaches')
      .select('id, profile_id, stripe_account_id');

    if (coachError) {
      console.error('❌ Error fetching coaches:', coachError);
      return;
    }

    console.log('🏃‍♂️ Coach records:');
    coaches?.forEach(coach => {
      console.log(`  - Coach ID: ${coach.id}, Profile ID: ${coach.profile_id}, Stripe Account: ${coach.stripe_account_id || 'NULL'}`);
    });

    console.log('\n');

    // Get the specific profile ID from booking request (from logs)
    const bookingProfileId = 'f9befde2-6297-4dfa-85d0-2b7f6e200ffd';
    
    console.log(`🔍 Looking for coach record for profile ID: ${bookingProfileId}`);
    
    const { data: specificCoach, error: specificError } = await supabase
      .from('coaches')
      .select('*')
      .eq('profile_id', bookingProfileId)
      .single();

    if (specificError) {
      console.error('❌ No coach record found for booking profile ID:', specificError);
      
      // Check if this profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', bookingProfileId)
        .single();
        
      if (profile) {
        console.log('✅ Profile exists but no coach record. Creating coach record...');
        
        // Create coach record for this profile
        const { data: newCoach, error: createError } = await supabase
          .from('coaches')
          .insert({
            profile_id: bookingProfileId,
            is_public: true
          })
          .select('*')
          .single();
          
        if (createError) {
          console.error('❌ Failed to create coach record:', createError);
        } else {
          console.log('✅ Created coach record:', newCoach);
        }
      }
    } else {
      console.log('✅ Found specific coach record:', specificCoach);
    }

    // Find coaches with Stripe accounts
    const coachesWithStripe = coaches?.filter(coach => coach.stripe_account_id) || [];
    console.log(`\n💳 Coaches with Stripe accounts: ${coachesWithStripe.length}`);
    
    coachesWithStripe.forEach(coach => {
      console.log(`  - Coach ${coach.id} (Profile: ${coach.profile_id}) -> ${coach.stripe_account_id}`);
    });

    // If there's a Stripe account but wrong profile mapping, suggest a fix
    if (coachesWithStripe.length > 0 && !specificCoach?.stripe_account_id) {
      const stripeCoach = coachesWithStripe[0];
      console.log(`\n🔧 POTENTIAL FIX: Move Stripe account ${stripeCoach.stripe_account_id} from coach ${stripeCoach.id} to the coach record for profile ${bookingProfileId}`);
      
      // Let's check if we should do this automatically
      const { data: bookingProfile } = await supabase
        .from('profiles')
        .select('auth_user_id, full_name')
        .eq('id', bookingProfileId)
        .single();
        
      const { data: stripeProfile } = await supabase
        .from('profiles')
        .select('auth_user_id, full_name')
        .eq('id', stripeCoach.profile_id)
        .single();
        
      console.log('Booking profile:', bookingProfile);
      console.log('Stripe account profile:', stripeProfile);
      
      if (bookingProfile?.auth_user_id === stripeProfile?.auth_user_id) {
        console.log('✅ Same user! These are duplicate coach records. Fixing...');
        
        // Update the coach record with the correct profile ID
        const { error: updateError } = await supabase
          .from('coaches')
          .update({ profile_id: bookingProfileId })
          .eq('id', stripeCoach.id);
          
        if (updateError) {
          console.error('❌ Failed to update coach record:', updateError);
        } else {
          console.log('✅ Successfully moved Stripe account to correct coach record!');
        }
      }
    }

  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

debugStripeSetup();