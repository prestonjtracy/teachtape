/**
 * Audit logging utilities for TeachTape admin panel
 * Provides functions to log all administrative actions
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export interface AuditLogData {
  action: string
  targetType?: string
  targetId?: string
  targetIdentifier?: string
  details?: Record<string, any>
}

/**
 * Log an admin action to the audit logs table
 */
export async function logAdminAction(
  adminUserId: string,
  logData: AuditLogData
) {
  try {
    const supabase = createClient()
    const adminSupabase = createAdminClient()

    // Get admin email
    const { data: authUser } = await adminSupabase.auth.admin.getUserById(adminUserId)
    const adminEmail = authUser?.user?.email || 'unknown@admin'

    // Get client info
    const headersList = headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIP = headersList.get('x-real-ip')
    const clientIP = forwardedFor?.split(',')[0] || realIP || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Log the action using the database function
    const { error } = await supabase
      .rpc('log_admin_action', {
        p_admin_email: adminEmail,
        p_action: logData.action,
        p_target_type: logData.targetType || null,
        p_target_id: logData.targetId || null,
        p_target_identifier: logData.targetIdentifier || null,
        p_details: logData.details || null,
        p_ip_address: clientIP,
        p_user_agent: userAgent
      })

    if (error) {
      console.error('Failed to log admin action:', error)
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    console.error('Audit logging error:', error)
    return { success: false, error }
  }
}

/**
 * Common audit log actions
 */
export const AuditActions = {
  // User management
  USER_PROMOTED: 'user_promoted_to_coach',
  USER_DELETED: 'user_deleted',
  USER_SUSPENDED: 'user_suspended',
  USER_UNSUSPENDED: 'user_unsuspended',

  // Coach management
  COACH_VERIFIED: 'coach_verified',
  COACH_DEACTIVATED: 'coach_deactivated',
  COACH_ACTIVATED: 'coach_activated',
  COACH_DELETED: 'coach_deleted',

  // Listing management
  LISTING_DEACTIVATED: 'listing_deactivated',
  LISTING_ACTIVATED: 'listing_activated',
  LISTING_DELETED: 'listing_deleted',

  // Booking management
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_COMPLETED: 'booking_completed',

  // Payment management
  PAYOUT_RETRIED: 'payout_retried',
  PAYMENT_REFUNDED: 'payment_refunded',

  // Settings
  SETTING_UPDATED: 'setting_updated',

  // System
  MAINTENANCE_MODE_ENABLED: 'maintenance_mode_enabled',
  MAINTENANCE_MODE_DISABLED: 'maintenance_mode_disabled',
} as const

/**
 * Get human-readable target identifier for different entity types
 */
export function getTargetIdentifier(
  targetType: string,
  entityData: any
): string {
  switch (targetType) {
    case 'user':
    case 'athlete':
      return entityData.email || entityData.full_name || 'Unknown User'
    
    case 'coach':
      return entityData.full_name || entityData.email || 'Unknown Coach'
    
    case 'listing':
    case 'service':
      return entityData.title || 'Unknown Listing'
    
    case 'booking':
      return `Booking ${entityData.id?.slice(0, 8) || 'Unknown'}`
    
    case 'payment':
      return `Payment ${entityData.stripe_payment_intent_id?.slice(-8) || entityData.id?.slice(0, 8) || 'Unknown'}`
    
    case 'setting':
      return entityData.setting_key || entityData.display_name || 'Unknown Setting'
    
    default:
      return entityData.id?.slice(0, 8) || 'Unknown'
  }
}

/**
 * Middleware function to add audit logging to API routes
 */
export function withAuditLog(handler: Function, defaultAction: string) {
  return async (request: Request, context?: any) => {
    const startTime = Date.now()
    
    try {
      const result = await handler(request, context)
      
      // Only log successful actions (non-error responses)
      if (result instanceof Response && result.ok) {
        // Extract user ID from request context if available
        // This would need to be implemented based on your auth middleware
      }
      
      return result
    } catch (error) {
      // Log failed actions as well
      console.error(`Admin action failed: ${defaultAction}`, error)
      throw error
    }
  }
}