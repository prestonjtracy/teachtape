import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atjwhulpsbloxubpkjkl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0andodWxwc2Jsb3h1YnBramtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTEwMTg1MiwiZXhwIjoyMDcwNjc3ODUyfQ.dRYSxtnm2yyRM0nGchWOFQ5oPOglFT2syDZbmwGc97E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createCoachGalleryTable() {
  try {
    console.log('🔧 Creating coach gallery table...\n');

    // First, let's check if the table already exists
    console.log('🔍 Checking if coach_gallery table exists...');
    const { data: existingTable, error: checkError } = await supabase
      .from('coach_gallery')
      .select('*')
      .limit(1);

    if (!checkError) {
      console.log('✅ Table already exists! No need to create it.');
      return;
    }

    if (checkError.code !== 'PGRST205') {
      console.error('❌ Unexpected error checking table:', checkError);
      return;
    }

    console.log('📝 Table does not exist, creating it manually...');
    
    // Create the table using a direct insert approach
    // Since we can't execute raw SQL, we'll need to use the Supabase dashboard
    console.log('⚠️ Unable to create table programmatically without raw SQL access.');
    console.log('📋 Please create the table manually in Supabase dashboard with this structure:');
    console.log(`
    CREATE TABLE public.coach_gallery (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      image_url text NOT NULL,
      caption text,
      position integer NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT coach_gallery_position_positive CHECK (position >= 0)
    );

    CREATE INDEX coach_gallery_coach_id_position_idx ON public.coach_gallery(coach_id, position);
    CREATE INDEX coach_gallery_coach_id_created_at_idx ON public.coach_gallery(coach_id, created_at DESC);

    -- Enable RLS
    ALTER TABLE public.coach_gallery ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    CREATE POLICY "Coach gallery images are publicly viewable" ON public.coach_gallery FOR SELECT USING (true);
    CREATE POLICY "Coaches can add to their own gallery" ON public.coach_gallery FOR INSERT WITH CHECK (coach_id = auth.uid());
    CREATE POLICY "Coaches can update their own gallery" ON public.coach_gallery FOR UPDATE USING (coach_id = auth.uid());
    CREATE POLICY "Coaches can delete from their own gallery" ON public.coach_gallery FOR DELETE USING (coach_id = auth.uid());
    `);

    console.log('\n🌐 Or go to: https://supabase.com/dashboard/project/atjwhulpsbloxubpkjkl/editor');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createCoachGalleryTable();