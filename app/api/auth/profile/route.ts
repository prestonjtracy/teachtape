import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

// GET the current user's profile - uses server-side auth which bypasses client RLS issues
export async function GET() {
  try {
    const supabase = createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ profile: null }, { status: 200 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, auth_user_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError) {
      console.error('[API /auth/profile] Profile error:', profileError)
      // Return null profile instead of error - let client handle missing profile
      return NextResponse.json({
        profile: null,
        error: profileError.code === 'PGRST116' ? 'Profile not found' : profileError.message
      }, { status: 200 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[API /auth/profile] Error:', error)
    return NextResponse.json({
      profile: null,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
