'use client';

import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageWithSender } from '@/types/db';
import { cn } from '@/lib/utils';
import DOMPurify from 'isomorphic-dompurify';

interface ChatThreadProps {
  conversationId: string;
  currentUserId: string;
  otherParticipant?: {
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
}

export interface ChatThreadRef {
  refreshMessages: () => Promise<void>;
}

export const ChatThread = forwardRef<ChatThreadRef, ChatThreadProps>(
  function ChatThread({ conversationId, currentUserId, otherParticipant }, ref) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load messages');
      }

      setMessages(result.messages || []);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      setLoading(false);
    }
  }, [conversationId]);

  useImperativeHandle(ref, () => ({
    refreshMessages: fetchMessages
  }), [fetchMessages]);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    fetchMessages();

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
        async () => {
          if (isMounted) {
            await fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchMessages]);

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
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const shouldShowDateSeparator = (currentMsg: MessageWithSender, prevMsg?: MessageWithSender) => {
    if (!prevMsg) return true;

    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();

    return currentDate !== prevDate;
  };

  const shouldShowAvatar = (currentMsg: MessageWithSender, nextMsg?: MessageWithSender) => {
    if (!nextMsg) return true;
    if (nextMsg.sender_id !== currentMsg.sender_id) return true;

    const currentTime = new Date(currentMsg.created_at).getTime();
    const nextTime = new Date(nextMsg.created_at).getTime();
    return (nextTime - currentTime) > 5 * 60 * 1000;
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
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    });
  };

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
        return null;
      }

      return data.id;
    } catch {
      return null;
    }
  };

  const logZoomClick = async (bookingId: string | null, actionType: 'start_meeting' | 'join_meeting') => {
    try {
      const finalBookingId = bookingId || await findBookingIdByConversation();

      if (!finalBookingId) {
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
    } catch {
      // Don't prevent the user from joining
    }
  };

  const renderBookingAcceptedCard = (message: MessageWithSender) => {
    const metadata = message.metadata as any;

    return (
      <div className="max-w-2xl w-full mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-200 shadow-lg">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-200/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-200/40 to-transparent rounded-full translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative p-6">
            {/* Success Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#123C7A]">Booking Confirmed!</h3>
                <p className="text-sm text-green-600 font-medium">Payment processed successfully</p>
              </div>
            </div>

            {/* Meeting Details */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/80">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="font-semibold text-[#123C7A]">Zoom Meeting Ready</span>
              </div>

              {metadata?.starts_at && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    {formatDateTime(metadata.starts_at, metadata.timezone || 'UTC')}
                    {metadata.ends_at && ` – ${formatDateTime(metadata.ends_at, metadata.timezone || 'UTC', { timeOnly: true })}`}
                  </span>
                </div>
              )}
            </div>

            {/* Zoom Buttons */}
            {(metadata?.athlete_join_url || metadata?.coach_start_url) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {metadata.athlete_join_url && (
                  <button
                    onClick={async () => {
                      await logZoomClick(metadata.booking_id, 'join_meeting');
                      window.open(metadata.athlete_join_url, '_blank');
                    }}
                    className="group flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-[#F45A14] to-[#FF7A3D] text-white font-semibold rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Join Meeting</span>
                    <svg className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                )}

                {metadata.coach_start_url && (
                  <button
                    onClick={async () => {
                      await logZoomClick(metadata.booking_id, 'start_meeting');
                      window.open(metadata.coach_start_url, '_blank');
                    }}
                    className="group flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-[#123C7A] font-semibold rounded-xl border-2 border-[#123C7A] hover:bg-[#123C7A] hover:text-white hover:scale-[1.02] transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Start Meeting (Coach)</span>
                  </button>
                )}
              </div>
            )}

            {/* Fallback for messages without metadata */}
            {!metadata?.athlete_join_url && !metadata?.coach_start_url && (
              <div className="text-sm text-gray-500 text-center py-2">
                Zoom meeting links will appear in your email confirmation.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMessageBody = (body: string, isOwn: boolean, isSystemMsg = false, message?: MessageWithSender) => {
    let cleanBody = body;

    cleanBody = cleanBody.replace(/<button[^>]*>.*?<\/button>/gi, '');
    cleanBody = cleanBody.replace(/<a[^>]*>.*?Join Meeting.*?<\/a>/gi, '');
    cleanBody = cleanBody.replace(/<div[^>]*>.*?Join Meeting.*?<\/div>/gi, '');
    cleanBody = cleanBody.replace(/Join Meeting(?![a-zA-Z])/g, '');
    cleanBody = cleanBody.replace(/<(?!\/?(strong|b)\b)[^>]*>/gi, '');

    body = cleanBody;
    body = body.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const markdownLinkRegex = /\[([^\]]*)\]\((https?:\/\/[^\)]+)\)/gi;
    let processedBody = body;
    const markdownButtons: JSX.Element[] = [];
    let match;

    while ((match = markdownLinkRegex.exec(body)) !== null) {
      const [fullMatch, linkText, url] = match;
      const placeholder = `__MARKDOWN_BUTTON_${markdownButtons.length}__`;
      processedBody = processedBody.replace(fullMatch, placeholder);

      const isStartButton = linkText.toLowerCase().includes('start');
      const isJoinButton = linkText.toLowerCase().includes('join');

      let buttonStyle = 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm';

      if (isSystemMsg) {
        if (isStartButton) {
          buttonStyle = 'bg-[#123C7A] text-white hover:bg-[#0d2d5c] shadow-sm';
        } else if (isJoinButton) {
          buttonStyle = 'bg-gradient-to-r from-[#F45A14] to-[#FF7A3D] text-white hover:shadow-lg shadow-sm';
        }
      } else {
        buttonStyle = isOwn
          ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
          : 'bg-[#123C7A] text-white hover:bg-[#0d2d5c] shadow-sm';
      }

      markdownButtons.push(
        <div key={markdownButtons.length} className="mt-3">
          <button
            onClick={async (e) => {
              e.preventDefault();

              if (message && url.includes('zoom')) {
                const actionType = isStartButton ? 'start_meeting' : 'join_meeting';
                try {
                  await logZoomClick(null, actionType);
                } catch {
                  // Continue anyway
                }
              }

              window.open(url, '_blank');
            }}
            className={cn(
              'inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 cursor-pointer',
              buttonStyle
            )}
          >
            {linkText}
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      );
    }

    markdownLinkRegex.lastIndex = 0;

    const zoomUrlRegex = /(https?:\/\/[^\s]*zoom[^\s]*)/gi;
    const parts = processedBody.split(zoomUrlRegex);

    return parts.map((part, index) => {
      const markdownButtonMatch = part.match(/__MARKDOWN_BUTTON_(\d+)__/);
      if (markdownButtonMatch) {
        const buttonIndex = parseInt(markdownButtonMatch[1]);
        return markdownButtons[buttonIndex];
      }

      if (zoomUrlRegex.test(part) && markdownButtons.length === 0) {
        const isJoinUrl = part.includes('/j/') || part.toLowerCase().includes('join');
        const buttonText = isJoinUrl ? 'Join Zoom Meeting' : 'Start Zoom Meeting';

        const buttonStyle = isSystemMsg
          ? 'bg-gradient-to-r from-[#F45A14] to-[#FF7A3D] text-white shadow-sm hover:shadow-lg'
          : isOwn
            ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
            : 'bg-[#123C7A] text-white hover:bg-[#0d2d5c] shadow-sm';

        return (
          <div key={index} className="mt-3">
            <a
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105',
                buttonStyle
              )}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {buttonText}
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        );
      } else {
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

  const renderAvatar = (isOwn: boolean, sender?: any) => {
    if (isOwn) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F45A14] to-[#FF7A3D] flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white text-xs font-bold">You</span>
        </div>
      );
    }

    if (otherParticipant?.avatar_url) {
      return (
        <img
          src={otherParticipant.avatar_url}
          alt={otherParticipant.full_name || 'User'}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-100"
        />
      );
    }

    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] flex items-center justify-center flex-shrink-0 shadow-sm">
        <span className="text-white text-xs font-bold">
          {otherParticipant?.full_name?.charAt(0).toUpperCase() || sender?.full_name?.charAt(0).toUpperCase() || '?'}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 border-3 border-[#123C7A]/20 rounded-full"></div>
            <div className="w-10 h-10 border-3 border-[#123C7A] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <span className="text-gray-500 text-sm">Loading messages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center p-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Error loading messages</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#123C7A]/10 to-[#1E5BB5]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#123C7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#123C7A] mb-1">No messages yet</h3>
          <p className="text-sm text-gray-500">Start the conversation by sending a message below.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="messages-container"
      className="flex-1 overflow-y-auto px-4 py-4 bg-gradient-to-b from-gray-50 to-white"
    >
      <div className="space-y-1">
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : undefined;
          const nextMessage = index < messages.length - 1 ? messages[index + 1] : undefined;
          const isOwn = message.sender_id === currentUserId;
          const showDate = shouldShowDateSeparator(message, prevMessage);
          const showAvatar = shouldShowAvatar(message, nextMessage);
          const isSystem = isSystemMessage(message);

          const isFirstInSequence = !prevMessage || prevMessage.sender_id !== message.sender_id;

          return (
            <div key={message.id}>
              {showDate && (
                <div className="flex justify-center my-6">
                  <div className="bg-gray-100 text-gray-500 text-xs px-4 py-1.5 rounded-full font-medium">
                    {formatDate(message.created_at)}
                  </div>
                </div>
              )}

              {isSystem ? (
                <div className="my-6">
                  {message.kind === 'booking_accepted' ? (
                    renderBookingAcceptedCard(message)
                  ) : (
                    <div className="max-w-2xl mx-auto">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-700 whitespace-pre-wrap">
                              {renderMessageBody(message.body, false, true, message)}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              {formatTime(message.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={cn(
                  'flex items-end gap-2',
                  isOwn ? 'flex-row-reverse' : 'flex-row',
                  isFirstInSequence ? 'mt-4' : 'mt-0.5'
                )}>
                  {/* Avatar - only show on last message in sequence */}
                  <div className="w-8 flex-shrink-0">
                    {showAvatar && renderAvatar(isOwn, message.sender)}
                  </div>

                  {/* Message bubble */}
                  <div className={cn(
                    'group max-w-md relative',
                    isOwn ? 'items-end' : 'items-start'
                  )}>
                    <div className={cn(
                      'px-4 py-2.5 rounded-2xl shadow-sm',
                      isOwn
                        ? 'bg-gradient-to-br from-[#123C7A] to-[#1E5BB5] text-white'
                        : 'bg-white text-gray-800 border border-gray-100',
                      isOwn
                        ? (showAvatar ? 'rounded-br-md' : 'rounded-br-md')
                        : (showAvatar ? 'rounded-bl-md' : 'rounded-bl-md')
                    )}>
                      <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {renderMessageBody(message.body, isOwn, false, message)}
                      </div>
                    </div>

                    {/* Timestamp - show on hover or on last message in sequence */}
                    <div className={cn(
                      'text-xs mt-1 transition-opacity duration-200',
                      isOwn ? 'text-right pr-1' : 'text-left pl-1',
                      showAvatar ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                      'text-gray-400'
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
    </div>
  );
});
