import { NextRequest, NextResponse } from 'next/server'
import { 
  getCommissionSettings, 
  updateCommissionSettings, 
  verifyAdminAccess,
  CommissionSettingsUpdateSchema,
  type CommissionSettingsUpdate 
} from '@/lib/settingsService'

/**
 * GET /api/admin/commission-settings
 * Returns current commission settings
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authResult = await verifyAdminAccess()
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error }, 
        { status: authResult.error === 'Unauthorized' ? 401 : 403 }
      )
    }

    // Get current commission settings
    const settings = await getCommissionSettings()

    return NextResponse.json({
      success: true,
      data: settings
    })
  } catch (error) {
    console.error('Error fetching commission settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/commission-settings
 * Updates commission settings with validation and audit logging
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authResult = await verifyAdminAccess()
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error }, 
        { status: authResult.error === 'Unauthorized' ? 401 : 403 }
      )
    }

    // Parse request body
    let body: CommissionSettingsUpdate
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' }, 
        { status: 400 }
      )
    }

    // Validate request body
    const validationResult = CommissionSettingsUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }, 
        { status: 400 }
      )
    }

    // Update settings
    const updateResult = await updateCommissionSettings(
      validationResult.data,
      authResult.adminProfileId!,
      authResult.adminEmail!
    )

    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error }, 
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Commission settings updated successfully',
      data: {
        old_values: updateResult.old_values,
        new_values: updateResult.new_values
      }
    })
  } catch (error) {
    console.error('Error updating commission settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}