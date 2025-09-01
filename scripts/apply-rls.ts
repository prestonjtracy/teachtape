import { createClient } from "@/supabase/server";

async function applyRLS() {
  const supabase = createClient();
  
  console.log("🚀 Applying RLS policies...");
  
  try {
    // Note: These commands need to be run in the Supabase dashboard SQL editor
    // or via a direct PostgreSQL connection as they require elevated privileges
    
    console.log("⚠️  RLS policies need to be applied manually in Supabase dashboard:");
    console.log(`
-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to coach profiles
CREATE POLICY "public_coach_profiles_readable" 
ON public.profiles 
FOR SELECT 
USING (role = 'coach');

-- Enable RLS on listings table  
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active listings
CREATE POLICY "public_active_listings_readable"
ON public.listings
FOR SELECT
USING (is_active = true);

-- Enable RLS on bookings table (restrict to authenticated users only)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
    `);
    
    console.log("🔗 Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql");
    console.log("✅ Copy and run the SQL above in the SQL Editor");
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

applyRLS();