import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/user/delete
 *
 * Soft delete the current user's account
 * Sets status to 'deleted' and records deleted_at timestamp
 * Signs out the user after deletion
 */
export async function POST() {
  try {
    // Require authentication
    const { user, error } = await requireAuth()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const supabase = await createClient()

    // Check if user is an admin - admins cannot self-delete through this endpoint
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (profile?.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin accounts cannot be deleted through this endpoint' },
        { status: 403 }
      )
    }

    // Soft delete the user's profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString()
      })
      .eq('auth_user_id', user.id)

    if (updateError) {
      console.error('Error soft deleting user:', updateError)
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }

    // Sign out the user
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('User delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
