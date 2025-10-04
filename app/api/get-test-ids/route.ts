import { createServerClient } from "@/supabase/server";

export const dynamic = 'force-dynamic';

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = createServerClient();
    
    // Get a coach ID
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);
    
    if (profilesError) {
      throw profilesError;
    }
    
    // Get a listing ID
    const { data: listings, error: listingsError } = await supabase
      .from("listings")
      .select("id")
      .limit(1);
    
    if (listingsError) {
      throw listingsError;
    }
    
    const coachId = profiles?.[0]?.id;
    const listingId = listings?.[0]?.id;
    
    if (!coachId || !listingId) {
      return new Response(
        JSON.stringify({ 
          error: "No profiles or listings found. Please create some test data first.",
          profilesCount: profiles?.length || 0,
          listingsCount: listings?.length || 0
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        coach_id: coachId, 
        listing_id: listingId,
        profilesCount: profiles.length,
        listingsCount: listings.length
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error getting test IDs:", error);
    return new Response(
      JSON.stringify({ error: "Failed to get test IDs" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
