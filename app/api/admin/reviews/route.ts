import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logAdminAction, AuditActions } from '@/lib/auditLog'
import { requireAdmin } from '@/lib/auth/server'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { reviewId, action } = await request.json()

    // Verify admin access
    const { user, error } = await requireAdmin()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    // Use admin client for database operations (bypasses RLS after admin verification)
    const supabase = createAdminClient()
    const adminProfile = user.profile!

    // SECURITY: Validate that review exists before performing any action (IDOR protection)
    const { data: review, error: checkError } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        is_hidden,
        coach_id,
        athlete_id,
        booking_id,
        coach:coach_id (full_name),
        athlete:athlete_id (full_name)
      `)
      .eq('id', reviewId)
      .single()

    if (checkError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Extract names for audit log
    const coachName = (review.coach as any)?.[0]?.full_name || 'Unknown Coach'
    const athleteName = (review.athlete as any)?.[0]?.full_name || 'Unknown Athlete'
    const reviewIdentifier = `Review by ${athleteName} for ${coachName}`

    switch (action) {
      case 'hide':
        // Hide the review
        const { error: hideError } = await supabase
          .from('reviews')
          .update({
            is_hidden: true,
            hidden_at: new Date().toISOString(),
            hidden_by: adminProfile.id
          })
          .eq('id', reviewId)

        if (hideError) {
          console.error('Hide review error:', hideError)
          return NextResponse.json({ error: 'Failed to hide review: ' + hideError.message }, { status: 500 })
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.REVIEW_HIDDEN,
          targetType: 'review',
          targetId: reviewId,
          targetIdentifier: reviewIdentifier,
          details: {
            coach_id: review.coach_id,
            athlete_id: review.athlete_id,
            rating: review.rating,
            comment_preview: review.comment?.slice(0, 100) || null,
            hidden_at: new Date().toISOString()
          }
        })
        break

      case 'unhide':
        // Unhide the review
        const { error: unhideError } = await supabase
          .from('reviews')
          .update({
            is_hidden: false,
            hidden_at: null,
            hidden_by: null
          })
          .eq('id', reviewId)

        if (unhideError) {
          console.error('Unhide review error:', unhideError)
          return NextResponse.json({ error: 'Failed to unhide review: ' + unhideError.message }, { status: 500 })
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.REVIEW_UNHIDDEN,
          targetType: 'review',
          targetId: reviewId,
          targetIdentifier: reviewIdentifier,
          details: {
            coach_id: review.coach_id,
            athlete_id: review.athlete_id,
            rating: review.rating,
            previously_hidden_at: review.is_hidden ? 'was hidden' : 'was not hidden'
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin review action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
