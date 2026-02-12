'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  auth_user_id: string
  full_name: string | null
  email: string
  role: string
  status: 'active' | 'disabled' | 'deleted'
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
}

interface UsersTableProps {
  initialUsers: User[]
}

export default function UsersTable({ initialUsers }: UsersTableProps) {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'deleted'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const itemsPerPage = 10

  // Filter users based on search term and status
  const filteredUsers = useMemo(() => {
    let filtered = users

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    return filtered
  }, [users, searchTerm, statusFilter])

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredUsers, currentPage])

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  const handleAction = async (userId: string, action: string) => {
    if (!confirm(`Are you sure you want to ${action} this user?`)) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      })

      if (response.ok) {
        // Refresh the page data
        router.refresh()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Error: ${errorData.error || 'Unknown error occurred'}`)
      }
    } catch (error) {
      alert('Error performing action')
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'coach': return 'bg-[#F25C1F] bg-opacity-20 text-[#F25C1F]'
      case 'athlete': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'disabled': return 'bg-yellow-100 text-yellow-800'
      case 'deleted': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-6">
      {/* Search Bar and Filters */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search users by email, name, or role..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1) // Reset to first page on search
            }}
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
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | 'active' | 'disabled' | 'deleted')
            setCurrentPage(1)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">User</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Role</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Created</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Last Login</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map((user) => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="text-sm font-medium text-gray-900">{user.email}</div>
                  <div className="text-xs text-gray-500">{user.full_name || 'No name set'}</div>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(user.status || 'active')}`}>
                    {(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {formatDate(user.created_at)}
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-2">
                    {/* Promote to Coach - only for active athletes */}
                    {user.role !== 'coach' && user.role !== 'admin' && user.status === 'active' && (
                      <button
                        onClick={() => handleAction(user.auth_user_id, 'promote')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-[#F25C1F] bg-[#F25C1F] bg-opacity-10 rounded hover:bg-opacity-20 transition-colors disabled:opacity-50"
                      >
                        Promote to Coach
                      </button>
                    )}

                    {/* Disable - only for active non-admin users */}
                    {user.role !== 'admin' && user.status === 'active' && (
                      <button
                        onClick={() => handleAction(user.auth_user_id, 'disable')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200 transition-colors disabled:opacity-50"
                      >
                        Disable
                      </button>
                    )}

                    {/* Enable - only for disabled or deleted users */}
                    {(user.status === 'disabled' || user.status === 'deleted') && (
                      <button
                        onClick={() => handleAction(user.auth_user_id, 'enable')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                      >
                        Reactivate
                      </button>
                    )}

                    {/* Delete - only for non-deleted, non-admin users */}
                    {user.role !== 'admin' && user.status !== 'deleted' && (
                      <button
                        onClick={() => handleAction(user.auth_user_id, 'soft_delete')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No users found matching your search.' : 'No users found.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
              ))}
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