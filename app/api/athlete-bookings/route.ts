import { NextRequest } from "next/server";
import { createServerClient } from "@/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email parameter is required" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createServerClient();
    
    // Get bookings for this email with coach and listing details
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(`
        id,
        listing_id,
        customer_email,
        amount_paid_cents,
        status,
        starts_at,
        ends_at,
        created_at,
        coach:coach_id (
          full_name,
          avatar_url
        ),
        listings:listing_id (
          title,
          duration_minutes,
          description
        )
      `)
      .eq('customer_email', email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching athlete bookings:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch bookings" }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Transform the data to match the expected format
    const transformedBookings = bookings?.map(booking => ({
      ...booking,
      coach: (booking.coach as any)?.[0] ? {
        full_name: (booking.coach as any)[0].full_name,
        avatar_url: (booking.coach as any)[0].avatar_url
      } : null,
      listing: (booking.listings as any)?.[0] ? {
        title: (booking.listings as any)[0].title,
        duration_minutes: (booking.listings as any)[0].duration_minutes,
        description: (booking.listings as any)[0].description
      } : null
    })) || [];

    return new Response(
      JSON.stringify({ bookings: transformedBookings }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Unexpected error fetching athlete bookings:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}