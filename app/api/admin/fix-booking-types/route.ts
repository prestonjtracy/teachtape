import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

// POST to fix booking types based on listing type
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Find all bookings where the listing is a film_review but booking_type is wrong
    const { data: bookingsToFix, error: findError } = await adminSupabase
      .from('bookings')
      .select(`
        id,
        booking_type,
        review_status,
        listing_id,
        listing:listings(id, listing_type, title)
      `)
      .eq('booking_type', 'live_lesson');

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    // Filter to only bookings where listing is film_review
    const bookingsNeedingFix = bookingsToFix?.filter(
      (b: any) => b.listing?.listing_type === 'film_review'
    ) || [];

    if (bookingsNeedingFix.length === 0) {
      return NextResponse.json({
        message: "No bookings need fixing",
        checked: bookingsToFix?.length || 0
      });
    }

    // Update each booking
    const results = [];
    for (const booking of bookingsNeedingFix) {
      const { error: updateError } = await adminSupabase
        .from('bookings')
        .update({
          booking_type: 'film_review',
          // If review_status is null or pending, set to pending_acceptance
          review_status: booking.review_status || 'pending_acceptance'
        })
        .eq('id', booking.id);

      results.push({
        id: booking.id,
        listing_title: (booking as any).listing?.title,
        success: !updateError,
        error: updateError?.message
      });
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      message: `Fixed ${successCount} of ${bookingsNeedingFix.length} bookings`,
      results
    });

  } catch (error) {
    console.error("Fix booking types error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// GET to preview what would be fixed
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();

    // Verify user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient();

    // Find all bookings where the listing is a film_review but booking_type is wrong
    const { data: bookingsToFix, error: findError } = await adminSupabase
      .from('bookings')
      .select(`
        id,
        booking_type,
        review_status,
        listing_id,
        customer_email,
        created_at,
        listing:listings(id, listing_type, title)
      `)
      .eq('booking_type', 'live_lesson');

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    // Filter to only bookings where listing is film_review
    const bookingsNeedingFix = bookingsToFix?.filter(
      (b: any) => b.listing?.listing_type === 'film_review'
    ) || [];

    return NextResponse.json({
      message: `Found ${bookingsNeedingFix.length} bookings that need fixing`,
      totalLiveLessonBookings: bookingsToFix?.length || 0,
      bookingsNeedingFix: bookingsNeedingFix.map((b: any) => ({
        id: b.id,
        current_booking_type: b.booking_type,
        listing_type: b.listing?.listing_type,
        listing_title: b.listing?.title,
        customer_email: b.customer_email,
        created_at: b.created_at
      }))
    });

  } catch (error) {
    console.error("Preview fix error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
