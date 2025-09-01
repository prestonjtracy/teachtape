import { NextRequest } from "next/server";
import { createServerClient } from "@/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // For now, get all bookings (in production, you'd filter by authenticated coach)
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
        listings:listing_id (
          title,
          duration_minutes
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching bookings:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch bookings" }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Transform the data to match the expected format
    const transformedBookings = bookings?.map(booking => ({
      ...booking,
      listing: booking.listings ? {
        title: booking.listings.title,
        duration_minutes: booking.listings.duration_minutes
      } : null
    })) || [];

    return new Response(
      JSON.stringify({ bookings: transformedBookings }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Unexpected error fetching bookings:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}