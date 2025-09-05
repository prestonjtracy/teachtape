'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Setting {
  id: string
  setting_key: string
  setting_value: any
  setting_type: 'boolean' | 'string' | 'number' | 'json'
  display_name: string
  description: string
  category: string
  is_public: boolean
}

interface AuditLog {
  id: string
  admin_email: string
  action: string
  target_identifier: string
  details: any
  created_at: string
}

interface AdminSettingsProps {
  groupedSettings: Record<string, Setting[]>
  recentLogs: AuditLog[]
}

export default function AdminSettings({ groupedSettings, recentLogs }: AdminSettingsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({})

  const categoryDisplayNames: Record<string, string> = {
    system: 'System & Maintenance',
    features: 'Platform Features',
    payments: 'Payment Settings',
    general: 'General Settings',
    contact: 'Contact Information'
  }

  const categoryIcons: Record<string, string> = {
    system: '🔧',
    features: '⚡',
    payments: '💳',
    general: '⚙️',
    contact: '📧'
  }

  const updateSetting = async (setting: Setting, newValue: any) => {
    setLoading(setting.id)
    
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingId: setting.id,
          settingKey: setting.setting_key,
          value: newValue,
          oldValue: setting.setting_value
        })
      })

      if (response.ok) {
        // Remove from pending changes
        const newPending = { ...pendingChanges }
        delete newPending[setting.id]
        setPendingChanges(newPending)
        
        // Refresh the page to show updated values
        router.refresh()
      } else {
        const data = await response.json()
        alert(data.error || 'Error updating setting')
      }
    } catch (error) {
      alert('Error updating setting')
    } finally {
      setLoading(null)
    }
  }

  const handleBooleanToggle = (setting: Setting) => {
    const currentValue = setting.setting_value
    const newValue = !currentValue
    updateSetting(setting, newValue)
  }

  const handleInputChange = (setting: Setting, value: string) => {
    setPendingChanges(prev => ({
      ...prev,
      [setting.id]: value
    }))
  }

  const handleInputSubmit = (setting: Setting) => {
    const pendingValue = pendingChanges[setting.id]
    if (pendingValue !== undefined) {
      let processedValue = pendingValue
      
      if (setting.setting_type === 'number') {
        processedValue = parseInt(pendingValue) || 0
      }
      
      updateSetting(setting, processedValue)
    }
  }

  const renderSettingControl = (setting: Setting) => {
    const isLoading = loading === setting.id
    const pendingValue = pendingChanges[setting.id]
    const currentValue = pendingValue !== undefined ? pendingValue : setting.setting_value

    switch (setting.setting_type) {
      case 'boolean':
        return (
          <button
            onClick={() => handleBooleanToggle(setting)}
            disabled={isLoading}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${setting.setting_value 
                ? 'bg-[#F25C1F]' 
                : 'bg-gray-200'
              }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className="sr-only">{setting.display_name}</span>
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${setting.setting_value ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        )

      case 'string':
        return (
          <div className="flex space-x-2">
            <input
              type="text"
              value={currentValue}
              onChange={(e) => handleInputChange(setting, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(setting)}
              disabled={isLoading}
              className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
              placeholder={setting.description}
            />
            {pendingValue !== undefined && (
              <button
                onClick={() => handleInputSubmit(setting)}
                disabled={isLoading}
                className="px-3 py-1 text-xs bg-[#F25C1F] text-white rounded hover:bg-opacity-90 disabled:opacity-50"
              >
                Save
              </button>
            )}
          </div>
        )

      case 'number':
        return (
          <div className="flex space-x-2">
            <input
              type="number"
              value={currentValue}
              onChange={(e) => handleInputChange(setting, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(setting)}
              disabled={isLoading}
              className="w-24 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
            />
            {pendingValue !== undefined && (
              <button
                onClick={() => handleInputSubmit(setting)}
                disabled={isLoading}
                className="px-3 py-1 text-xs bg-[#F25C1F] text-white rounded hover:bg-opacity-90 disabled:opacity-50"
              >
                Save
              </button>
            )}
          </div>
        )

      default:
        return <span className="text-gray-500 text-sm">Unsupported setting type</span>
    }
  }

  const getSettingStatusColor = (setting: Setting) => {
    if (setting.setting_type === 'boolean') {
      return setting.setting_value ? 'text-green-600' : 'text-gray-500'
    }
    return 'text-gray-900'
  }

  return (
    <div className="p-6">
      {Object.entries(groupedSettings).map(([category, settings]) => (
        <div key={category} className="mb-8 last:mb-0">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-2xl">{categoryIcons[category] || '⚙️'}</span>
            <h3 className="text-lg font-semibold text-gray-900">
              {categoryDisplayNames[category] || category}
            </h3>
          </div>

          <div className="space-y-4">
            {settings.map((setting) => (
              <div 
                key={setting.id} 
                className={`
                  p-4 border rounded-lg transition-colors
                  ${category === 'system' && setting.setting_key === 'maintenance_mode' && setting.setting_value
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium text-gray-900">
                        {setting.display_name}
                      </h4>
                      
                      {setting.is_public && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Public
                        </span>
                      )}
                      
                      {category === 'system' && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          System
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {setting.description}
                    </p>
                    
                    {setting.setting_type === 'boolean' && (
                      <p className={`text-sm font-medium mt-2 ${getSettingStatusColor(setting)}`}>
                        Status: {setting.setting_value ? 'Enabled' : 'Disabled'}
                      </p>
                    )}
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    {renderSettingControl(setting)}
                  </div>
                </div>

                {loading === setting.id && (
                  <div className="mt-2 flex items-center text-sm text-gray-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#F25C1F] mr-2"></div>
                    Updating...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(groupedSettings).length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div className="text-lg font-medium">No settings found</div>
          <div className="text-sm">Settings will appear here once the database is configured</div>
        </div>
      )}
    </div>
  )
}