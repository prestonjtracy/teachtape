/**
 * Settings service for TeachTape admin panel
 * Provides functions to read and update platform settings
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

export interface CommissionSettings {
  platform_fee_percentage: number
  athlete_service_fee_percent: number
  athlete_service_fee_flat_cents: number
}

export interface CommissionSettingsUpdate {
  platform_fee_percentage?: number
  athlete_service_fee_percent?: number
  athlete_service_fee_flat_cents?: number
}

// Validation schema for commission settings updates
export const CommissionSettingsUpdateSchema = z.object({
  platform_fee_percentage: z.number().min(0).max(30).optional(),
  athlete_service_fee_percent: z.number().min(0).max(30).optional(),
  athlete_service_fee_flat_cents: z.number().int().min(0).max(2000).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
})

/**
 * Get current commission settings with safe defaults
 * Uses admin client to bypass RLS - commission settings need to be read
 * during checkout for any user (athlete or coach)
 */
export async function getCommissionSettings(): Promise<CommissionSettings> {
  const supabase = createAdminClient()
  
  try {
    // Get commission-related settings
    const { data: settings, error } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'platform_fee_percentage',
        'athlete_service_fee_percentage', 
        'athlete_service_fee_flat_cents'
      ])

    if (error) {
      console.warn('Failed to fetch commission settings:', error)
      // Return safe defaults
      return {
        platform_fee_percentage: 10.0,
        athlete_service_fee_percent: 0.0,
        athlete_service_fee_flat_cents: 0
      }
    }

    // Transform to key-value map
    const settingsMap = settings?.reduce((acc: Record<string, any>, setting) => {
      acc[setting.setting_key] = parseFloat(setting.setting_value) || 0
      return acc
    }, {}) || {}

    return {
      platform_fee_percentage: settingsMap.platform_fee_percentage || 10.0,
      athlete_service_fee_percent: settingsMap.athlete_service_fee_percentage || 0.0,
      athlete_service_fee_flat_cents: settingsMap.athlete_service_fee_flat_cents || 0
    }
  } catch (error) {
    console.warn('Error fetching commission settings:', error)
    // Return safe defaults
    return {
      platform_fee_percentage: 10.0,
      athlete_service_fee_percent: 0.0,
      athlete_service_fee_flat_cents: 0
    }
  }
}

/**
 * Update commission settings with validation, clamping, and audit logging
 */
export async function updateCommissionSettings(
  input: CommissionSettingsUpdate,
  adminProfileId: string,
  adminEmail: string
): Promise<{ success: boolean; error?: string; old_values?: CommissionSettings; new_values?: CommissionSettings }> {
  const supabase = await createClient()

  try {
    // Validate input
    const validationResult = CommissionSettingsUpdateSchema.safeParse(input)
    if (!validationResult.success) {
      return {
        success: false,
        error: `Validation failed: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      }
    }

    // Clamp values to safe ranges
    const clampedInput: CommissionSettingsUpdate = {}
    if (input.platform_fee_percentage !== undefined) {
      clampedInput.platform_fee_percentage = Math.max(0, Math.min(30, input.platform_fee_percentage))
    }
    if (input.athlete_service_fee_percent !== undefined) {
      clampedInput.athlete_service_fee_percent = Math.max(0, Math.min(30, input.athlete_service_fee_percent))
    }
    if (input.athlete_service_fee_flat_cents !== undefined) {
      clampedInput.athlete_service_fee_flat_cents = Math.max(0, Math.min(2000, Math.floor(input.athlete_service_fee_flat_cents)))
    }

    // Get current values for audit log
    const oldValues = await getCommissionSettings()

    // Update each setting that was provided
    const updatePromises = Object.entries(clampedInput).map(async ([key, value]) => {
      // Map frontend field names to database field names
      const dbKey = key === 'athlete_service_fee_percent' ? 'athlete_service_fee_percentage' : key
      
      const { error } = await supabase
        .from('admin_settings')
        .update({
          setting_value: value.toString(),
          updated_at: new Date().toISOString(),
          updated_by: adminProfileId
        })
        .eq('setting_key', dbKey)

      if (error) {
        throw new Error(`Failed to update ${key}: ${error.message}`)
      }

      return { key, value }
    })

    await Promise.all(updatePromises)

    // Get new values for audit log
    const newValues = await getCommissionSettings()

    // Log the action (without IP/UA as requested)
    const { error: logError } = await supabase
      .rpc('log_admin_action', {
        p_admin_email: adminEmail,
        p_action: 'commission_settings.updated',
        p_target_type: 'settings',
        p_target_id: null,
        p_target_identifier: 'commission_settings',
        p_details: {
          old_values: oldValues,
          new_values: newValues
        },
        p_ip_address: null,
        p_user_agent: null
      })

    if (logError) {
      console.error('Failed to log commission settings update:', logError)
      // Don't fail the request if logging fails
    }

    return {
      success: true,
      old_values: oldValues,
      new_values: newValues
    }
  } catch (error) {
    console.error('Error updating commission settings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Admin auth helper - reusable for admin endpoints
 */
export async function verifyAdminAccess(): Promise<{
  success: boolean
  error?: string
  adminProfileId?: string
  adminEmail?: string
}> {
  const supabase = await createClient()

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return { success: false, error: 'Forbidden' }
    }

    return {
      success: true,
      adminProfileId: profile.id,
      adminEmail: user.email || 'unknown@admin'
    }
  } catch (error) {
    console.error('Admin verification error:', error)
    return { success: false, error: 'Internal server error' }
  }
}