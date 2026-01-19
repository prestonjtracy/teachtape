'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  conversationId: string;
  onSendMessage?: (message: { body: string; kind: string }) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatComposer({ 
  conversationId, 
  onSendMessage,
  disabled = false,
  placeholder = "Type your message..." 
}: ChatComposerProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    if (!message.trim() || sending || disabled) return;

    try {
      setSending(true);
      setError(null);

      const response = await fetch('/api/messages/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          conversation_id: conversationId,
          body: message.trim(),
          kind: 'text',
        }),
      });

      // Parse response once
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Server returned an invalid response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }
      
      // Clear the input
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Callback for parent component (optional)
      if (onSendMessage) {
        onSendMessage({
          body: message.trim(),
          kind: 'text'
        });
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = Math.min(textarea.scrollHeight, 120); // Max height ~5 lines
    textarea.style.height = scrollHeight + 'px';
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}
      
      <div className="flex space-x-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || sending}
            className={cn(
              'w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed',
              'min-h-[44px] max-h-[120px]', // ~1 line min, ~5 lines max
              error && 'border-red-300 focus:ring-red-500'
            )}
            style={{ height: 'auto' }}
          />
          
          {/* Character count (optional, shows when approaching limit) */}
          {message.length > 1800 && (
            <div className={cn(
              'absolute bottom-2 right-3 text-xs',
              message.length > 1950 ? 'text-red-500' : 'text-gray-400'
            )}>
              {message.length}/2000
            </div>
          )}
        </div>
        
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sending || disabled || message.length > 2000}
          size="md"
          className="self-end"
        >
          {sending ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Sending...
            </>
          ) : (
            <>
              <svg 
                className="h-4 w-4 mr-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                />
              </svg>
              Send
            </>
          )}
        </Button>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Press Enter to send, Shift + Enter for new line
      </div>
    </div>
  );
}