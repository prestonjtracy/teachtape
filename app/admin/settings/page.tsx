import { createClient } from '@/lib/supabase/server'
import AdminSettings from '@/components/admin/AdminSettings'

export default async function SettingsPage() {
  const supabase = createClient()
  
  // Get all admin settings
  const { data: settings, error: settingsError } = await supabase
    .from('admin_settings')
    .select(`
      id,
      setting_key,
      setting_value,
      setting_type,
      display_name,
      description,
      category,
      is_public,
      created_at,
      updated_at,
      updated_by
    `)
    .order('category', { ascending: true })
    .order('display_name', { ascending: true })

  // Group settings by category
  const groupedSettings = settings?.reduce((acc: Record<string, any[]>, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {}) || {}

  // Get recent audit logs for settings changes
  const { data: recentLogs, error: logsError } = await supabase
    .from('audit_logs')
    .select(`
      id,
      admin_email,
      action,
      target_identifier,
      details,
      created_at
    `)
    .eq('target_type', 'setting')
    .order('created_at', { ascending: false })
    .limit(10)

  if (settingsError) {
    console.error('Error fetching settings:', settingsError)
  }

  if (logsError) {
    console.error('Error fetching audit logs:', logsError)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#123A72]">Platform Settings</h1>
        <p className="text-gray-600 mt-2">Configure site-wide features and system behavior</p>
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-red-800">
              <strong>Caution:</strong> Changes to these settings affect all users immediately. Some settings may require a page refresh to take effect.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border">
            <AdminSettings 
              groupedSettings={groupedSettings} 
              recentLogs={recentLogs || []}
            />
          </div>
        </div>

        {/* Recent Changes Sidebar */}
        <div className="xl:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Changes</h3>
            </div>
            
            <div className="p-4">
              {recentLogs && recentLogs.length > 0 ? (
                <div className="space-y-3">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="border-l-2 border-[#F25C1F] pl-3">
                      <div className="text-sm font-medium text-gray-900">
                        {log.target_identifier}
                      </div>
                      <div className="text-xs text-gray-600">
                        {log.action} by {log.admin_email}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {log.details && (
                        <div className="text-xs text-gray-500 mt-1">
                          {typeof log.details === 'object' 
                            ? Object.entries(log.details).map(([key, value]) => `${key}: ${value}`).join(', ')
                            : log.details
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <svg className="mx-auto h-8 w-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm">No recent changes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}