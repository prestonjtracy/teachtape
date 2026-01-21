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

    // Get coach's profile
    const { data: coachProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !coachProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (coachProfile.role !== 'coach') {
      return NextResponse.json({ error: "Not a coach" }, { status: 403 });
    }

    // Fetch all reviews for this coach
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        would_recommend,
        created_at,
        athlete:athlete_id (
          full_name
        )
      `)
      .eq('coach_id', coachProfile.id)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Failed to fetch reviews:', reviewsError);
      return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
    }

    // Calculate stats
    const totalReviews = reviews?.length || 0;
    const averageRating = totalReviews > 0
      ? reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
    const recommendationRate = totalReviews > 0
      ? (reviews!.filter(r => r.would_recommend !== false).length / totalReviews) * 100
      : 0;
    const fiveStarCount = reviews?.filter(r => r.rating === 5).length || 0;

    // Transform reviews for display
    const transformedReviews = (reviews || []).map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      would_recommend: review.would_recommend,
      created_at: review.created_at,
      athlete_name: (review.athlete as any)?.[0]?.full_name || 'Anonymous'
    }));

    return NextResponse.json({
      stats: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        recommendationRate: Math.round(recommendationRate),
        fiveStarCount
      },
      reviews: transformedReviews
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error fetching coach reviews:', error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}
