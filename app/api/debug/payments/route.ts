import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const adminSupabase = createAdminClient()

  // Check bookings
  const { data: bookings, error: bookingsError } = await adminSupabase
    .from('bookings')
    .select(`
      id,
      stripe_session_id,
      amount_paid_cents,
      status,
      created_at,
      coach:coach_id(full_name),
      athlete:athlete_id(full_name),
      listing:listing_id(title)
    `)
    .gt('amount_paid_cents', 0)
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    bookings: {
      error: bookingsError,
      count: bookings?.length || 0,
      data: bookings
    }
  })
}
