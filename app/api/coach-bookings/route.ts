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

    const supabase = await createClient();

    // SECURITY: Get coach profile to filter bookings
    const { data: coachProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!coachProfile) {
      return NextResponse.json({ error: "Coach profile not found" }, { status: 404 });
    }

    // Get bookings only for this authenticated coach
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
          duration_minutes,
          coach_id
        )
      `)
      .eq('listings.coach_id', coachProfile.id)
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
      listing: (booking.listings as any)?.[0] ? {
        title: (booking.listings as any)[0].title,
        duration_minutes: (booking.listings as any)[0].duration_minutes
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