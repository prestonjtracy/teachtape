'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Listing {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  price_cents: number
  is_active: boolean
  created_at: string
  coach_name: string
  coach_avatar: string | null
  sport: string | null
  table_type: 'services' | 'listings'
}

interface ListingsTableProps {
  initialListings: Listing[]
  coaches: string[]
  sports: string[]
}

export default function ListingsTable({ initialListings, coaches, sports }: ListingsTableProps) {
  const router = useRouter()
  const [listings, setListings] = useState<Listing[]>(initialListings)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCoach, setSelectedCoach] = useState('')
  const [selectedSport, setSelectedSport] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const itemsPerPage = 15

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      const matchesSearch = !searchTerm || 
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.coach_name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCoach = !selectedCoach || listing.coach_name === selectedCoach
      const matchesSport = !selectedSport || listing.sport === selectedSport
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && listing.is_active) ||
        (statusFilter === 'inactive' && !listing.is_active)
      
      return matchesSearch && matchesCoach && matchesSport && matchesStatus
    })
  }, [listings, searchTerm, selectedCoach, selectedSport, statusFilter])

  // Paginated listings
  const paginatedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredListings.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredListings, currentPage])

  const totalPages = Math.ceil(filteredListings.length / itemsPerPage)

  const handleAction = async (listingId: string, tableType: string, action: string) => {
    if (!confirm(`Are you sure you want to ${action} this listing?`)) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, tableType, action })
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

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedCoach('')
    setSelectedSport('')
    setStatusFilter('all')
    setCurrentPage(1)
  }

  // Reset page when filters change
  const handleFilterChange = (filterSetter: (value: any) => void, value: any) => {
    filterSetter(value)
    setCurrentPage(1)
  }

  return (
    <div className="p-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-[#123A72]">{listings.length}</div>
          <div className="text-sm text-gray-600">Total Listings</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{listings.filter(l => l.is_active).length}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{listings.filter(l => !l.is_active).length}</div>
          <div className="text-sm text-gray-600">Inactive</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-[#F25C1F]">{Array.from(new Set(listings.map(l => l.coach_name))).length}</div>
          <div className="text-sm text-gray-600">Coaches</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <input
            type="text"
            placeholder="Search listings..."
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

        {/* Coach Filter */}
        <select
          value={selectedCoach}
          onChange={(e) => handleFilterChange(setSelectedCoach, e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
        >
          <option value="">All Coaches</option>
          {coaches.map(coach => (
            <option key={coach} value={coach}>{coach}</option>
          ))}
        </select>

        {/* Sport Filter */}
        <select
          value={selectedSport}
          onChange={(e) => handleFilterChange(setSelectedSport, e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
        >
          <option value="">All Sports</option>
          {sports.map(sport => (
            <option key={sport} value={sport}>{sport}</option>
          ))}
        </select>

        {/* Status Filter & Clear */}
        <div className="flex space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value as any)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F25C1F] focus:border-[#F25C1F] outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          {(searchTerm || selectedCoach || selectedSport || statusFilter !== 'all') && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Listing</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Coach</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Price</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Duration</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Created</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedListings.map((listing) => (
              <tr key={`${listing.table_type}-${listing.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div>
                    <div className="font-medium text-gray-900">{listing.title}</div>
                    {listing.description && (
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {listing.description}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      {listing.sport && (
                        <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {listing.sport}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    {listing.coach_avatar ? (
                      <Image
                        src={listing.coach_avatar}
                        alt={listing.coach_name}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-gray-600 text-xs font-medium">
                          {listing.coach_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="text-sm font-medium text-gray-900">{listing.coach_name}</div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm font-medium text-gray-900">{formatPrice(listing.price_cents)}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-gray-900">{formatDuration(listing.duration_minutes)}</div>
                </td>
                <td className="py-4 px-4">
                  {listing.is_active ? (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm text-gray-600">{formatDate(listing.created_at)}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex space-x-2">
                    {listing.is_active ? (
                      <button
                        onClick={() => handleAction(listing.id, listing.table_type, 'deactivate')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(listing.id, listing.table_type, 'activate')}
                        disabled={loading}
                        className="px-3 py-1 text-xs font-medium text-[#F25C1F] bg-[#F25C1F] bg-opacity-10 rounded hover:bg-opacity-20 transition-colors disabled:opacity-50"
                      >
                        Activate
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleAction(listing.id, listing.table_type, 'delete')}
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

        {paginatedListings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div className="text-lg font-medium">No listings found</div>
            <div className="text-sm">
              {searchTerm || selectedCoach || selectedSport || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No listings have been created yet'
              }
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredListings.length)} of {filteredListings.length} listings
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