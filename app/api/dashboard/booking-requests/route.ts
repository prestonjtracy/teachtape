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
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'coach') {
      return NextResponse.json({ error: 'Not a coach' }, { status: 403 })
    }

    // Fetch pending booking requests for this coach
    const { data: requests, error: requestsError } = await supabase
      .from('booking_requests')
      .select(`
        *,
        listing:listings!inner(
          id,
          title,
          price_cents,
          duration_minutes
        ),
        athlete:profiles!booking_requests_athlete_id_fkey(
          id,
          full_name,
          avatar_url
        ),
        coach:profiles!booking_requests_coach_id_fkey(
          id,
          full_name
        )
      `)
      .eq('coach_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (requestsError) {
      console.error('[Booking Requests API] Error:', requestsError)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    // Fetch last message for each request that has a conversation
    const requestsWithMessages = await Promise.all(
      (requests || []).map(async (request) => {
        if (!request.conversation_id) {
          return { ...request, last_message: null }
        }

        const { data: messages } = await supabase
          .from('messages')
          .select('body, created_at')
          .eq('conversation_id', request.conversation_id)
          .order('created_at', { ascending: false })
          .limit(1)

        return {
          ...request,
          last_message: messages && messages.length > 0 ? messages[0] : null,
        }
      })
    )

    return NextResponse.json({ requests: requestsWithMessages })

  } catch (error) {
    console.error('[Booking Requests API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
