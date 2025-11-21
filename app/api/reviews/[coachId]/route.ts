import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

const UuidSchema = z.string().uuid("Invalid coach ID format");

export async function GET(
  req: NextRequest,
  { params }: { params: { coachId: string } }
) {
  console.log(`🔍 [GET /api/reviews/${params.coachId}] Request received`);

  try {
    // Validate coach ID format
    const validCoachId = UuidSchema.parse(params.coachId);

    const supabase = createClient();

    // Fetch reviews for this coach with athlete info
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        booking_id,
        coach_id,
        athlete_id,
        rating,
        comment,
        created_at,
        athlete:athlete_id (
          full_name
        )
      `)
      .eq('coach_id', validCoachId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsError) {
      console.error('❌ [GET /api/reviews] Failed to fetch reviews:', reviewsError);
      return NextResponse.json({
        error: "Failed to fetch reviews",
        details: reviewsError.message
      }, { status: 500 });
    }

    // Transform the data to match expected format
    const transformedReviews = (reviews || []).map(review => ({
      id: review.id,
      booking_id: review.booking_id,
      coach_id: review.coach_id,
      athlete_id: review.athlete_id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      athlete: {
        full_name: (review.athlete as any)?.[0]?.full_name || null
      }
    }));

    // Calculate average rating
    const totalReviews = transformedReviews.length;
    const averageRating = totalReviews > 0
      ? transformedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    console.log(`✅ [GET /api/reviews] Successfully fetched ${totalReviews} reviews, avg: ${averageRating.toFixed(1)}`);

    return NextResponse.json({
      reviews: transformedReviews,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews
    }, { status: 200 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ [GET /api/reviews] Validation error:`, error.errors);
      return NextResponse.json({
        error: "Invalid coach ID format",
        details: error.errors
      }, { status: 400 });
    }

    console.error(`❌ [GET /api/reviews] Unexpected error:`, error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
