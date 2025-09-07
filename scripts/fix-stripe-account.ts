import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atjwhulpsbloxubpkjkl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0andodWxwc2Jsb3h1YnBramtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTEwMTg1MiwiZXhwIjoyMDcwNjc3ODUyfQ.dRYSxtnm2yyRM0nGchWOFQ5oPOglFT2syDZbmwGc97E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStripeAccount() {
  try {
    console.log('🔧 Fixing Stripe account assignment...\n');

    // From the server logs, we know these Stripe accounts were created:
    // - acct_1S4lyAAWbPNyO58g (the one that completed onboarding)
    // - acct_1S4lyDAD66VINFTF  
    // - acct_1S4lyFAcIwHF1WJt
    
    // Use the first one that completed onboarding
    const completedStripeAccount = 'acct_1S4lyAAWbPNyO58g';
    const coachId = 'a041dd61-b325-42f5-a0b8-66f1c26ead09';
    const profileId = 'f9befde2-6297-4dfa-85d0-2b7f6e200ffd';
    
    console.log(`Assigning Stripe account ${completedStripeAccount} to coach ${coachId}...`);
    
    const { error: updateError } = await supabase
      .from('coaches')
      .update({ stripe_account_id: completedStripeAccount })
      .eq('id', coachId);

    if (updateError) {
      console.error('❌ Failed to assign Stripe account:', updateError);
      return;
    }

    console.log('✅ Successfully assigned Stripe account!');
    
    // Verify the assignment
    const { data: verifyData, error: verifyError } = await supabase
      .from('coaches')
      .select('id, profile_id, stripe_account_id')
      .eq('id', coachId)
      .single();
      
    if (verifyError) {
      console.error('❌ Failed to verify assignment:', verifyError);
    } else {
      console.log('✅ Verified assignment:');
      console.log(`  Coach ID: ${verifyData.id}`);
      console.log(`  Profile ID: ${verifyData.profile_id}`);
      console.log(`  Stripe Account: ${verifyData.stripe_account_id}`);
    }
    
    console.log('\n🎉 Stripe setup is now complete! You should be able to accept bookings.');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixStripeAccount();