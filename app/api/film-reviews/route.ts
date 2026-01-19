import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET() {
  try {
    console.log('🔍 [API /film-reviews] Starting...');

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('❌ [API /film-reviews] No user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('✅ [API /film-reviews] User authenticated:', user.email);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [API /film-reviews] Profile error:', profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Only coaches can access this
    if (profile.role !== 'coach') {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    console.log('✅ [API /film-reviews] Profile loaded:', profile.full_name);

    // Fetch film review bookings for this coach
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        *,
        listing:listings(title, turnaround_hours)
      `)
      .eq("booking_type", "film_review")
      .eq("coach_id", profile.id)
      .order("created_at", { ascending: false });

    if (bookingsError) {
      console.error('❌ [API /film-reviews] Bookings error:', bookingsError);
      return NextResponse.json({ error: "Failed to load film reviews" }, { status: 500 });
    }

    console.log('✅ [API /film-reviews] Loaded', bookings?.length || 0, 'film reviews');

    // Categorize bookings
    const pending = bookings?.filter((b) => b.review_status === "pending_acceptance") || [];
    const accepted = bookings?.filter((b) => b.review_status === "accepted") || [];
    const completed = bookings?.filter((b) => b.review_status === "completed") || [];
    const declined = bookings?.filter((b) => b.review_status === "declined") || [];

    return NextResponse.json({
      profile,
      bookings: bookings || [],
      categorized: {
        pending,
        accepted,
        completed,
        declined
      }
    });

  } catch (error) {
    console.error('❌ [API /film-reviews] Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
