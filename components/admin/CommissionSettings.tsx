'use client'

import { useState, useEffect } from 'react'
import type { CommissionSettings, CommissionSettingsUpdate } from '@/types/settings'

interface CommissionSettingsProps {
  onUpdate?: () => void
}

export default function CommissionSettings({ onUpdate }: CommissionSettingsProps) {
  const [settings, setSettings] = useState<CommissionSettings | null>(null)
  const [formData, setFormData] = useState<CommissionSettingsUpdate>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load current settings
  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/commission-settings')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch settings')
      }
      
      setSettings(data.data)
      setFormData({
        platform_fee_percentage: data.data.platform_fee_percentage,
        athlete_service_fee_percent: data.data.athlete_service_fee_percent,
        athlete_service_fee_flat_cents: data.data.athlete_service_fee_flat_cents
      })
    } catch (err) {
      console.error('Error fetching commission settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof CommissionSettingsUpdate, value: number) => {
    // Client-side clamping
    let clampedValue = value
    if (field === 'platform_fee_percentage' || field === 'athlete_service_fee_percent') {
      clampedValue = Math.max(0, Math.min(30, value))
    } else if (field === 'athlete_service_fee_flat_cents') {
      clampedValue = Math.max(0, Math.min(2000, Math.floor(value)))
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: clampedValue
    }))
    setError(null)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Only send changed fields
      const changedFields: CommissionSettingsUpdate = {}
      if (settings) {
        if (formData.platform_fee_percentage !== settings.platform_fee_percentage) {
          changedFields.platform_fee_percentage = formData.platform_fee_percentage
        }
        if (formData.athlete_service_fee_percent !== settings.athlete_service_fee_percent) {
          changedFields.athlete_service_fee_percent = formData.athlete_service_fee_percent
        }
        if (formData.athlete_service_fee_flat_cents !== settings.athlete_service_fee_flat_cents) {
          changedFields.athlete_service_fee_flat_cents = formData.athlete_service_fee_flat_cents
        }
      }

      if (Object.keys(changedFields).length === 0) {
        setError('No changes to save')
        return
      }

      const response = await fetch('/api/admin/commission-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changedFields)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Request failed: ${response.status}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Update failed')
      }

      // Update local state with new values
      setSettings(data.data.new_values)
      setFormData({
        platform_fee_percentage: data.data.new_values.platform_fee_percentage,
        athlete_service_fee_percent: data.data.new_values.athlete_service_fee_percent,
        athlete_service_fee_flat_cents: data.data.new_values.athlete_service_fee_flat_cents
      })

      setSuccess(true)
      onUpdate?.()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error updating commission settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  // Calculate example for $100 booking
  const calculateExample = () => {
    if (!formData.platform_fee_percentage && !formData.athlete_service_fee_percent && !formData.athlete_service_fee_flat_cents) {
      return null
    }

    const baseAmount = 10000 // $100 in cents
    const platformCut = Math.round(baseAmount * ((formData.platform_fee_percentage || 0) / 100))
    const athleteFeePercent = Math.round(baseAmount * ((formData.athlete_service_fee_percent || 0) / 100))
    const athleteFeeFlat = formData.athlete_service_fee_flat_cents || 0
    const totalAthleteFee = athleteFeePercent + athleteFeeFlat
    const totalChargedToAthlete = baseAmount + totalAthleteFee
    const coachReceives = baseAmount - platformCut

    return {
      baseAmount: baseAmount / 100,
      platformCut: platformCut / 100,
      athleteFee: totalAthleteFee / 100,
      totalCharged: totalChargedToAthlete / 100,
      coachReceives: coachReceives / 100
    }
  }

  const example = calculateExample()

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-2xl">💰</span>
        <h3 className="text-lg font-semibold text-gray-900">Commission Settings</h3>
      </div>

      {/* Success Toast */}
      {success && (
        <div 
          className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-green-800">Commission settings updated successfully</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div 
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Coach Platform Fee */}
        <div>
          <label htmlFor="platform_fee" className="block text-sm font-medium text-gray-700 mb-2">
            Coach Platform Fee (%)
          </label>
          <div className="flex items-center space-x-3">
            <input
              id="platform_fee"
              type="number"
              min="0"
              max="30"
              step="0.1"
              value={formData.platform_fee_percentage || ''}
              onChange={(e) => handleInputChange('platform_fee_percentage', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
              aria-describedby="platform_fee_help"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
          <p id="platform_fee_help" className="mt-1 text-xs text-gray-500">
            Percentage taken from coach earnings (0-30%). Default: 10%
          </p>
        </div>

        {/* Athlete Service Fee Percentage */}
        <div>
          <label htmlFor="athlete_fee_percent" className="block text-sm font-medium text-gray-700 mb-2">
            Athlete Service Fee (%)
          </label>
          <div className="flex items-center space-x-3">
            <input
              id="athlete_fee_percent"
              type="number"
              min="0"
              max="30"
              step="0.1"
              value={formData.athlete_service_fee_percent || ''}
              onChange={(e) => handleInputChange('athlete_service_fee_percent', parseFloat(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
              aria-describedby="athlete_fee_percent_help"
            />
            <span className="text-sm text-gray-600">%</span>
          </div>
          <p id="athlete_fee_percent_help" className="mt-1 text-xs text-gray-500">
            Percentage fee added to athlete's total (0-30%). Default: 0%
          </p>
        </div>

        {/* Athlete Flat Fee */}
        <div>
          <label htmlFor="athlete_fee_flat" className="block text-sm font-medium text-gray-700 mb-2">
            Athlete Flat Fee (USD)
          </label>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">$</span>
            <input
              id="athlete_fee_flat"
              type="number"
              min="0"
              max="20"
              step="0.01"
              value={((formData.athlete_service_fee_flat_cents || 0) / 100).toFixed(2)}
              onChange={(e) => handleInputChange('athlete_service_fee_flat_cents', Math.round((parseFloat(e.target.value) || 0) * 100))}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
              aria-describedby="athlete_fee_flat_help"
            />
          </div>
          <p id="athlete_fee_flat_help" className="mt-1 text-xs text-gray-500">
            Fixed fee added to athlete's total ($0.00-$20.00). Default: $0.00
          </p>
        </div>

        {/* Example Calculation */}
        {example && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Example: $100 Booking</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <div className="flex justify-between">
                <span>Base price:</span>
                <span>${example.baseAmount.toFixed(2)}</span>
              </div>
              {example.athleteFee > 0 && (
                <div className="flex justify-between">
                  <span>Athlete service fee:</span>
                  <span>+${example.athleteFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t border-blue-300 pt-1">
                <span>Total charged to athlete:</span>
                <span>${example.totalCharged.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform commission:</span>
                <span>-${example.platformCut.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium border-t border-blue-300 pt-1">
                <span>Coach receives:</span>
                <span>${example.coachReceives.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`
              px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${saving 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-[#F25C1F] text-white hover:bg-[#E14A0F] focus:ring-2 focus:ring-[#F25C1F] focus:ring-offset-2'
              }
            `}
          >
            {saving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}