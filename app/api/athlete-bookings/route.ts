import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require authentication
    const { user, error: authError } = await requireAuth();
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: authError.status });
    }

    // SECURITY: Only allow users to see their own bookings
    // Get user's email from authenticated session
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const supabase = createClient();

    // Get bookings for authenticated user's email only
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
      .eq('customer_email', userEmail)
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