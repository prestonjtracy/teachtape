import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logAdminAction, AuditActions, getTargetIdentifier } from '@/lib/auditLog'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { bookingId, tableType, action } = await request.json()
    
    if (!bookingId || !tableType || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (!['bookings', 'booking_requests'].includes(tableType)) {
      return NextResponse.json({ error: 'Invalid table type' }, { status: 400 })
    }
    
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

    const adminSupabase = createAdminClient()
    const tableName = tableType
    let updateData: any = {}

    // SECURITY: Validate that booking exists before performing any action (IDOR protection)
    const { data: booking, error: checkError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', bookingId)
      .single()

    if (checkError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    switch (action) {
      case 'cancel':
        // Cancel booking/request
        updateData = { 
          status: tableType === 'bookings' ? 'cancelled' : 'cancelled',
          ...(tableType === 'booking_requests' && { updated_at: new Date().toISOString() })
        }

        // Update the booking status
        const { error: cancelError } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', bookingId)

        if (cancelError) {
          console.error(`Failed to cancel ${tableType}:`, cancelError)
          return NextResponse.json({ error: `Failed to cancel booking` }, { status: 500 })
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.BOOKING_CANCELLED,
          targetType: 'booking',
          targetId: bookingId,
          targetIdentifier: `Booking ${bookingId.slice(0, 8)}`,
          details: {
            table_type: tableType,
            previous_status: booking?.status || 'unknown',
            new_status: 'cancelled',
            athlete_id: booking?.athlete_id || booking?.profile_id,
            coach_id: booking?.coach_id
          }
        })
        break

      case 'complete':
        // Mark booking as complete
        updateData = { 
          status: tableType === 'bookings' ? 'completed' : 'completed',
          ...(tableType === 'booking_requests' && { updated_at: new Date().toISOString() })
        }

        // Update the booking status
        const { error: completeError } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', bookingId)

        if (completeError) {
          console.error(`Failed to complete ${tableType}:`, completeError)
          return NextResponse.json({ error: `Failed to complete booking` }, { status: 500 })
        }

        // Log the action
        await logAdminAction(user.id, {
          action: AuditActions.BOOKING_COMPLETED,
          targetType: 'booking',
          targetId: bookingId,
          targetIdentifier: `Booking ${bookingId.slice(0, 8)}`,
          details: {
            table_type: tableType,
            previous_status: booking?.status || 'unknown',
            new_status: 'completed',
            athlete_id: booking?.athlete_id || booking?.profile_id,
            coach_id: booking?.coach_id
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin booking action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}