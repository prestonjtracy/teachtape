'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Coach {
  id: string
  profile_id: string
  full_name: string
  sport: string | null
  bio: string | null
  avatar_url: string | null
  is_public: boolean
  stripe_connected: boolean
  stripe_account_id: string | null
  services_count: number
  created_at: string
  verified: boolean
}

interface CoachesTableProps {
  initialCoaches: Coach[]
}

export default function CoachesTable({ initialCoaches }: CoachesTableProps) {
  const router = useRouter()
  const [coaches, setCoaches] = useState<Coach[]>(initialCoaches)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const itemsPerPage = 10

  // Filter coaches based on search term
  const filteredCoaches = useMemo(() => {
    if (!searchTerm) return coaches
    return coaches.filter(coach => 
      coach.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.sport?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.bio?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [coaches, searchTerm])

  // Paginated coaches
  const paginatedCoaches = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredCoaches.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredCoaches, currentPage])

  const totalPages = Math.ceil(filteredCoaches.length / itemsPerPage)

  const handleAction = async (coachId: string, action: string) => {
    if (!confirm(`Are you sure you want to ${action} this coach?`)) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId, action })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Update local state immediately for instant UI feedback
        setCoaches(prevCoaches => prevCoaches.map(coach => {
          if (coach.id !== coachId) return coach

          switch (action) {
            case 'verify':
              return { ...coach, verified: true }
            case 'deactivate':
              return { ...coach, is_public: false }
            case 'activate':
              return { ...coach, is_public: true }
            case 'delete':
              return coach // Will be filtered out below
            default:
              return coach
          }
        }).filter(coach => action !== 'delete' || coach.id !== coachId))

        // Also refresh the page data to sync with database
        router.refresh()
      } else {
        const errorMessage = data.error || 'Error performing action'
        console.error(`Coach ${action} failed:`, errorMessage)
        alert(`Failed to ${action} coach: ${errorMessage}`)
      }
    } catch (error) {
      console.error(`Coach ${action} error:`, error)
      alert(`Network error while trying to ${action} coach. Please try again.`)
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

  const truncateText = (text: string | null, maxLength: number = 100) => {
    if (!text) return 'No bio provided'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <div className="p-6">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search coaches by name, sport, or bio..."
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
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-[#123A72]">{coaches.length}</div>
          <div className="text-sm text-gray-600">Total Coaches</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{coaches.filter(c => c.verified).length}</div>
          <div className="text-sm text-gray-600">Verified</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-[#F25C1F]">{coaches.filter(c => c.stripe_connected).length}</div>
          <div className="text-sm text-gray-600">Stripe Connected</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{coaches.filter(c => c.services_count > 0).length}</div>
          <div className="text-sm text-gray-600">With Services</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Coach</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Sport & Bio</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Stripe</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Services</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedCoaches.map((coach) => (
              <tr key={coach.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {coach.avatar_url ? (
                        <Image
                          src={coach.avatar_url}
                          alt={coach.full_name}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-sm font-medium">
                            {coach.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{coach.full_name}</div>
                      <div className="text-xs text-gray-500">Joined {formatDate(coach.created_at)}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {coach.sport || 'No sport specified'}
                    </div>
                    <div className="text-xs text-gray-500 max-w-xs">
                      {truncateText(coach.bio, 80)}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    {coach.verified ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                    {!coach.is_public && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        Deactivated
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  {coach.stripe_connected ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-[#F25C1F] bg-opacity-20 text-[#F25C1F]">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Connected
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      Not Connected
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-gray-900">{coach.services_count}</div>
                  <div className="text-xs text-gray-500">services</div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex space-x-2">
                    {!coach.verified && coach.is_public && (
                      <button
                        onClick={() => handleAction(coach.id, 'verify')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                      >
                        Verify
                      </button>
                    )}
                    
                    {coach.is_public ? (
                      <button
                        onClick={() => handleAction(coach.id, 'deactivate')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200 transition-colors disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(coach.id, 'activate')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-[#F25C1F] bg-[#F25C1F] bg-opacity-10 rounded hover:bg-opacity-20 transition-colors disabled:opacity-50"
                      >
                        Activate
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleAction(coach.id, 'delete')}
                      disabled={loading}
                      className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedCoaches.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'No coaches found matching your search.' : 'No coaches found.'}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCoaches.length)} of {filteredCoaches.length} coaches
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