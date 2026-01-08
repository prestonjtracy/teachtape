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

    // Get all listings for this coach
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, title, listing_type, turnaround_hours, price_cents, is_active, created_at')
      .eq('coach_id', profile.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile: { id: profile.id, role: profile.role },
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
