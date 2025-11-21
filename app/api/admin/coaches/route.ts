import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logAdminAction, AuditActions } from '@/lib/auditLog'
import { requireAdmin } from '@/lib/auth/server'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { coachId, action } = await request.json()

    // Verify admin access
    const { user, error } = await requireAdmin()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const supabase = createClient()
    const profile = user.profile!

    // SECURITY: Validate that coach exists before performing any action (IDOR protection)
    const { data: coachExists, error: checkError } = await supabase
      .from('coaches')
      .select('id')
      .eq('id', coachId)
      .single()

    if (checkError || !coachExists) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    switch (action) {
      case 'verify':
        // Get coach info for audit log
        const { data: coachToVerify } = await supabase
          .from('coaches')
          .select('full_name, profile_id')
          .eq('id', coachId)
          .single()
        
        // Mark coach as verified
        const verifyUpdate: {
          is_public: boolean;
          verified_at: string;
          verified_by: string;
        } = {
          is_public: true,
          verified_at: new Date().toISOString(),
          verified_by: profile.id  // Use profile ID instead of auth user ID
        }
        
        const { error: verifyError } = await supabase
          .from('coaches')
          .update(verifyUpdate)
          .eq('id', coachId)

        if (verifyError) {
          // If verified_at/verified_by columns don't exist, try with just is_public
          const fallbackUpdate = { is_public: true }
          const { error: fallbackError } = await supabase
            .from('coaches')
            .update(fallbackUpdate)
            .eq('id', coachId)
          
          if (fallbackError) {
            return NextResponse.json({ error: 'Failed to verify coach' }, { status: 500 })
          }
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.COACH_VERIFIED,
          targetType: 'coach',
          targetId: coachId,
          targetIdentifier: coachToVerify?.full_name || 'Unknown Coach',
          details: {
            previous_status: 'unverified',
            new_status: 'verified'
          }
        })
        break

      case 'deactivate':
        // Get coach info for audit log
        const { data: coachToDeactivate } = await supabase
          .from('coaches')
          .select('full_name, profile_id')
          .eq('id', coachId)
          .single()

        // Deactivate coach
        const { error: deactivateError } = await supabase
          .from('coaches')
          .update({ is_public: false })
          .eq('id', coachId)

        if (deactivateError) {
          return NextResponse.json({ error: 'Failed to deactivate coach' }, { status: 500 })
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.COACH_DEACTIVATED,
          targetType: 'coach',
          targetId: coachId,
          targetIdentifier: coachToDeactivate?.full_name || 'Unknown Coach',
          details: {
            previous_status: 'active',
            new_status: 'deactivated'
          }
        })
        break

      case 'activate':
        // Get coach info for audit log
        const { data: coachToActivate } = await supabase
          .from('coaches')
          .select('full_name, profile_id')
          .eq('id', coachId)
          .single()

        // Activate coach
        const { error: activateError } = await supabase
          .from('coaches')
          .update({ is_public: true })
          .eq('id', coachId)

        if (activateError) {
          return NextResponse.json({ error: 'Failed to activate coach' }, { status: 500 })
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.COACH_ACTIVATED,
          targetType: 'coach',
          targetId: coachId,
          targetIdentifier: coachToActivate?.full_name || 'Unknown Coach',
          details: {
            previous_status: 'deactivated',
            new_status: 'active'
          }
        })
        break

      case 'delete':
        // First get the coach to find the profile_id and info for audit log
        const { data: coach, error: fetchError } = await supabase
          .from('coaches')
          .select('profile_id, full_name')
          .eq('id', coachId)
          .single()

        if (fetchError || !coach) {
          return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
        }

        // Delete the coach record (this will cascade delete services due to FK constraints)
        const { error: deleteCoachError } = await supabase
          .from('coaches')
          .delete()
          .eq('id', coachId)

        if (deleteCoachError) {
          return NextResponse.json({ error: 'Failed to delete coach' }, { status: 500 })
        }

        // Update the profile role back to 'athlete' instead of deleting the user
        const { error: updateRoleError } = await supabase
          .from('profiles')
          .update({ role: 'athlete' })
          .eq('id', coach.profile_id)

        if (updateRoleError) {
          console.error('Failed to update profile role:', updateRoleError)
          // Don't fail the request since the coach is already deleted
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.COACH_DELETED,
          targetType: 'coach',
          targetId: coachId,
          targetIdentifier: coach.full_name || 'Unknown Coach',
          details: {
            deleted_at: new Date().toISOString(),
            profile_reverted_to: 'athlete'
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin coach action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}