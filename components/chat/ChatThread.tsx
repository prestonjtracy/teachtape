'use client';

import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageWithSender } from '@/types/db';
import { cn } from '@/lib/utils';
import DOMPurify from 'isomorphic-dompurify';

interface ChatThreadProps {
  conversationId: string;
  currentUserId: string;
}

export interface ChatThreadRef {
  refreshMessages: () => Promise<void>;
}

export const ChatThread = forwardRef<ChatThreadRef, ChatThreadProps>(
  function ChatThread({ conversationId, currentUserId }, ref) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch messages function - extracted so it can be called externally
  const fetchMessages = useCallback(async () => {
    try {
      console.log('🔍 [ChatThread] Fetching messages from API:', conversationId);

      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        credentials: 'include',
      });
      const result = await response.json();

      console.log('📋 [ChatThread] API response:', { status: response.status });

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load messages');
      }

      setMessages(result.messages || []);
      setLoading(false);
      console.log('✅ [ChatThread] Loaded', result.messages?.length || 0, 'messages');
    } catch (err) {
      console.error('❌ [ChatThread] Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      setLoading(false);
    }
  }, [conversationId]);

  // Expose refreshMessages to parent component
  useImperativeHandle(ref, () => ({
    refreshMessages: fetchMessages
  }), [fetchMessages]);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    fetchMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('🔔 [ChatThread] Real-time message received:', payload);
          // Fetch all messages again via API to get sender info
          if (isMounted) {
            await fetchMessages();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [ChatThread] Subscription status:', status);
      });

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    };

    scrollToBottom();
  }, [messages]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const shouldShowDateSeparator = (currentMsg: MessageWithSender, prevMsg?: MessageWithSender) => {
    if (!prevMsg) return true;
    
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    
    return currentDate !== prevDate;
  };

  const isSystemMessage = (message: MessageWithSender) => {
    return message.kind === 'booking_request' || message.kind === 'system' || message.kind === 'booking_accepted';
  };

  const formatDateTime = (dateString: string, timezone: string, options?: { timeOnly?: boolean }) => {
    const date = new Date(dateString);
    if (options?.timeOnly) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone,
      });
    }
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    });
  };

  // Function to find booking ID by conversation ID
  const findBookingIdByConversation = async (): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        console.error('Failed to find booking ID:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error finding booking ID:', error);
      return null;
    }
  };

  // Function to log zoom button clicks
  const logZoomClick = async (bookingId: string | null, actionType: 'start_meeting' | 'join_meeting') => {
    try {
      // If no booking ID provided, try to find it from the conversation
      const finalBookingId = bookingId || await findBookingIdByConversation();

      if (!finalBookingId) {
        console.log('No booking ID available for zoom log');
        return;
      }

      await fetch('/api/zoom-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: finalBookingId,
          action_type: actionType,
        }),
      });
    } catch (error) {
      console.error('Failed to log zoom click:', error);
      // Don't prevent the user from joining - just log the error
    }
  };

  // Render booking accepted success card
  const renderBookingAcceptedCard = (message: MessageWithSender) => {
    const metadata = message.metadata as any;
    if (!metadata || metadata.type !== 'booking_accepted') {
      return null;
    }

    return (
      <div className="rounded-xl border border-[#FF5A1F]/20 bg-gradient-to-br from-white to-orange-50/30 p-5 shadow-md ring-1 ring-[#FF5A1F]/10">
        <div className="flex items-start gap-3">
          {/* Check Circle Icon */}
          <svg className="h-6 w-6 text-[#FF5A1F] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#123C7A]">
              Booking accepted! Payment processed successfully.
            </h3>

            <div className="mt-3 flex items-center gap-2 text-sm text-[#123C7A]">
              {/* Calendar Icon */}
              <svg className="h-4 w-4 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Zoom Meeting Ready</span>
            </div>

            <p className="mt-1 text-sm text-[#123C7A]/80">
              {formatDateTime(metadata.starts_at, metadata.timezone)} – {formatDateTime(metadata.ends_at, metadata.timezone, { timeOnly: true })}
            </p>

            {metadata.athlete_join_url && metadata.coach_start_url && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  onClick={async () => {
                    await logZoomClick(metadata.booking_id, 'join_meeting');
                    window.open(metadata.athlete_join_url, '_blank');
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF5A1F] px-4 py-2.5 text-white hover:bg-[#FF5A1F]/90 transition-all shadow-sm hover:shadow-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF5A1F]"
                >
                  {/* Video Icon */}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Join Zoom Meeting</span>
                  <span className="sr-only">(Athlete)</span>
                </button>

                <button
                  onClick={async () => {
                    await logZoomClick(metadata.booking_id, 'start_meeting');
                    window.open(metadata.coach_start_url, '_blank');
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-[#FF5A1F] ring-2 ring-[#FF5A1F] hover:bg-orange-50 transition-all shadow-sm hover:shadow-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF5A1F]"
                >
                  {/* Video Icon */}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Start Zoom Meeting</span>
                  <span className="sr-only">(Coach)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Function to clean old HTML content and detect and render Zoom URLs and markdown links as buttons
  const renderMessageBody = (body: string, isOwn: boolean, isSystemMessage = false, message?: MessageWithSender) => {
    // Clean up any old HTML content that might contain buttons
    let cleanBody = body;
    
    // Remove any HTML elements that might contain Join Meeting buttons
    cleanBody = cleanBody.replace(/<button[^>]*>.*?<\/button>/gi, '');
    cleanBody = cleanBody.replace(/<a[^>]*>.*?Join Meeting.*?<\/a>/gi, '');
    cleanBody = cleanBody.replace(/<div[^>]*>.*?Join Meeting.*?<\/div>/gi, '');
    cleanBody = cleanBody.replace(/Join Meeting(?![a-zA-Z])/g, ''); // Remove standalone "Join Meeting" text
    
    // Remove any HTML tags except for specific safe ones we'll add back
    // Allow <strong> tags for bold formatting, but remove everything else
    cleanBody = cleanBody.replace(/<(?!\/?(strong|b)\b)[^>]*>/gi, '');
    
    // Use the cleaned body for processing
    body = cleanBody;
    
    // Process markdown formatting for bold text
    body = body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // First handle markdown-style links [text](url)
    // Updated regex to handle the format in the message better
    const markdownLinkRegex = /\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/gi;
    let processedBody = body;
    const markdownButtons: JSX.Element[] = [];
    let match;
    
    // Extract markdown links and replace with placeholders
    while ((match = markdownLinkRegex.exec(body)) !== null) {
      const [fullMatch, linkText, url] = match;
      const placeholder = `__MARKDOWN_BUTTON_${markdownButtons.length}__`;
      processedBody = processedBody.replace(fullMatch, placeholder);
      
      // Determine button style based on button type
      const isStartButton = linkText.toLowerCase().includes('start');
      const isJoinButton = linkText.toLowerCase().includes('join');
      
      let buttonStyle = 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm';
      
      if (isSystemMessage) {
        if (isStartButton) {
          buttonStyle = 'bg-green-600 text-white hover:bg-green-700 shadow-sm border border-green-500';
        } else if (isJoinButton) {
          buttonStyle = 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm border border-blue-500';
        }
      } else {
        buttonStyle = isOwn
          ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm';
      }
      
      markdownButtons.push(
        <div key={markdownButtons.length} className="mt-3">
          <button
            onClick={async (e) => {
              e.preventDefault();

              // Try to log the click if we have message context
              if (message && url.includes('zoom')) {
                const actionType = isStartButton ? 'start_meeting' : 'join_meeting';
                try {
                  // Log the zoom click (will look up booking_id from conversation)
                  await logZoomClick(null, actionType);
                } catch (error) {
                  console.error('Failed to log zoom click:', error);
                }
              }

              // Open the zoom URL
              window.open(url, '_blank');
            }}
            className={cn(
              'inline-flex items-center px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-pointer',
              buttonStyle
            )}
          >
            {linkText}
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      );
    }
    
    // Reset regex for next use
    markdownLinkRegex.lastIndex = 0;
    
    // Only handle raw Zoom URLs if no markdown buttons were created
    // This prevents duplicate buttons when markdown links contain Zoom URLs
    const zoomUrlRegex = /(https?:\/\/[^\s]*zoom[^\s]*)/gi;
    const parts = processedBody.split(zoomUrlRegex);
    
    return parts.map((part, index) => {
      // Check if this is a markdown button placeholder
      const markdownButtonMatch = part.match(/__MARKDOWN_BUTTON_(\d+)__/);
      if (markdownButtonMatch) {
        const buttonIndex = parseInt(markdownButtonMatch[1]);
        return markdownButtons[buttonIndex];
      }
      
      if (zoomUrlRegex.test(part) && markdownButtons.length === 0) {
        // Only create raw Zoom URL buttons if no markdown buttons were created
        // This prevents duplicate buttons when markdown links contain Zoom URLs
        const isJoinUrl = part.includes('/j/') || part.toLowerCase().includes('join');
        const buttonText = isJoinUrl ? '🎥 Join Zoom Meeting' : '🎥 Start Zoom Meeting';
        
        const buttonStyle = isSystemMessage 
          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
          : isOwn
            ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm';
        
        return (
          <div key={index} className="mt-2">
            <a
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                buttonStyle
              )}
            >
              {buttonText}
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        );
      } else {
        // Regular text - preserve line breaks and render HTML for bold formatting
        // Sanitize HTML to prevent XSS attacks - only allow <strong> and <b> tags
        const sanitizedHtml = DOMPurify.sanitize(part, {
          ALLOWED_TAGS: ['strong', 'b'],
          ALLOWED_ATTR: [],
        });

        return (
          <span
            key={index}
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        );
      }
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="animate-spin h-5 w-5 border-2 border-brand-primary border-t-transparent rounded-full"></div>
          <span>Loading messages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️ Error loading messages</div>
          <div className="text-sm text-gray-500">{error}</div>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">💬</div>
          <div className="text-lg font-medium mb-1">No messages yet</div>
          <div className="text-sm">Start the conversation by sending a message below.</div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="messages-container"
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : undefined;
        const isOwn = message.sender_id === currentUserId;
        const showDate = shouldShowDateSeparator(message, prevMessage);
        const isSystem = isSystemMessage(message);

        return (
          <div key={message.id}>
            {showDate && (
              <div className="flex justify-center my-4">
                <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {formatDate(message.created_at)}
                </div>
              </div>
            )}

            {isSystem ? (
              <div className="flex justify-center my-4">
                {message.kind === 'booking_accepted' ? (
                  <div className="max-w-2xl w-full">
                    {/* Try to render the structured card if metadata exists, otherwise fall back to custom design */}
                    {message.metadata && renderBookingAcceptedCard(message) || (
                      <div className="bg-gradient-to-br from-white to-orange-50/30 border border-[#FF5A1F]/20 rounded-xl p-6 shadow-md">
                        {/* Success Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex-shrink-0">
                            <svg className="h-6 w-6 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-[#123C7A]">
                            Booking accepted! Payment processed successfully.
                          </h3>
                        </div>

                        {/* Zoom Meeting Section */}
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="h-5 w-5 text-[#FF5A1F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[#123C7A] font-semibold">Zoom Meeting Ready</span>
                          </div>
                          
                          {/* Extract date from message body */}
                          {(() => {
                            const dateMatch = message.body.match(/📅\s*([^\\n]+)/);
                            const dateText = dateMatch ? dateMatch[1] : '';
                            return dateText && (
                              <div className="flex items-center gap-2 mb-4 text-[#123C7A]/80">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm">{dateText}</span>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Button Sections */}
                        <div className="space-y-4">
                          {/* For Athlete Section */}
                          <div>
                            <h4 className="text-[#123C7A] font-semibold mb-2">For Athlete:</h4>
                            {(() => {
                              const athleteMatch = message.body.match(/\*\*For Athlete:\*\*\s*\[([^\]]+)\]\(([^)]+)\)/);
                              if (athleteMatch) {
                                const [, , url] = athleteMatch;
                                return (
                                  <button
                                    onClick={async () => {
                                      await logZoomClick(null, 'join_meeting');
                                      window.open(url, '_blank');
                                    }}
                                    className="inline-flex items-center gap-2 bg-[#FF5A1F] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#FF5A1F]/90 transition-all shadow-sm hover:shadow-md"
                                  >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Join Zoom Meeting
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          {/* For Coach Section */}
                          <div>
                            <h4 className="text-[#123C7A] font-semibold mb-2">For Coach: Start Meeting</h4>
                            {(() => {
                              const coachMatch = message.body.match(/\*\*For Coach:\*\*\s*\[([^\]]+)\]\(([^)]+)\)/);
                              if (coachMatch) {
                                const [, , url] = coachMatch;
                                return (
                                  <button
                                    onClick={async () => {
                                      await logZoomClick(null, 'start_meeting');
                                      window.open(url, '_blank');
                                    }}
                                    className="inline-flex items-center gap-2 bg-[#FF5A1F] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#FF5A1F]/90 transition-all shadow-sm hover:shadow-md"
                                  >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Join Zoom Meeting
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-900 text-sm px-6 py-4 rounded-xl max-w-2xl shadow-sm">
                    <div className="whitespace-pre-wrap">
                      {renderMessageBody(message.body, false, true, message)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={cn(
                'flex',
                isOwn ? 'justify-end' : 'justify-start'
              )}>
                <div className={cn(
                  'max-w-md px-4 py-2 rounded-2xl',
                  isOwn
                    ? 'bg-brand-primary text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                )}>
                  {!isOwn && message.sender && (
                    <div className="text-xs font-medium text-gray-600 mb-1">
                      {message.sender.full_name || 'Unknown User'}
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {renderMessageBody(message.body, isOwn, false, message)}
                  </div>
                  <div className={cn(
                    'text-xs mt-1',
                    isOwn ? 'text-white/70' : 'text-gray-500'
                  )}>
                    {formatTime(message.created_at)}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});