import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logAdminAction, AuditActions, getTargetIdentifier } from '@/lib/auditLog'
import { requireAdmin } from '@/lib/auth/server'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json()

    // Verify admin access
    const { user, error } = await requireAdmin()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const supabase = await createClient()

    // Use admin client for user management operations
    const adminSupabase = createAdminClient()

    // SECURITY: Validate that user exists before performing any action (IDOR protection)
    const { data: targetUserCheck, error: checkError } = await adminSupabase.auth.admin.getUserById(userId)

    if (checkError || !targetUserCheck.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    switch (action) {
      case 'promote':
        // SECURITY: Prevent admin from modifying their own role
        if (userId === user.id) {
          return NextResponse.json(
            { error: 'Cannot modify your own role' },
            { status: 403 }
          )
        }

        // SECURITY: Prevent modification of other admins
        const { data: targetProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('auth_user_id', userId)
          .single()

        if (targetProfile?.role === 'admin') {
          return NextResponse.json(
            { error: 'Cannot modify admin accounts' },
            { status: 403 }
          )
        }

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

      case 'disable':
        // SECURITY: Prevent admin from disabling themselves
        if (userId === user.id) {
          return NextResponse.json(
            { error: 'Cannot disable your own account' },
            { status: 403 }
          )
        }

        // SECURITY: Prevent disabling other admins
        const { data: disableTargetProfile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('auth_user_id', userId)
          .single()

        if (disableTargetProfile?.role === 'admin') {
          return NextResponse.json(
            { error: 'Cannot disable admin accounts' },
            { status: 403 }
          )
        }

        // Get user info for audit log
        const { data: disableTargetUser } = await adminSupabase.auth.admin.getUserById(userId)

        // Disable the user
        const { error: disableError } = await supabase
          .from('profiles')
          .update({ status: 'disabled' })
          .eq('auth_user_id', userId)

        if (disableError) {
          console.error('Error disabling user:', disableError)
          return NextResponse.json({ error: 'Failed to disable user' }, { status: 500 })
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.USER_SUSPENDED,
          targetType: 'user',
          targetId: userId,
          targetIdentifier: disableTargetUser?.user?.email || 'Unknown User',
          details: {
            previous_status: disableTargetProfile?.status || 'active',
            new_status: 'disabled'
          }
        })
        break

      case 'enable':
        // SECURITY: Prevent admin from enabling themselves
        if (userId === user.id) {
          return NextResponse.json(
            { error: 'Cannot enable your own account' },
            { status: 403 }
          )
        }

        // Get current status for audit log
        const { data: enableTargetProfile } = await supabase
          .from('profiles')
          .select('status')
          .eq('auth_user_id', userId)
          .single()

        // Get user info for audit log
        const { data: enableTargetUser } = await adminSupabase.auth.admin.getUserById(userId)

        // Enable the user
        const { error: enableError } = await supabase
          .from('profiles')
          .update({ status: 'active', deleted_at: null })
          .eq('auth_user_id', userId)

        if (enableError) {
          console.error('Error enabling user:', enableError)
          return NextResponse.json({ error: 'Failed to enable user' }, { status: 500 })
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.USER_UNSUSPENDED,
          targetType: 'user',
          targetId: userId,
          targetIdentifier: enableTargetUser?.user?.email || 'Unknown User',
          details: {
            previous_status: enableTargetProfile?.status || 'disabled',
            new_status: 'active'
          }
        })
        break

      case 'soft_delete':
        // SECURITY: Prevent admin from soft deleting themselves
        if (userId === user.id) {
          return NextResponse.json(
            { error: 'Cannot delete your own account' },
            { status: 403 }
          )
        }

        // SECURITY: Prevent soft deletion of other admins
        const { data: softDeleteTargetProfile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('auth_user_id', userId)
          .single()

        if (softDeleteTargetProfile?.role === 'admin') {
          return NextResponse.json(
            { error: 'Cannot delete admin accounts' },
            { status: 403 }
          )
        }

        // Get user info for audit log
        const { data: softDeleteTargetUser } = await adminSupabase.auth.admin.getUserById(userId)

        // Soft delete the user
        const { error: softDeleteError } = await supabase
          .from('profiles')
          .update({
            status: 'deleted',
            deleted_at: new Date().toISOString()
          })
          .eq('auth_user_id', userId)

        if (softDeleteError) {
          console.error('Error soft deleting user:', softDeleteError)
          return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.USER_DELETED,
          targetType: 'user',
          targetId: userId,
          targetIdentifier: softDeleteTargetUser?.user?.email || 'Unknown User',
          details: {
            previous_status: softDeleteTargetProfile?.status || 'active',
            new_status: 'deleted',
            deleted_at: new Date().toISOString(),
            soft_delete: true
          }
        })
        break

      case 'delete':
        // SECURITY: Prevent admin from deleting themselves
        if (userId === user.id) {
          return NextResponse.json(
            { error: 'Cannot delete your own account' },
            { status: 403 }
          )
        }

        // SECURITY: Prevent deletion of other admins
        const { data: deleteTargetProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('auth_user_id', userId)
          .single()

        if (deleteTargetProfile?.role === 'admin') {
          return NextResponse.json(
            { error: 'Cannot delete admin accounts' },
            { status: 403 }
          )
        }

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