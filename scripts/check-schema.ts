import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atjwhulpsbloxubpkjkl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0andodWxwc2Jsb3h1YnBramtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTEwMTg1MiwiZXhwIjoyMDcwNjc3ODUyfQ.dRYSxtnm2yyRM0nGchWOFQ5oPOglFT2syDZbmwGc97E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  try {
    // Run the SQL to check if stripe_account_id column exists
    const { data, error } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = 'coaches' 
          AND table_schema = 'public'
          ORDER BY column_name;
        `
      });

    if (error) {
      console.error('❌ Error checking schema:', error);
      return;
    }

    console.log('📊 Coaches table schema:');
    console.table(data);

    // Check if stripe_account_id exists
    const hasStripeColumn = data?.some(col => col.column_name === 'stripe_account_id');
    console.log(`\n💳 Has stripe_account_id column: ${hasStripeColumn ? '✅ YES' : '❌ NO'}`);

    if (!hasStripeColumn) {
      console.log('\n🔧 Adding stripe_account_id column...');
      
      const { error: alterError } = await supabase
        .rpc('sql', {
          query: 'ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS stripe_account_id text;'
        });

      if (alterError) {
        console.error('❌ Failed to add column:', alterError);
      } else {
        console.log('✅ Column added successfully!');
      }
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkSchema();