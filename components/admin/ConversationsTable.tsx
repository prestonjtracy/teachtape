'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import ConversationViewer from './ConversationViewer'

interface Participant {
  id: string
  full_name: string
  avatar_url: string | null
  email: string
}

interface Conversation {
  id: string
  created_at: string
  updated_at: string
  message_count: number
  coach: Participant | null
  athlete: Participant | null
}

interface ConversationsTableProps {
  initialConversations: Conversation[]
}

export default function ConversationsTable({ initialConversations }: ConversationsTableProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Filter conversations based on search term
  const filteredConversations = useMemo(() => {
    if (!searchTerm) return conversations
    
    return conversations.filter(conversation => {
      const coachEmail = conversation.coach?.email.toLowerCase() || ''
      const athleteEmail = conversation.athlete?.email.toLowerCase() || ''
      const coachName = conversation.coach?.full_name.toLowerCase() || ''
      const athleteName = conversation.athlete?.full_name.toLowerCase() || ''
      const conversationId = conversation.id.toLowerCase()
      
      const search = searchTerm.toLowerCase()
      
      return coachEmail.includes(search) ||
             athleteEmail.includes(search) ||
             coachName.includes(search) ||
             athleteName.includes(search) ||
             conversationId.includes(search)
    })
  }, [conversations, searchTerm])

  // Paginated conversations
  const paginatedConversations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredConversations.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredConversations, currentPage])

  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage)

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleFilterChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const getParticipantDisplay = (participant: Participant | null) => {
    if (!participant) {
      return (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 text-xs">?</span>
          </div>
          <div>
            <div className="text-sm text-gray-500">Unknown User</div>
            <div className="text-xs text-gray-400">No email</div>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {participant.avatar_url ? (
            <Image
              src={participant.avatar_url}
              alt={participant.full_name}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-600 text-xs font-medium">
                {participant.full_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">{participant.full_name}</div>
          <div className="text-xs text-gray-500">{participant.email}</div>
        </div>
      </div>
    )
  }

  if (selectedConversation) {
    return (
      <ConversationViewer 
        conversation={selectedConversation}
        onBack={() => setSelectedConversation(null)}
      />
    )
  }

  return (
    <div className="p-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-[#123A72]">{conversations.length}</div>
          <div className="text-sm text-gray-600">Total Conversations</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {conversations.filter(c => c.message_count > 0).length}
          </div>
          <div className="text-sm text-gray-600">Active Conversations</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {conversations.reduce((sum, c) => sum + c.message_count, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Messages</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search by user email, name, or conversation ID..."
            value={searchTerm}
            onChange={(e) => handleFilterChange(e.target.value)}
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
        {searchTerm && (
          <div className="mt-2 text-sm text-gray-600">
            Found {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Conversation ID</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Coach</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Athlete</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Messages</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Last Activity</th>
              <th className="text-left py-3 px-4 font-semibold text-[#123A72]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedConversations.map((conversation) => (
              <tr key={conversation.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="text-sm font-mono text-gray-900">
                    {conversation.id.slice(0, 8)}...
                  </div>
                  <div className="text-xs text-gray-500">
                    Created {formatDateTime(conversation.created_at)}
                  </div>
                </td>
                
                <td className="py-4 px-4">
                  {getParticipantDisplay(conversation.coach)}
                </td>

                <td className="py-4 px-4">
                  {getParticipantDisplay(conversation.athlete)}
                </td>

                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      conversation.message_count > 0
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {conversation.message_count} messages
                    </span>
                  </div>
                </td>

                <td className="py-4 px-4">
                  <div className="text-sm text-gray-600">
                    {formatDateTime(conversation.updated_at)}
                  </div>
                </td>

                <td className="py-4 px-4">
                  <button
                    onClick={() => setSelectedConversation(conversation)}
                    className="px-3 py-1 text-xs font-medium text-[#F25C1F] bg-[#F25C1F] bg-opacity-10 rounded hover:bg-opacity-20 transition-colors"
                  >
                    View Messages
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedConversations.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div className="text-lg font-medium">No conversations found</div>
            <div className="text-sm">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'No conversations have been started yet'
              }
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredConversations.length)} of {filteredConversations.length} conversations
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