'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageWithSender } from '@/types/db';
import { cn } from '@/lib/utils';

interface ChatThreadProps {
  conversationId: string;
  currentUserId: string;
}

export function ChatThread({ conversationId, currentUserId }: ChatThreadProps) {
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial messages
    async function fetchMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
          `)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        setMessages(data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError(err instanceof Error ? err.message : 'Failed to load messages');
        setLoading(false);
      }
    }

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
          // Fetch the complete message with sender info
          const { data } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, data]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

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
    return message.kind === 'booking_request' || message.kind === 'system';
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
              <div className="flex justify-center my-3">
                <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-2 rounded-full max-w-md text-center">
                  {message.body}
                </div>
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
                    {message.body}
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
}