/**
 * Shared TypeScript types for settings
 */

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

export interface CommissionSettingsResponse {
  success: boolean
  data?: CommissionSettings
  error?: string
}

export interface CommissionSettingsUpdateResponse {
  success: boolean
  message?: string
  data?: {
    old_values: CommissionSettings
    new_values: CommissionSettings
  }
  error?: string
  details?: Array<{
    field: string
    message: string
  }>
}