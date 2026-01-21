'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
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

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Server returned an invalid response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setMessage('');

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      if (onSendMessage) {
        onSendMessage({
          body: message.trim(),
          kind: 'text'
        });
      }

    } catch (err) {
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

    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = Math.min(textarea.scrollHeight, 120);
    textarea.style.height = scrollHeight + 'px';

    if (error) {
      setError(null);
    }
  };

  const canSend = message.trim().length > 0 && !sending && !disabled && message.length <= 2000;

  return (
    <div className="border-t border-gray-100 bg-white p-4">
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded-full transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* Input Container */}
        <div className="flex-1 relative">
          <div className={cn(
            'relative rounded-2xl border bg-gray-50 transition-all duration-200',
            message.length > 0 ? 'border-[#123C7A]/30 bg-white shadow-sm' : 'border-gray-200',
            error && 'border-red-300'
          )}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || sending}
              className={cn(
                'w-full resize-none bg-transparent px-4 py-3 pr-12 text-sm text-gray-800 placeholder-gray-400',
                'focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed',
                'min-h-[44px] max-h-[120px]'
              )}
              style={{ height: 'auto' }}
            />

            {/* Character count */}
            {message.length > 1800 && (
              <div className={cn(
                'absolute bottom-2 right-3 text-xs font-medium',
                message.length > 1950 ? 'text-red-500' : 'text-gray-400'
              )}>
                {message.length}/2000
              </div>
            )}
          </div>

          {/* Helper text */}
          <div className="mt-1.5 flex items-center justify-between px-1">
            <span className="text-xs text-gray-400">
              Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-medium">Enter</kbd> to send
            </span>
            <span className="text-xs text-gray-400">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-medium">Shift + Enter</kbd> for new line
            </span>
          </div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 mb-6',
            canSend
              ? 'bg-gradient-to-r from-[#F45A14] to-[#FF7A3D] text-white shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-105'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className={cn('w-5 h-5 transition-transform', canSend && 'group-hover:translate-x-0.5')}
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
          )}
        </button>
      </div>
    </div>
  );
}
