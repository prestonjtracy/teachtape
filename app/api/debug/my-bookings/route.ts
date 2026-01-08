import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        status: "not_authenticated",
        error: authError?.message || "No user found"
      }, { status: 401 });
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({
        status: "no_profile",
        error: profileError?.message || "Profile not found"
      }, { status: 404 });
    }

    // Get all bookings for this coach
    const { data: coachBookings, error: coachBookingsError } = await supabase
      .from('bookings')
      .select('id, booking_type, review_status, status, created_at, coach_id, customer_email, athlete_email, film_url')
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Also get bookings where user is the customer (athlete)
    const { data: athleteBookings, error: athleteBookingsError } = await supabase
      .from('bookings')
      .select('id, booking_type, review_status, status, created_at, coach_id, customer_email, athlete_email, film_url')
      .eq('customer_email', user.email)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      status: "ok",
      user: {
        id: user.id,
        email: user.email
      },
      profile: {
        id: profile.id,
        role: profile.role,
        full_name: profile.full_name
      },
      coachBookings: {
        count: coachBookings?.length || 0,
        error: coachBookingsError?.message || null,
        data: coachBookings?.map(b => ({
          id: b.id,
          booking_type: b.booking_type,
          review_status: b.review_status,
          status: b.status,
          created_at: b.created_at,
          coach_id: b.coach_id,
          customer_email: b.customer_email,
          athlete_email: b.athlete_email,
          has_film_url: !!b.film_url
        })) || []
      },
      athleteBookings: {
        count: athleteBookings?.length || 0,
        error: athleteBookingsError?.message || null,
        data: athleteBookings?.map(b => ({
          id: b.id,
          booking_type: b.booking_type,
          review_status: b.review_status,
          status: b.status,
          created_at: b.created_at,
          coach_id: b.coach_id,
          customer_email: b.customer_email,
          athlete_email: b.athlete_email,
          has_film_url: !!b.film_url
        })) || []
      }
    });

  } catch (error) {
    console.error(`[Debug My Bookings] Error:`, error);
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
