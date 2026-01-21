'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageWithSender } from '@/types/db';

interface BookingRequest {
  id: string;
  status: string;
  proposed_start: string | null;
  proposed_end: string | null;
  listing: {
    id: string;
    title: string;
    price_cents: number;
    duration_minutes: number;
    listing_type: 'live_lesson' | 'film_review';
  } | null;
}

interface ConversationWithLastMessage {
  id: string;
  created_at: string;
  updated_at: string;
  participants: Array<{
    user_id: string;
    role: string;
    profile: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      role: string;
    } | null;
  }>;
  lastMessage: MessageWithSender | null;
  messageCount: number;
  bookingRequest: BookingRequest | null;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function loadConversations() {
      try {
        const response = await fetch('/api/conversations');
        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            if (isMounted) router.push('/auth/login');
            return;
          }
          throw new Error(data.error || 'Failed to load conversations');
        }

        if (isMounted) {
          setCurrentUser(data.currentUser);
          setConversations(data.conversations || []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An unexpected error occurred');
          setLoading(false);
        }
      }
    }

    const timeoutId = setTimeout(() => {
      if (isMounted && loading) {
        setError('Loading took too long. Please refresh the page.');
        setLoading(false);
      }
    }, 15000);

    loadConversations();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format relative time (e.g., "2 hours ago", "Yesterday")
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const truncateMessage = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' };
      case 'accepted':
        return { bg: 'bg-green-100', text: 'text-green-700', label: 'Accepted' };
      case 'declined':
        return { bg: 'bg-red-100', text: 'text-red-700', label: 'Declined' };
      case 'cancelled':
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cancelled' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    }
  };

  const getMessageTypeIcon = (kind: string) => {
    switch (kind) {
      case 'booking_request':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'booking_accepted':
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'system':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Hero skeleton */}
        <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 bg-white/20 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-white/20 rounded w-1/3"></div>
            </div>
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold">Messages</h1>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Messages</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center">
                <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Messages
              </h1>
              <p className="mt-2 text-blue-100 text-lg">
                {conversations.length === 0
                  ? 'No conversations yet'
                  : `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`
                }
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {conversations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#123C7A]/10 to-[#1E5BB5]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[#123C7A] mb-2">No conversations yet</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {currentUser?.role === 'coach'
                ? 'When athletes request sessions, conversations will appear here for scheduling.'
                : 'Start a conversation by requesting a session with a coach.'
              }
            </p>
            <Link
              href="/coaches"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#F45A14] to-[#FF7A3D] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:shadow-orange-500/25 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {currentUser?.role === 'coach' ? 'View Your Listings' : 'Find Coaches'}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conversation) => {
              // Find the other participant (not the current user)
              const otherParticipant = conversation.participants.find(
                (p: any) => p.user_id !== currentUser.id
              )?.profile;

              const lastMessage = conversation.lastMessage;
              const booking = conversation.bookingRequest;
              const isSystemMessage = lastMessage?.kind === 'system' || lastMessage?.kind === 'booking_request' || lastMessage?.kind === 'booking_accepted';

              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="block bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-[#123C7A]/20 transition-all duration-200 group"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {otherParticipant?.avatar_url ? (
                          <img
                            src={otherParticipant.avatar_url}
                            alt={otherParticipant.full_name || 'User'}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100 group-hover:ring-[#123C7A]/20 transition-all"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] rounded-full flex items-center justify-center ring-2 ring-gray-100 group-hover:ring-[#123C7A]/20 transition-all">
                            <span className="text-white font-bold text-xl">
                              {otherParticipant?.full_name?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        {/* Role badge */}
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          otherParticipant?.role === 'coach'
                            ? 'bg-[#123C7A] text-white'
                            : 'bg-[#F45A14] text-white'
                        }`}>
                          {otherParticipant?.role === 'coach' ? 'C' : 'A'}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-base font-semibold text-[#123C7A] truncate group-hover:text-[#1E5BB5] transition-colors">
                            {otherParticipant?.full_name || 'Unknown User'}
                          </h3>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {lastMessage ? formatRelativeTime(lastMessage.created_at) : formatRelativeTime(conversation.updated_at)}
                          </span>
                        </div>

                        {/* Session/Booking Context */}
                        {booking?.listing && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                              booking.listing.listing_type === 'live_lesson'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}>
                              {booking.listing.listing_type === 'live_lesson' ? (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                </svg>
                              )}
                              {booking.listing.title}
                            </div>
                            {booking.status && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(booking.status).bg} ${getStatusBadge(booking.status).text}`}>
                                {getStatusBadge(booking.status).label}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Last Message Preview */}
                        <div className="flex items-center gap-2">
                          {isSystemMessage && getMessageTypeIcon(lastMessage?.kind || 'text')}
                          <p className={`text-sm truncate flex-1 ${
                            isSystemMessage ? 'text-gray-500 italic' : 'text-gray-600'
                          }`}>
                            {lastMessage ? (
                              <>
                                {lastMessage.sender_id === currentUser.id && (
                                  <span className="text-gray-400">You: </span>
                                )}
                                {truncateMessage(lastMessage.body)}
                              </>
                            ) : (
                              <span className="text-gray-400 italic">No messages yet</span>
                            )}
                          </p>
                        </div>

                        {/* Message count badge */}
                        {conversation.messageCount > 0 && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>

                      {/* Arrow indicator */}
                      <div className="flex items-center self-center">
                        <svg className="w-5 h-5 text-gray-300 group-hover:text-[#123C7A] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Quick tip */}
        {conversations.length > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-[#123C7A]/5 to-[#1E5BB5]/5 rounded-xl border border-[#123C7A]/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#123C7A]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-[#123C7A] font-medium">Quick Tip</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Messages are where you coordinate session details, share Zoom links, and communicate with {currentUser?.role === 'coach' ? 'athletes' : 'coaches'}.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
