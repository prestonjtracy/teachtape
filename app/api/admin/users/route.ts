import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logAdminAction, AuditActions, getTargetIdentifier } from '@/lib/auditLog'

export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json()
    
    // Verify admin access
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin client for user management operations
    const adminSupabase = createAdminClient()

    switch (action) {
      case 'promote':
        // Get user info for audit log
        const { data: targetUser } = await adminSupabase.auth.admin.getUserById(userId)
        
        // Promote user to coach
        const { error: promoteError } = await supabase
          .from('profiles')
          .update({ role: 'coach' })
          .eq('auth_user_id', userId)

        if (promoteError) {
          return NextResponse.json({ error: 'Failed to promote user' }, { status: 500 })
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.USER_PROMOTED,
          targetType: 'user',
          targetId: userId,
          targetIdentifier: targetUser?.user?.email || 'Unknown User',
          details: {
            previous_role: 'athlete',
            new_role: 'coach'
          }
        })
        break

      case 'delete':
        // Get user info for audit log before deletion
        const { data: deleteTargetUser } = await adminSupabase.auth.admin.getUserById(userId)
        
        // First delete profile
        const { error: profileDeleteError } = await supabase
          .from('profiles')
          .delete()
          .eq('auth_user_id', userId)

        if (profileDeleteError) {
          console.error('Error deleting profile:', profileDeleteError)
          return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 })
        }

        // Then delete auth user using admin client (if user exists)
        if (deleteTargetUser?.user) {
          const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(userId)

          if (authDeleteError && authDeleteError.status !== 404) {
            // Ignore "user not found" errors since the profile was already deleted
            console.error('Error deleting auth user:', authDeleteError)
            return NextResponse.json({ error: 'Failed to delete user account' }, { status: 500 })
          }
        } else {
          console.log('Auth user not found, profile-only deletion completed')
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.USER_DELETED,
          targetType: 'user',
          targetId: userId,
          targetIdentifier: deleteTargetUser?.user?.email || 'Unknown User',
          details: {
            deleted_at: new Date().toISOString(),
            profile_deleted: true,
            auth_user_existed: !!deleteTargetUser?.user
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin user action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}