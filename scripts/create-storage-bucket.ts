import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://atjwhulpsbloxubpkjkl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0andodWxwc2Jsb3h1YnBramtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTEwMTg1MiwiZXhwIjoyMDcwNjc3ODUyfQ.dRYSxtnm2yyRM0nGchWOFQ5oPOglFT2syDZbmwGc97E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createStorageBucket() {
  try {
    console.log('🗄️ Checking storage buckets...\n');

    // List all buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    console.log('📋 Existing buckets:');
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.id} (${bucket.public ? 'public' : 'private'})`);
    });

    // Check if coach-gallery bucket exists
    const coachGalleryBucket = buckets.find(b => b.id === 'coach-gallery');
    
    if (coachGalleryBucket) {
      console.log('✅ coach-gallery bucket already exists!');
      return;
    }

    console.log('\n🔧 Creating coach-gallery bucket...');
    
    // Create the bucket
    const { data: newBucket, error: createError } = await supabase.storage.createBucket('coach-gallery', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      return;
    }

    console.log('✅ Coach gallery bucket created successfully!', newBucket);

    // Test the bucket by trying to list files
    console.log('\n🧪 Testing bucket access...');
    const { data: files, error: testError } = await supabase.storage
      .from('coach-gallery')
      .list();

    if (testError) {
      console.error('❌ Error accessing new bucket:', testError);
    } else {
      console.log('✅ Bucket access test successful!');
      console.log(`📁 Files in bucket: ${files?.length || 0}`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createStorageBucket();