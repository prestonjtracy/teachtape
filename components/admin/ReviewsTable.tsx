'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

interface Review {
  id: string
  booking_id: string
  coach_id: string
  athlete_id: string
  coach_name: string
  athlete_name: string
  rating: number
  comment: string | null
  would_recommend: boolean | null
  service_title: string | null
  is_hidden: boolean
  hidden_at: string | null
  created_at: string
}

interface ReviewsTableProps {
  initialReviews: Review[]
}

export default function ReviewsTable({ initialReviews }: ReviewsTableProps) {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [searchTerm, setSearchTerm] = useState('')
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const itemsPerPage = 15

  // Filter reviews based on search and filters
  const filteredReviews = useMemo(() => {
    let filtered = reviews

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(review =>
        review.coach_name.toLowerCase().includes(term) ||
        review.athlete_name.toLowerCase().includes(term) ||
        review.comment?.toLowerCase().includes(term) ||
        review.service_title?.toLowerCase().includes(term)
      )
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(review => review.rating === parseInt(ratingFilter))
    }

    // Status filter
    if (statusFilter === 'hidden') {
      filtered = filtered.filter(review => review.is_hidden)
    } else if (statusFilter === 'visible') {
      filtered = filtered.filter(review => !review.is_hidden)
    }

    return filtered
  }, [reviews, searchTerm, ratingFilter, statusFilter])

  // Paginated reviews
  const paginatedReviews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredReviews.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredReviews, currentPage])

  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage)

  const handleAction = async (reviewId: string, action: 'hide' | 'unhide') => {
    const actionText = action === 'hide' ? 'hide' : 'unhide'
    if (!confirm(`Are you sure you want to ${actionText} this review?`)) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, action })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Update local state immediately for instant UI feedback
        setReviews(prevReviews => prevReviews.map(review => {
          if (review.id !== reviewId) return review
          return {
            ...review,
            is_hidden: action === 'hide',
            hidden_at: action === 'hide' ? new Date().toISOString() : null
          }
        }))

        // Refresh page data
        router.refresh()
      } else {
        const errorMessage = data.error || 'Error performing action'
        console.error(`Review ${action} failed:`, errorMessage)
        alert(`Failed to ${actionText} review: ${errorMessage}`)
      }
    } catch (error) {
      console.error(`Review ${action} error:`, error)
      alert(`Network error while trying to ${actionText} review. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  const truncateText = (text: string | null, maxLength: number = 150) => {
    if (!text) return null
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by coach, athlete, or comment..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
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
        </div>

        {/* Rating Filter */}
        <select
          value={ratingFilter}
          onChange={(e) => {
            setRatingFilter(e.target.value)
            setCurrentPage(1)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
        >
          <option value="all">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value)
            setCurrentPage(1)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
        >
          <option value="all">All Status</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Athlete</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Coach</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Rating</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Review</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Service</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReviews.map((review) => (
              <tr
                key={review.id}
                className={`border-b border-gray-100 hover:bg-gray-50 ${review.is_hidden ? 'bg-red-50' : ''}`}
              >
                <td className="py-4 px-4">
                  <div className="text-sm font-medium text-gray-900">{review.athlete_name}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-gray-900">{review.coach_name}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex flex-col">
                    {renderStars(review.rating)}
                    {review.would_recommend !== null && (
                      <span className={`text-xs mt-1 ${review.would_recommend ? 'text-green-600' : 'text-red-600'}`}>
                        {review.would_recommend ? '✓ Would recommend' : '✗ Would not recommend'}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4 max-w-md">
                  {review.comment ? (
                    <p className="text-sm text-gray-600">{truncateText(review.comment)}</p>
                  ) : (
                    <span className="text-sm text-gray-400 italic">No comment</span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-gray-900">
                    {review.service_title || <span className="text-gray-400 italic">Unknown</span>}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-gray-500">{formatDate(review.created_at)}</div>
                </td>
                <td className="py-4 px-4">
                  {review.is_hidden ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Hidden
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Visible
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  {review.is_hidden ? (
                    <button
                      onClick={() => handleAction(review.id, 'unhide')}
                      disabled={loading}
                      className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                    >
                      Unhide
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(review.id, 'hide')}
                      disabled={loading}
                      className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      Hide
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedReviews.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || ratingFilter !== 'all' || statusFilter !== 'all'
              ? 'No reviews found matching your filters.'
              : 'No reviews found.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredReviews.length)} of {filteredReviews.length} reviews
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
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      pageNum === currentPage
                        ? 'bg-[#F25C1F] text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
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
