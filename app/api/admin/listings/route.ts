import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logAdminAction, AuditActions, getTargetIdentifier } from '@/lib/auditLog'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { listingId, tableType, action } = await request.json()
    
    if (!listingId || !tableType || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    if (!['services', 'listings'].includes(tableType)) {
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
    const statusField = tableType === 'services' ? 'active' : 'is_active'
    const titleField = tableType === 'services' ? 'name' : 'title'

    // SECURITY: Validate that listing exists before performing any action (IDOR protection)
    const { data: listingCheck, error: checkError } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', listingId)
      .single()

    if (checkError || !listingCheck) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    switch (action) {
      case 'deactivate':
        // Get listing info for audit log
        const { data: listingToDeactivate } = await supabase
          .from(tableName)
          .select(titleField)
          .eq('id', listingId)
          .single()

        // Deactivate listing/service
        const { error: deactivateError } = await supabase
          .from(tableName)
          .update({ [statusField]: false })
          .eq('id', listingId)

        if (deactivateError) {
          console.error(`Failed to deactivate ${tableType}:`, deactivateError)
          return NextResponse.json({ error: `Failed to deactivate ${tableType}` }, { status: 500 })
        }

        // Log the action
        const deactivateTitle = (listingToDeactivate as any)?.[titleField] as string | undefined
        await logAdminAction(user.id, {
          action: AuditActions.LISTING_DEACTIVATED,
          targetType: 'listing',
          targetId: listingId,
          targetIdentifier: deactivateTitle || 'Unknown Listing',
          details: {
            table_type: tableType,
            previous_status: 'active',
            new_status: 'deactivated'
          }
        })
        break

      case 'activate':
        // Get listing info for audit log
        const { data: listingToActivate } = await supabase
          .from(tableName)
          .select(titleField)
          .eq('id', listingId)
          .single()

        // Activate listing/service
        const { error: activateError } = await supabase
          .from(tableName)
          .update({ [statusField]: true })
          .eq('id', listingId)

        if (activateError) {
          console.error(`Failed to activate ${tableType}:`, activateError)
          return NextResponse.json({ error: `Failed to activate ${tableType}` }, { status: 500 })
        }

        // Log the action
        const activateTitle = (listingToActivate as any)?.[titleField] as string | undefined
        await logAdminAction(user.id, {
          action: AuditActions.LISTING_ACTIVATED,
          targetType: 'listing',
          targetId: listingId,
          targetIdentifier: activateTitle || 'Unknown Listing',
          details: {
            table_type: tableType,
            previous_status: 'deactivated',
            new_status: 'active'
          }
        })
        break

      case 'delete':
        // Get listing info for audit log before deletion
        const { data: listingToDelete } = await supabase
          .from(tableName)
          .select(titleField)
          .eq('id', listingId)
          .single()

        // Delete listing/service
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .eq('id', listingId)

        if (deleteError) {
          console.error(`Failed to delete ${tableType}:`, deleteError)
          return NextResponse.json({ error: `Failed to delete ${tableType}` }, { status: 500 })
        }

        // Log the action
        const deleteTitle = (listingToDelete as any)?.[titleField] as string | undefined
        await logAdminAction(user.id, {
          action: AuditActions.LISTING_DELETED,
          targetType: 'listing',
          targetId: listingId,
          targetIdentifier: deleteTitle || 'Unknown Listing',
          details: {
            table_type: tableType,
            deleted_at: new Date().toISOString()
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin listing action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}