import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient()

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
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'coach') {
      return NextResponse.json({ error: 'Not a coach' }, { status: 403 })
    }

    // Get coach record
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('id, stripe_account_id')
      .eq('profile_id', profile.id)
      .single()

    // Fetch bookings for this coach
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        created_at,
        customer_email,
        amount_paid_cents,
        status,
        listing_id,
        stripe_session_id,
        starts_at,
        ends_at,
        listing:listings(title)
      `)
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })

    if (bookingsError) {
      console.error('[Coach Data API] Bookings error:', bookingsError)
    }

    // Calculate earnings
    const bookings = bookingsData || []
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const paidBookings = bookings.filter((b: any) => b.status === 'paid')

    const earnings = {
      last7Days: paidBookings
        .filter((b: any) => new Date(b.created_at) >= sevenDaysAgo)
        .reduce((sum: number, b: any) => sum + (b.amount_paid_cents || 0), 0),
      monthToDate: paidBookings
        .filter((b: any) => new Date(b.created_at) >= monthStart)
        .reduce((sum: number, b: any) => sum + (b.amount_paid_cents || 0), 0),
      allTime: paidBookings
        .reduce((sum: number, b: any) => sum + (b.amount_paid_cents || 0), 0)
    }

    return NextResponse.json({
      coach: {
        id: coach?.id || profile.id,
        profile_id: profile.id,
        full_name: profile.full_name,
        stripe_account_id: coach?.stripe_account_id || null
      },
      bookings,
      earnings
    })

  } catch (error) {
    console.error('[Coach Data API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
