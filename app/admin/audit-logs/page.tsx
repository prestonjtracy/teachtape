import { createClient } from '@/lib/supabase/server'
import AuditLogsTable from '@/components/admin/AuditLogsTable'

export default async function AuditLogsPage() {
  const supabase = createClient()
  
  // Get audit logs with pagination
  const { data: auditLogs, error: logsError } = await supabase
    .from('audit_logs')
    .select(`
      id,
      admin_id,
      admin_email,
      action,
      target_type,
      target_id,
      target_identifier,
      details,
      ip_address,
      user_agent,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(500) // Get recent 500 logs

  // Get summary statistics
  const stats = {
    totalLogs: auditLogs?.length || 0,
    todayLogs: auditLogs?.filter(log => {
      const today = new Date()
      const logDate = new Date(log.created_at)
      return logDate.toDateString() === today.toDateString()
    }).length || 0,
    uniqueAdmins: new Set(auditLogs?.map(log => log.admin_email) || []).size,
    mostCommonAction: getMostCommonAction(auditLogs || [])
  }

  if (logsError) {
    console.error('Error fetching audit logs:', logsError)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#123A72]">Audit Logs</h1>
        <p className="text-gray-600 mt-2">Track all administrative actions and system changes</p>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800">
              All administrative actions are automatically logged for security and compliance purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-[#123A72]">{stats.totalLogs}</div>
          <div className="text-sm text-gray-600">Total Audit Logs</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{stats.todayLogs}</div>
          <div className="text-sm text-gray-600">Actions Today</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{stats.uniqueAdmins}</div>
          <div className="text-sm text-gray-600">Active Admins</div>
        </div>
        <div className="bg-[#F25C1F] bg-opacity-10 p-4 rounded-lg">
          <div className="text-lg font-bold text-[#F25C1F] truncate">
            {stats.mostCommonAction || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Most Common Action</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <AuditLogsTable initialLogs={auditLogs || []} />
      </div>
    </div>
  )
}

function getMostCommonAction(logs: any[]): string {
  if (logs.length === 0) return 'N/A'
  
  const actionCounts = logs.reduce((acc: Record<string, number>, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1
    return acc
  }, {})
  
  return Object.entries(actionCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'N/A'
}