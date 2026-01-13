import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({
        error: 'Profile not found',
        profileError
      }, { status: 404 })
    }

    // Get ALL bookings for this coach (not just film_review)
    const { data: allBookings, error: allBookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_type,
        review_status,
        status,
        film_url,
        athlete_notes,
        created_at,
        listing_id,
        listing:listings(id, title, listing_type, turnaround_hours)
      `)
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Get film review specific bookings
    const { data: filmReviewBookings, error: filmReviewError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_type,
        review_status,
        status,
        film_url,
        athlete_notes,
        customer_email,
        athlete_email,
        amount_paid_cents,
        created_at,
        listing:listings(title, turnaround_hours)
      `)
      .eq('booking_type', 'film_review')
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })

    // Get listings to check their types
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, listing_type, price_cents, is_active')
      .eq('coach_id', profile.id)

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile: { id: profile.id, role: profile.role, full_name: profile.full_name },
      allBookings: {
        count: allBookings?.length || 0,
        error: allBookingsError?.message || null,
        data: allBookings?.map(b => ({
          id: b.id,
          booking_type: b.booking_type,
          review_status: b.review_status,
          status: b.status,
          has_film_url: !!b.film_url,
          has_notes: !!b.athlete_notes,
          listing_type: (b.listing as any)?.listing_type,
          listing_title: (b.listing as any)?.title,
          created_at: b.created_at
        }))
      },
      filmReviewBookings: {
        count: filmReviewBookings?.length || 0,
        error: filmReviewError?.message || null,
        data: filmReviewBookings
      },
      listings: {
        count: listings?.length || 0,
        error: listingsError?.message || null,
        data: listings
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
