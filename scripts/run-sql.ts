import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atjwhulpsbloxubpkjkl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0andodWxwc2Jsb3h1YnBramtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTEwMTg1MiwiZXhwIjoyMDcwNjc3ODUyfQ.dRYSxtnm2yyRM0nGchWOFQ5oPOglFT2syDZbmwGc97E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSQL() {
  try {
    console.log('🔧 Running database schema fixes...\n');

    // Add stripe_account_id column if it doesn't exist
    console.log('1. Adding stripe_account_id column...');
    const { error: alterError } = await supabase
      .from('coaches')
      .select('stripe_account_id')
      .limit(1);

    if (alterError && alterError.message.includes('column "stripe_account_id" does not exist')) {
      const { error: addColumnError } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE public.coaches ADD COLUMN stripe_account_id text;'
      });

      if (addColumnError) {
        console.error('❌ Failed to add column:', addColumnError);
      } else {
        console.log('✅ Added stripe_account_id column');
      }
    } else if (alterError) {
      console.error('❌ Error checking column:', alterError);
    } else {
      console.log('✅ stripe_account_id column already exists');
    }

    // Now test a manual Stripe account assignment to see if the problem is in the update logic
    console.log('\n2. Testing manual Stripe account assignment...');
    
    const testStripeAccountId = 'acct_test_manual_assignment';
    const coachId = 'a041dd61-b325-42f5-a0b8-66f1c26ead09'; // The correct coach ID from our debug
    
    const { error: updateError } = await supabase
      .from('coaches')
      .update({ stripe_account_id: testStripeAccountId })
      .eq('id', coachId);

    if (updateError) {
      console.error('❌ Failed to update coach record:', updateError);
    } else {
      console.log('✅ Successfully updated coach with test Stripe account');
      
      // Verify the update worked
      const { data: verifyData, error: verifyError } = await supabase
        .from('coaches')
        .select('stripe_account_id')
        .eq('id', coachId)
        .single();
        
      if (verifyError) {
        console.error('❌ Failed to verify update:', verifyError);
      } else {
        console.log('✅ Verified update:', verifyData);
        
        // Clean up test data
        const { error: cleanupError } = await supabase
          .from('coaches')
          .update({ stripe_account_id: null })
          .eq('id', coachId);
          
        if (cleanupError) {
          console.warn('⚠️ Failed to cleanup test data:', cleanupError);
        } else {
          console.log('✅ Cleaned up test data');
        }
      }
    }

  } catch (error) {
    console.error('❌ SQL execution failed:', error);
  }
}

runSQL();