'use client'

import { useState, useMemo } from 'react'

interface AuditLog {
  id: string
  admin_id: string | null
  admin_email: string
  action: string
  target_type: string | null
  target_id: string | null
  target_identifier: string | null
  details: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface AuditLogsTableProps {
  initialLogs: AuditLog[]
}

export default function AuditLogsTable({ initialLogs }: AuditLogsTableProps) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // Get unique actions and target types for filters
  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort()
  const uniqueTargetTypes = Array.from(new Set(logs.map(log => log.target_type).filter(Boolean))).sort()

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = !searchTerm || 
        log.admin_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target_identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target_id?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesAction = actionFilter === 'all' || log.action === actionFilter
      const matchesTargetType = targetTypeFilter === 'all' || log.target_type === targetTypeFilter
      
      return matchesSearch && matchesAction && matchesTargetType
    })
  }, [logs, searchTerm, actionFilter, targetTypeFilter])

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredLogs, currentPage])

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionBadgeColor = (action: string) => {
    const actionLower = action.toLowerCase()
    if (actionLower.includes('delete') || actionLower.includes('cancel')) {
      return 'bg-red-100 text-red-800'
    } else if (actionLower.includes('create') || actionLower.includes('verify') || actionLower.includes('activate')) {
      return 'bg-green-100 text-green-800'
    } else if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('change')) {
      return 'bg-blue-100 text-blue-800'
    } else if (actionLower.includes('retry') || actionLower.includes('reset')) {
      return 'bg-yellow-100 text-yellow-800'
    } else {
      return 'bg-gray-100 text-gray-800'
    }
  }

  const getTargetTypeIcon = (targetType: string | null) => {
    switch (targetType) {
      case 'user':
      case 'athlete':
        return '👤'
      case 'coach':
        return '🏃'
      case 'listing':
      case 'service':
        return '📝'
      case 'booking':
        return '📅'
      case 'payment':
        return '💳'
      case 'setting':
        return '⚙️'
      default:
        return '📄'
    }
  }

  const formatDetails = (details: any) => {
    if (!details) return null
    
    if (typeof details === 'string') {
      return details
    }
    
    if (typeof details === 'object') {
      return Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
    }
    
    return String(details)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setActionFilter('all')
    setTargetTypeFilter('all')
    setCurrentPage(1)
  }

  const handleFilterChange = (filterSetter: (value: any) => void, value: any) => {
    filterSetter(value)
    setCurrentPage(1)
  }

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Action Filter */}
        <select
          value={actionFilter}
          onChange={(e) => handleFilterChange(setActionFilter, e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
        >
          <option value="all">All Actions</option>
          {uniqueActions.map(action => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>

        {/* Target Type Filter */}
        <select
          value={targetTypeFilter}
          onChange={(e) => handleFilterChange(setTargetTypeFilter, e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
        >
          <option value="all">All Target Types</option>
          {uniqueTargetTypes.map(type => (
            <option key={type} value={type}>
              {type?.charAt(0).toUpperCase() + type?.slice(1)}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        <div className="flex justify-end">
          {(searchTerm || actionFilter !== 'all' || targetTypeFilter !== 'all') && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Timestamp</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Admin</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Action</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Target</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Details</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map((log) => (
              <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="text-sm text-gray-900">
                    {formatDateTime(log.created_at)}
                  </div>
                </td>
                
                <td className="py-4 px-4">
                  <div className="text-sm font-medium text-gray-900">
                    {log.admin_email}
                  </div>
                </td>

                <td className="py-4 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeColor(log.action)}`}>
                    {log.action}
                  </span>
                </td>

                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {getTargetTypeIcon(log.target_type)}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {log.target_identifier || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.target_type && (
                          <span className="capitalize">{log.target_type}</span>
                        )}
                        {log.target_id && (
                          <span className="ml-2 font-mono">
                            {log.target_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="py-4 px-4">
                  <div className="text-sm text-gray-600 max-w-xs">
                    {formatDetails(log.details) && (
                      <div className="truncate" title={formatDetails(log.details) || ''}>
                        {formatDetails(log.details)}
                      </div>
                    )}
                    {!formatDetails(log.details) && (
                      <span className="text-gray-400">No details</span>
                    )}
                  </div>
                </td>

                <td className="py-4 px-4">
                  <div className="text-sm text-gray-600 font-mono">
                    {log.ip_address || 'N/A'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedLogs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div className="text-lg font-medium">No audit logs found</div>
            <div className="text-sm">
              {searchTerm || actionFilter !== 'all' || targetTypeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No administrative actions have been logged yet'
              }
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + Math.max(1, currentPage - 2)
                if (page > totalPages) return null
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      page === currentPage
                        ? 'bg-[#F25C1F] text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}