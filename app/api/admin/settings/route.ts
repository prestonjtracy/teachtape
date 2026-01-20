import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { requireAdmin } from '@/lib/auth/server'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { settingId, settingKey, value, oldValue } = await request.json()

    if (!settingId || !settingKey) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Verify admin access
    const { user, error } = await requireAdmin()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    const profile = user.profile!

    // Get admin email for audit log
    const { data: authUser } = await adminSupabase.auth.admin.getUserById(user.id)
    const adminEmail = authUser?.user?.email || 'unknown@admin'

    // Get client IP and User Agent for audit log
    const headersList = headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIP = headersList.get('x-real-ip')
    const clientIP = forwardedFor?.split(',')[0] || realIP || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Update the setting
    const { error: updateError } = await supabase
      .from('admin_settings')
      .update({
        setting_value: value,
        updated_at: new Date().toISOString(),
        updated_by: profile.id
      })
      .eq('id', settingId)

    if (updateError) {
      console.error('Failed to update setting:', updateError)
      return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
    }

    // Log the action
    const { error: logError } = await supabase
      .rpc('log_admin_action', {
        p_admin_email: adminEmail,
        p_action: 'setting_updated',
        p_target_type: 'setting',
        p_target_id: settingId,
        p_target_identifier: settingKey,
        p_details: {
          old_value: oldValue,
          new_value: value,
          setting_key: settingKey
        },
        p_ip_address: clientIP,
        p_user_agent: userAgent
      })

    if (logError) {
      console.error('Failed to log admin action:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET endpoint to retrieve public settings for client-side use
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get public settings only
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value, setting_type')
      .eq('is_public', true)

    if (error) {
      console.error('Error fetching public settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Transform to key-value pairs
    const settingsMap = settings?.reduce((acc: Record<string, any>, setting) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {}) || {}

    return NextResponse.json({ settings: settingsMap })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}