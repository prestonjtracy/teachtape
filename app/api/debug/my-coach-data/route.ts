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
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({
        error: 'Profile error',
        details: profileError,
        user_id: user.id
      }, { status: 500 })
    }

    // Get coach record
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('*')
      .eq('profile_id', profile.id)
      .maybeSingle()

    // Get services count
    const { data: services, error: servicesError } = coach ? await supabase
      .from('services')
      .select('id, title, price_cents, active')
      .eq('coach_id', coach.id)
      : { data: null, error: null }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      coach: coach,
      coachError: coachError,
      services: services,
      servicesCount: services?.length || 0
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}
