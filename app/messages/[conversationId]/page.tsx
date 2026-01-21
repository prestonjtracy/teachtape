'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChatThread, ChatThreadRef } from '@/components/chat/ChatThread';
import { ChatComposer } from '@/components/chat/ChatComposer';

interface MessagePageProps {
  params: {
    conversationId: string;
  };
}

interface ConversationData {
  conversation: any;
  currentUser: any;
  bookingRequest: any;
  loading: boolean;
  error: string | null;
}

export default function MessagePage({ params }: MessagePageProps) {
  const chatThreadRef = useRef<ChatThreadRef>(null);
  const [data, setData] = useState<ConversationData>({
    conversation: null,
    currentUser: null,
    bookingRequest: null,
    loading: true,
    error: null,
  });
  const [processingRequest, setProcessingRequest] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    let hasLoaded = false;

    async function loadConversationData() {
      try {
        const response = await fetch(`/api/conversations/${params.conversationId}`);
        const result = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            if (isMounted) router.push('/auth/login');
            return;
          }
          throw new Error(result.error || 'Failed to load conversation');
        }

        hasLoaded = true;
        if (isMounted) {
          setData({
            conversation: result.conversation,
            currentUser: result.currentUser,
            bookingRequest: result.bookingRequest,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        hasLoaded = true;
        if (isMounted) {
          setData(prev => ({
            ...prev,
            error: err instanceof Error ? err.message : 'An unexpected error occurred',
            loading: false
          }));
        }
      }
    }

    const timeoutId = setTimeout(() => {
      if (isMounted && !hasLoaded) {
        setData(prev => ({
          ...prev,
          error: 'Loading took too long. Please try again.',
          loading: false
        }));
      }
    }, 15000);

    loadConversationData();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.conversationId]);

  async function handleAcceptRequest() {
    if (!data.bookingRequest) return;

    setProcessingRequest(true);
    try {
      const response = await fetch(`/api/requests/${data.bookingRequest.id}/accept`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept request');
      }

      window.location.reload();
    } catch (error) {
      alert(`Failed to accept request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProcessingRequest(false);
    }
  }

  async function handleDeclineRequest() {
    if (!data.bookingRequest) return;

    if (!confirm('Are you sure you want to decline this booking request?')) {
      return;
    }

    setProcessingRequest(true);
    try {
      const response = await fetch(`/api/requests/${data.bookingRequest.id}/decline`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to decline request');
      }

      window.location.reload();
    } catch (error) {
      alert(`Failed to decline request: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProcessingRequest(false);
    }
  }

  const formatSessionTime = (startDate: string, endDate: string, timezone: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const dateStr = start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const startTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const endTime = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return { dateStr, timeStr: `${startTime} - ${endTime}` };
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          bg: 'bg-amber-100',
          text: 'text-amber-700',
          border: 'border-amber-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Awaiting Confirmation'
        };
      case 'accepted':
        return {
          bg: 'bg-green-100',
          text: 'text-green-700',
          border: 'border-green-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Confirmed'
        };
      case 'declined':
        return {
          bg: 'bg-red-100',
          text: 'text-red-700',
          border: 'border-red-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Declined'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: null,
          label: status.charAt(0).toUpperCase() + status.slice(1)
        };
    }
  };

  if (data.loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* Header skeleton */}
        <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full"></div>
              <div>
                <div className="h-5 bg-white/20 rounded w-32 mb-2"></div>
                <div className="h-3 bg-white/20 rounded w-24"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/messages" className="inline-flex items-center text-white/80 hover:text-white transition-colors">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Messages
            </Link>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Conversation</h3>
            <p className="text-red-600 mb-4">{data.error}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => router.push('/messages')}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Back to Messages
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-[#F45A14] text-white font-medium rounded-xl hover:bg-[#E04D0B] transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const otherParticipant = data.conversation.participants.find(
    (p: any) => p.user_id !== data.currentUser.id
  )?.profile;

  const isCoach = data.currentUser.role === 'coach';
  const booking = data.bookingRequest;
  const statusConfig = booking ? getStatusConfig(booking.status) : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Compact Header */}
      <div className="bg-gradient-to-r from-[#123C7A] to-[#1E5BB5] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/messages"
                className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>

              {/* Participant Info */}
              <div className="flex items-center gap-3">
                {otherParticipant?.avatar_url ? (
                  <img
                    src={otherParticipant.avatar_url}
                    alt={otherParticipant.full_name || 'User'}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30"
                  />
                ) : (
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center ring-2 ring-white/30">
                    <span className="text-white font-bold">
                      {otherParticipant?.full_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="font-semibold">
                    {otherParticipant?.full_name || 'Conversation'}
                  </h1>
                  <p className="text-sm text-blue-100">
                    {otherParticipant?.role === 'coach' ? 'Coach' : 'Athlete'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            {statusConfig && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Session Info Card */}
      {booking && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-2 relative z-10">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {/* Session Details */}
                <div className="flex items-center gap-4">
                  {/* Session Type Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    booking.listing?.listing_type === 'film_review'
                      ? 'bg-purple-100'
                      : 'bg-blue-100'
                  }`}>
                    {booking.listing?.listing_type === 'film_review' ? (
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#123C7A]">
                      {booking.listing?.title || 'Coaching Session'}
                    </h3>
                    {booking.proposed_start && booking.proposed_end && (
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatSessionTime(booking.proposed_start, booking.proposed_end, booking.timezone).dateStr}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatSessionTime(booking.proposed_start, booking.proposed_end, booking.timezone).timeStr}
                        </span>
                        {booking.listing?.duration_minutes && (
                          <span className="text-gray-400">
                            ({booking.listing.duration_minutes} min)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons for Coach */}
                {booking.status === 'pending' && isCoach && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDeclineRequest}
                      disabled={processingRequest}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Decline
                    </button>
                    <button
                      onClick={handleAcceptRequest}
                      disabled={processingRequest}
                      className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {processingRequest ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Accept Request
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Waiting indicator for athlete */}
                {booking.status === 'pending' && !isCoach && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                    <div className="relative">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-amber-500 rounded-full absolute top-0 animate-ping"></div>
                    </div>
                    Waiting for coach to confirm
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col min-h-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 overflow-hidden" style={{ minHeight: '400px', maxHeight: 'calc(100vh - 280px)' }}>
          {/* Chat Messages */}
          <ChatThread
            ref={chatThreadRef}
            conversationId={params.conversationId}
            currentUserId={data.currentUser.id}
            otherParticipant={otherParticipant}
          />

          {/* Message Input */}
          <ChatComposer
            conversationId={params.conversationId}
            placeholder={`Message ${otherParticipant?.full_name || 'participant'}...`}
            onSendMessage={() => {
              chatThreadRef.current?.refreshMessages();
            }}
          />
        </div>
      </div>
    </div>
  );
}
