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

    const supabase = await createClient();

    // Fetch visible reviews for this coach with athlete info
    // Filter out hidden reviews for public display
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        booking_id,
        coach_id,
        athlete_id,
        rating,
        comment,
        would_recommend,
        created_at,
        athlete:athlete_id (
          full_name
        )
      `)
      .eq('coach_id', validCoachId)
      .or('is_hidden.is.null,is_hidden.eq.false') // Filter out hidden reviews
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsError) {
      console.error('❌ [GET /api/reviews] Failed to fetch reviews:', reviewsError);
      return NextResponse.json({
        error: "Failed to fetch reviews",
        details: reviewsError.message
      }, { status: 500 });
    }

    // Get booking IDs to fetch service/listing titles
    const bookingIds = (reviews || [])
      .filter(r => r.booking_id)
      .map(r => r.booking_id);

    // Fetch bookings with listing info
    let bookingToListing = new Map<string, string>();
    let listingTitles = new Map<string, string>();

    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, listing_id')
        .in('id', bookingIds);

      const listingIds = (bookings || [])
        .filter(b => b.listing_id)
        .map(b => b.listing_id);

      if (listingIds.length > 0) {
        const { data: listings } = await supabase
          .from('listings')
          .select('id, title')
          .in('id', listingIds as string[]);

        listingTitles = new Map((listings || []).map(l => [l.id, l.title]));
      }

      bookingToListing = new Map((bookings || []).map(b => [b.id, b.listing_id]));
    }

    // Transform the data to match expected format
    const transformedReviews = (reviews || []).map(review => {
      const listingId = bookingToListing.get(review.booking_id);
      const serviceTitle = listingId ? listingTitles.get(listingId) : null;

      return {
        id: review.id,
        booking_id: review.booking_id,
        coach_id: review.coach_id,
        athlete_id: review.athlete_id,
        rating: review.rating,
        comment: review.comment,
        would_recommend: review.would_recommend,
        created_at: review.created_at,
        athlete: {
          full_name: (review.athlete as any)?.[0]?.full_name || null
        },
        service_title: serviceTitle || null
      };
    });

    // Calculate average rating
    const totalReviews = transformedReviews.length;
    const averageRating = totalReviews > 0
      ? transformedReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
      : 0;

    // Calculate recommendation rate
    const reviewsWithRecommendation = transformedReviews.filter(r => r.would_recommend !== null);
    const recommendationRate = reviewsWithRecommendation.length > 0
      ? (reviewsWithRecommendation.filter(r => r.would_recommend).length / reviewsWithRecommendation.length) * 100
      : 0;

    console.log(`✅ [GET /api/reviews] Successfully fetched ${totalReviews} reviews, avg: ${averageRating.toFixed(1)}`);

    return NextResponse.json({
      reviews: transformedReviews,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews,
      recommendationRate: Math.round(recommendationRate)
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
