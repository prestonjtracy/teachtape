'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Payment {
  id: string
  payment_id: string
  athlete_name: string
  athlete_email: string | null
  athlete_avatar: string | null
  coach_name: string
  coach_avatar: string | null
  coach_stripe_account: string | null
  amount: number
  platform_fee: number | null
  coach_amount: number | null
  payment_status: string
  payout_status: string
  payout_failed_reason: string | null
  payout_retry_count: number | null
  stripe_transfer_id: string | null
  date: string
  listing_title: string | null
  source: 'payments' | 'bookings'
}

interface PaymentsTableProps {
  initialPayments: Payment[]
}

export default function PaymentsTable({ initialPayments }: PaymentsTableProps) {
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>(initialPayments)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all')
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const itemsPerPage = 15

  // Get all unique statuses for filter dropdowns
  const paymentStatuses = Array.from(new Set(payments.map(p => p.payment_status)))
    .sort()
  const payoutStatuses = Array.from(new Set(payments.map(p => p.payout_status)))
    .filter(status => status && status !== 'unknown')
    .sort()

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesSearch = !searchTerm || 
        payment.athlete_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.coach_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.payment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.athlete_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.listing_title?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesPaymentStatus = paymentStatusFilter === 'all' || payment.payment_status === paymentStatusFilter
      const matchesPayoutStatus = payoutStatusFilter === 'all' || payment.payout_status === payoutStatusFilter
      
      return matchesSearch && matchesPaymentStatus && matchesPayoutStatus
    })
  }, [payments, searchTerm, paymentStatusFilter, payoutStatusFilter])

  // Paginated payments
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredPayments, currentPage])

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)

  const handleAction = async (paymentId: string, action: string) => {
    if (!confirm(`Are you sure you want to ${action} this payout?`)) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action })
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

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'canceled': return 'bg-gray-100 text-gray-800'
      case 'refunded': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPayoutStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_transit': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'canceled': return 'bg-gray-100 text-gray-800'
      case 'unknown': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const canRetryPayout = (payment: Payment) => {
    return payment.payout_status === 'failed' && payment.source === 'payments'
  }

  const formatPrice = (cents: number | null) => {
    if (!cents) return '$0.00'
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const clearFilters = () => {
    setSearchTerm('')
    setPaymentStatusFilter('all')
    setPayoutStatusFilter('all')
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
            placeholder="Search payments..."
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

        {/* Payment Status Filter */}
        <select
          value={paymentStatusFilter}
          onChange={(e) => handleFilterChange(setPaymentStatusFilter, e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
        >
          <option value="all">All Payment Status</option>
          {paymentStatuses.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>

        {/* Payout Status Filter */}
        <select
          value={payoutStatusFilter}
          onChange={(e) => handleFilterChange(setPayoutStatusFilter, e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
        >
          <option value="all">All Payout Status</option>
          {payoutStatuses.map(status => (
            <option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
            </option>
          ))}
        </select>

        {/* Clear Filters */}
        <div className="flex justify-end">
          {(searchTerm || paymentStatusFilter !== 'all' || payoutStatusFilter !== 'all') && (
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
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Payment ID</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Athlete</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Coach</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Amount</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Fee Breakdown</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Payment Status</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Payout Status</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPayments.map((payment) => (
              <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="text-sm font-mono text-gray-900">
                    {payment.payment_id.slice(0, 12)}...
                  </div>
                  <div className="text-xs text-gray-500">
                    {payment.source} • {payment.listing_title || 'Session'}
                  </div>
                </td>
                
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {payment.athlete_avatar ? (
                        <Image
                          src={payment.athlete_avatar}
                          alt={payment.athlete_name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-medium">
                            {payment.athlete_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{payment.athlete_name}</div>
                      {payment.athlete_email && (
                        <div className="text-xs text-gray-500">{payment.athlete_email}</div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {payment.coach_avatar ? (
                        <Image
                          src={payment.coach_avatar}
                          alt={payment.coach_name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-medium">
                            {payment.coach_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{payment.coach_name}</div>
                      {payment.coach_stripe_account && (
                        <div className="text-xs text-green-600">Stripe Connected</div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="py-4 px-4">
                  <div className="text-sm font-medium text-gray-900">
                    {formatPrice(payment.amount)}
                  </div>
                </td>

                <td className="py-4 px-4">
                  <div className="text-xs text-gray-600">
                    <div>Coach: {formatPrice(payment.coach_amount)}</div>
                    <div>Fee: {formatPrice(payment.platform_fee)}</div>
                  </div>
                </td>

                <td className="py-4 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusBadgeColor(payment.payment_status)}`}>
                    {payment.payment_status.charAt(0).toUpperCase() + payment.payment_status.slice(1)}
                  </span>
                </td>

                <td className="py-4 px-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPayoutStatusBadgeColor(payment.payout_status)}`}>
                    {payment.payout_status.charAt(0).toUpperCase() + payment.payout_status.slice(1).replace('_', ' ')}
                  </span>
                  {payment.payout_failed_reason && (
                    <div className="text-xs text-red-600 mt-1">
                      {payment.payout_failed_reason}
                    </div>
                  )}
                  {payment.payout_retry_count && payment.payout_retry_count > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {payment.payout_retry_count} retries
                    </div>
                  )}
                </td>

                <td className="py-4 px-4">
                  <div className="text-sm text-gray-600">
                    {formatDateTime(payment.date)}
                  </div>
                </td>

                <td className="py-4 px-4">
                  <div className="flex space-x-2">
                    {canRetryPayout(payment) && (
                      <button
                        onClick={() => handleAction(payment.id, 'retry_payout')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-[#F25C1F] bg-[#F25C1F] bg-opacity-10 rounded hover:bg-opacity-20 transition-colors disabled:opacity-50"
                      >
                        Retry Payout
                      </button>
                    )}

                    {payment.stripe_transfer_id && (
                      <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded">
                        Transfer: {payment.stripe_transfer_id.slice(0, 8)}...
                      </span>
                    )}

                    {!canRetryPayout(payment) && !payment.stripe_transfer_id && (
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

        {paginatedPayments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <div className="text-lg font-medium">No payments found</div>
            <div className="text-sm">
              {searchTerm || paymentStatusFilter !== 'all' || payoutStatusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No payment transactions have been processed yet'
              }
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
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