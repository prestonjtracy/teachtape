import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const CreateReviewSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID"),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().max(500, "Comment must be 500 characters or less").optional().nullable(),
});

export async function POST(req: NextRequest) {
  console.log(`🔍 [POST /api/reviews/create] Request received`);

  try {
    // SECURITY: Require authentication
    const { user, error: authError } = await requireAuth();
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: authError.status });
    }

    const supabase = createClient();

    // Get athlete's profile
    const { data: athleteProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !athleteProfile) {
      console.error('❌ [POST /api/reviews/create] Failed to get athlete profile:', profileError);
      return NextResponse.json({ error: "Failed to get user profile" }, { status: 500 });
    }

    // Parse and validate request body
    const body = await req.json();
    const validatedData = CreateReviewSchema.parse(body);

    console.log(`✅ [POST /api/reviews/create] Input validated:`, {
      booking_id: validatedData.booking_id,
      rating: validatedData.rating,
      athlete_id: athleteProfile.id
    });

    // Fetch the booking to validate ownership and status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, coach_id, athlete_id, customer_email, status, booking_type')
      .eq('id', validatedData.booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('❌ [POST /api/reviews/create] Booking not found:', bookingError);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    console.log(`📋 [POST /api/reviews/create] Booking found:`, {
      booking_id: booking.id,
      coach_id: booking.coach_id,
      athlete_id: booking.athlete_id,
      customer_email: booking.customer_email,
      user_email: user.email,
      status: booking.status,
      booking_type: booking.booking_type
    });

    // VALIDATION: Only live lessons can be reviewed (not film reviews)
    if (booking.booking_type !== 'live_lesson' && booking.booking_type !== null) {
      console.error('❌ [POST /api/reviews/create] Cannot review non-live lesson booking');
      return NextResponse.json({
        error: "Only live lesson bookings can be reviewed"
      }, { status: 400 });
    }

    // VALIDATION: Verify athlete owns this booking
    // Check both athlete_id (if set) and customer_email
    const isOwner =
      (booking.athlete_id && booking.athlete_id === athleteProfile.id) ||
      (booking.customer_email && booking.customer_email === user.email);

    if (!isOwner) {
      console.error('❌ [POST /api/reviews/create] User does not own this booking:', {
        booking_athlete_id: booking.athlete_id,
        user_profile_id: athleteProfile.id,
        booking_customer_email: booking.customer_email,
        user_email: user.email
      });
      return NextResponse.json({
        error: "You can only review your own bookings"
      }, { status: 403 });
    }

    // VALIDATION: Booking must be completed
    if (booking.status !== 'completed') {
      console.error('❌ [POST /api/reviews/create] Booking is not completed:', booking.status);
      return NextResponse.json({
        error: "You can only review completed bookings"
      }, { status: 400 });
    }

    // VALIDATION: Check if review already exists for this booking
    const { data: existingReview, error: checkError } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', validatedData.booking_id)
      .single();

    if (existingReview) {
      console.error('❌ [POST /api/reviews/create] Review already exists for this booking');
      return NextResponse.json({
        error: "You have already reviewed this booking"
      }, { status: 400 });
    }

    // Create the review
    const { data: review, error: createError } = await supabase
      .from('reviews')
      .insert({
        booking_id: validatedData.booking_id,
        coach_id: booking.coach_id,
        athlete_id: athleteProfile.id,
        rating: validatedData.rating,
        comment: validatedData.comment || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ [POST /api/reviews/create] Failed to create review:', createError);
      return NextResponse.json({
        error: "Failed to create review",
        details: createError.message
      }, { status: 500 });
    }

    console.log(`✅ [POST /api/reviews/create] Review created successfully:`, {
      review_id: review.id,
      booking_id: review.booking_id,
      coach_id: review.coach_id,
      rating: review.rating
    });

    return NextResponse.json({
      success: true,
      review
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ [POST /api/reviews/create] Validation error:`, error.errors);
      return NextResponse.json({
        error: "Invalid request data",
        details: error.errors
      }, { status: 400 });
    }

    console.error(`❌ [POST /api/reviews/create] Unexpected error:`, error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
