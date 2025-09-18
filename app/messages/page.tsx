'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { MessageWithSender } from '@/types/db';

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
    };
  }>;
  lastMessage: MessageWithSender | null;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadConversations() {
      try {
        console.log('🔍 [Messages] Starting to load conversations...');
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.log('❌ [Messages] No user found, redirecting to login');
          router.push('/auth/login');
          return;
        }

        console.log('✅ [Messages] User authenticated:', user.email);

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('auth_user_id', user.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ [Messages] Profile error:', profileError);
          setError('Profile not found');
          setLoading(false);
          return;
        }

        console.log('✅ [Messages] Profile loaded:', profile.full_name);
        setCurrentUser(profile);

        // Get conversation IDs where user is a participant
        const { data: userConversations, error: userConvError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', profile.id);

        if (userConvError) {
          console.error('❌ [Messages] Error getting user conversations:', userConvError);
          setError('Failed to load conversations');
          setLoading(false);
          return;
        }

        if (!userConversations?.length) {
          console.log('ℹ️ [Messages] No conversations found for user');
          setConversations([]);
          setLoading(false);
          return;
        }

        const conversationIds = userConversations.map(uc => uc.conversation_id);
        console.log('📋 [Messages] Found conversation IDs:', conversationIds);

        // Get conversations with participants
        const { data: conversationsData, error: conversationsError } = await supabase
          .from('conversations')
          .select(`
            *,
            participants:conversation_participants(
              user_id,
              role,
              profile:profiles!conversation_participants_user_id_fkey(
                id,
                full_name,
                avatar_url,
                role
              )
            )
          `)
          .in('id', conversationIds)
          .order('updated_at', { ascending: false });

        if (conversationsError) {
          console.error('❌ [Messages] Error fetching conversations:', conversationsError);
          setError('Failed to load conversations');
          setLoading(false);
          return;
        }

        console.log('✅ [Messages] Conversations loaded:', conversationsData?.length || 0);

        // Get the latest message for each conversation
        const conversationsWithLastMessage = await Promise.all(
          (conversationsData || []).map(async (conversation) => {
            const { data: lastMessage } = await supabase
              .from('messages')
              .select(`
                *,
                sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
              `)
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              ...conversation,
              lastMessage: lastMessage as MessageWithSender | null,
            };
          })
        );

        setConversations(conversationsWithLastMessage);
        setLoading(false);
        console.log('✅ [Messages] All data loaded successfully');

      } catch (err) {
        console.error('❌ [Messages] Unexpected error:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    }

    loadConversations();
  }, [router]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const truncateMessage = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-8 w-8 border-2 border-brand-primary border-t-transparent rounded-full"></div>
          <span className="text-gray-600">Loading your conversations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Error Loading Messages</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-gray-600 mt-1">
              {conversations.length === 0 
                ? 'No conversations yet' 
                : `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`
              }
            </p>
          </div>
          <Link 
            href="/dashboard"
            className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Conversations List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {conversations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-500 mb-6">
                {currentUser?.role === 'coach' 
                  ? 'When athletes request sessions, conversations will appear here.'
                  : 'Start by requesting a session with a coach to begin chatting.'
                }
              </p>
              <Link 
                href="/coaches"
                className="inline-block bg-brand-primary text-white px-6 py-3 rounded-lg hover:bg-brand-primary/90 transition-colors"
              >
                {currentUser?.role === 'coach' ? 'View Your Listings' : 'Find Coaches'}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {conversations.map((conversation) => {
                // Find the other participant (not the current user)
                const otherParticipant = conversation.participants.find(
                  (p: any) => p.user_id !== currentUser.id
                )?.profile;

                const lastMessage = conversation.lastMessage;

                return (
                  <Link
                    key={conversation.id}
                    href={`/messages/${conversation.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          {/* Avatar */}
                          <div className="flex-shrink-0">
                            {otherParticipant?.avatar_url ? (
                              <img
                                src={otherParticipant.avatar_url}
                                alt={otherParticipant.full_name || 'User'}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center">
                                <span className="text-brand-primary font-medium text-lg">
                                  {otherParticipant?.full_name?.charAt(0) || '?'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Conversation Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {otherParticipant?.full_name || 'Unknown User'}
                              </h3>
                              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                {lastMessage ? formatTime(lastMessage.created_at) : formatTime(conversation.updated_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 truncate mt-1">
                              {lastMessage ? (
                                <>
                                  {lastMessage.sender_id === currentUser.id && (
                                    <span className="text-gray-500">You: </span>
                                  )}
                                  {lastMessage.kind === 'system' || lastMessage.kind === 'booking_request' ? (
                                    <span className="italic">{truncateMessage(lastMessage.body)}</span>
                                  ) : (
                                    truncateMessage(lastMessage.body)
                                  )}
                                </>
                              ) : (
                                <span className="italic text-gray-400">No messages yet</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Status indicator */}
                        <div className="flex items-center space-x-2 ml-4">
                          <div className="text-gray-400">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}