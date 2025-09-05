'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Booking {
  id: string
  booking_id: string
  athlete_name: string
  athlete_email: string | null
  athlete_avatar: string | null
  coach_name: string
  coach_avatar: string | null
  session_date: string | null
  session_end: string | null
  status: string
  listing_title: string
  amount_paid: number | null
  created_at: string
  table_type: 'bookings' | 'booking_requests'
}

interface BookingsTableProps {
  initialBookings: Booking[]
}

export default function BookingsTable({ initialBookings }: BookingsTableProps) {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const itemsPerPage = 15

  // Get all unique statuses for filter dropdown
  const allStatuses = Array.from(new Set(bookings.map(b => b.status)))
    .sort()

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const matchesSearch = !searchTerm || 
        booking.athlete_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.coach_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.listing_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.booking_id.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [bookings, searchTerm, statusFilter])

  // Paginated bookings
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredBookings, currentPage])

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage)

  const handleAction = async (bookingId: string, tableType: string, action: string) => {
    if (!confirm(`Are you sure you want to ${action} this booking?`)) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, tableType, action })
      })

      if (response.ok) {
        // Refresh the page data
        router.refresh()
      } else {
        const data = await response.json()
        alert(data.error || 'Error performing action')
      }
    } catch (error) {
      alert('Error performing action')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'accepted': 
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'cancelled':
      case 'declined': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const canCancel = (status: string) => {
    return ['pending', 'accepted', 'confirmed'].includes(status.toLowerCase())
  }

  const canMarkComplete = (status: string) => {
    return ['accepted', 'confirmed'].includes(status.toLowerCase())
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const formatPrice = (cents: number | null) => {
    if (!cents) return 'N/A'
    return `$${(cents / 100).toFixed(2)}`
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  const handleFilterChange = (filterSetter: (value: any) => void, value: any) => {
    filterSetter(value)
    setCurrentPage(1)
  }

  return (
    <div className="p-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-[#123A72]">{bookings.length}</div>
          <div className="text-sm text-gray-600">Total Bookings</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {bookings.filter(b => b.status.toLowerCase() === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {bookings.filter(b => ['accepted', 'confirmed'].includes(b.status.toLowerCase())).length}
          </div>
          <div className="text-sm text-gray-600">Confirmed</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {bookings.filter(b => b.status.toLowerCase() === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {bookings.filter(b => ['cancelled', 'declined'].includes(b.status.toLowerCase())).length}
          </div>
          <div className="text-sm text-gray-600">Cancelled</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search bookings..."
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

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
        >
          <option value="all">All Status</option>
          {allStatuses.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        <div className="flex justify-end">
          {(searchTerm || statusFilter !== 'all') && (
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
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Booking ID</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Athlete</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Coach</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Session</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Amount</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedBookings.map((booking) => (
              <tr key={`${booking.table_type}-${booking.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="text-sm font-mono text-gray-900">
                    {booking.booking_id.slice(0, 8)}...
                  </div>
                  <div className="text-xs text-gray-500">
                    {booking.table_type === 'bookings' ? 'Legacy' : 'Request'}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {booking.athlete_avatar ? (
                        <Image
                          src={booking.athlete_avatar}
                          alt={booking.athlete_name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-medium">
                            {booking.athlete_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.athlete_name}</div>
                      {booking.athlete_email && (
                        <div className="text-xs text-gray-500">{booking.athlete_email}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {booking.coach_avatar ? (
                        <Image
                          src={booking.coach_avatar}
                          alt={booking.coach_name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-medium">
                            {booking.coach_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{booking.coach_name}</div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{booking.listing_title}</div>
                    <div className="text-xs text-gray-500">
                      {formatDateTime(booking.session_date)}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm font-medium text-gray-900">
                    {formatPrice(booking.amount_paid)}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex space-x-2">
                    {canMarkComplete(booking.status) && (
                      <button
                        onClick={() => handleAction(booking.id, booking.table_type, 'complete')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                      >
                        Complete
                      </button>
                    )}
                    
                    {canCancel(booking.status) && (
                      <button
                        onClick={() => handleAction(booking.id, booking.table_type, 'cancel')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}

                    {['cancelled', 'declined', 'completed'].includes(booking.status.toLowerCase()) && (
                      <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded">
                        No actions
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedBookings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-lg font-medium">No bookings found</div>
            <div className="text-sm">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No bookings have been created yet'
              }
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
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