'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'

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

interface Message {
  id: string
  body: string
  kind: string
  created_at: string
  sender: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
}

interface ConversationViewerProps {
  conversation: Conversation
  onBack: () => void
}

export default function ConversationViewer({ conversation, onBack }: ConversationViewerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMessages()
  }, [conversation.id])

  const fetchMessages = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      
      const { data, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          body,
          kind,
          created_at,
          sender:profiles!messages_sender_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })

      if (messagesError) {
        setError('Failed to load messages')
        console.error('Messages fetch error:', messagesError)
        return
      }

      setMessages(data || [])
    } catch (err) {
      setError('An error occurred while loading messages')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else if (diffInHours < 7 * 24) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getSenderRole = (senderId: string | null) => {
    if (!senderId) return 'unknown'
    if (conversation.coach?.id === senderId) return 'coach'
    if (conversation.athlete?.id === senderId) return 'athlete'
    return 'unknown'
  }

  const getSenderInfo = (senderId: string | null) => {
    if (!senderId) return null
    if (conversation.coach?.id === senderId) return conversation.coach
    if (conversation.athlete?.id === senderId) return conversation.athlete
    return null
  }

  const getMessageBubbleStyle = (senderId: string | null) => {
    const role = getSenderRole(senderId)
    
    if (role === 'coach') {
      return 'bg-[#F25C1F] bg-opacity-10 border-[#F25C1F] border-opacity-30'
    } else if (role === 'athlete') {
      return 'bg-blue-50 border-blue-200'
    } else {
      return 'bg-gray-100 border-gray-200'
    }
  }

  return (
    <div className="p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Conversations</span>
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          Conversation ID: {conversation.id.slice(0, 8)}...
        </div>
      </div>

      {/* Participants Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-[#F25C1F] rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Coach:</span>
            {conversation.coach ? (
              <div className="flex items-center space-x-2">
                {conversation.coach.avatar_url ? (
                  <Image
                    src={conversation.coach.avatar_url}
                    alt={conversation.coach.full_name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-600">
                      {conversation.coach.full_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-900">{conversation.coach.full_name}</div>
                  <div className="text-xs text-gray-500">{conversation.coach.email}</div>
                </div>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Unknown</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Athlete:</span>
            {conversation.athlete ? (
              <div className="flex items-center space-x-2">
                {conversation.athlete.avatar_url ? (
                  <Image
                    src={conversation.athlete.avatar_url}
                    alt={conversation.athlete.full_name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-600">
                      {conversation.athlete.full_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-900">{conversation.athlete.full_name}</div>
                  <div className="text-xs text-gray-500">{conversation.athlete.email}</div>
                </div>
              </div>
            ) : (
              <span className="text-sm text-gray-500">Unknown</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">
            Message History ({messages.length} messages)
          </h3>
        </div>
        
        <div className="p-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F25C1F]"></div>
              <span className="ml-2 text-gray-600">Loading messages...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-red-600 font-medium">{error}</div>
              <button 
                onClick={fetchMessages}
                className="mt-2 px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50"
              >
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div className="text-lg font-medium">No messages yet</div>
              <div className="text-sm">This conversation hasn't started yet</div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const senderInfo = getSenderInfo(message.sender?.id || null)
                const role = getSenderRole(message.sender?.id || null)
                
                return (
                  <div key={message.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {senderInfo?.avatar_url ? (
                        <Image
                          src={senderInfo.avatar_url}
                          alt={senderInfo.full_name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 text-xs font-medium">
                            {senderInfo?.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {senderInfo?.full_name || 'Unknown User'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          role === 'coach' 
                            ? 'bg-[#F25C1F] bg-opacity-20 text-[#F25C1F]'
                            : role === 'athlete'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(message.created_at)}
                        </span>
                      </div>
                      
                      <div className={`mt-1 p-3 rounded-lg border ${getMessageBubbleStyle(message.sender?.id || null)}`}>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {message.body}
                        </p>
                        {message.kind !== 'text' && (
                          <div className="mt-2 text-xs text-gray-500">
                            Message type: {message.kind}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* Read-only notice */}
        <div className="p-3 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-center justify-center text-sm text-yellow-800">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Read-only view: Admins cannot send messages in this conversation
          </div>
        </div>
      </div>
    </div>
  )
}