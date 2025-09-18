import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://atjwhulpsbloxubpkjkl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0andodWxwc2Jsb3h1YnBramtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTEwMTg1MiwiZXhwIjoyMDcwNjc3ODUyfQ.dRYSxtnm2yyRM0nGchWOFQ5oPOglFT2syDZbmwGc97E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runCoachGalleryMigration() {
  try {
    console.log('🔧 Running coach gallery migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/005_add_coach_gallery.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📏 Migration size:', migrationSQL.length, 'characters');

    // Execute the migration using the rpc function
    console.log('⚡ Executing migration...');
    
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } else {
      console.log('✅ Coach gallery migration completed successfully!');
      
      // Verify the table was created
      console.log('🔍 Verifying table creation...');
      const { data, error: verifyError } = await supabase
        .from('coach_gallery')
        .select('*')
        .limit(1);
      
      if (verifyError) {
        console.error('❌ Table verification failed:', verifyError);
        process.exit(1);
      } else {
        console.log('✅ Table verification successful!');
        console.log('🎉 Coach gallery is ready to use!');
      }
    }

  } catch (error) {
    console.error('❌ Migration execution failed:', error);
    process.exit(1);
  }
}

runCoachGalleryMigration();