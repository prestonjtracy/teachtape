'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ChatThread } from '@/components/chat/ChatThread';
import { ChatComposer } from '@/components/chat/ChatComposer';
import Link from 'next/link';

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
  const [data, setData] = useState<ConversationData>({
    conversation: null,
    currentUser: null,
    bookingRequest: null,
    loading: true,
    error: null,
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadConversationData() {
      try {
        console.log('🔍 [Conversation] Loading conversation:', params.conversationId);

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.log('❌ [Conversation] No user found, redirecting to login');
          router.push('/auth/login');
          return;
        }

        console.log('✅ [Conversation] User authenticated:', user.email);

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('auth_user_id', user.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ [Conversation] Profile error:', profileError);
          setData(prev => ({ ...prev, error: 'Profile not found', loading: false }));
          return;
        }

        console.log('✅ [Conversation] Profile loaded:', profile.full_name);

        // Check if user is a participant in this conversation
        const { data: participant, error: participantError } = await supabase
          .from('conversation_participants')
          .select('*')
          .eq('conversation_id', params.conversationId)
          .eq('user_id', profile.id)
          .single();

        if (participantError || !participant) {
          console.error('❌ [Conversation] Not a participant:', participantError);
          setData(prev => ({ ...prev, error: 'Conversation not found', loading: false }));
          return;
        }

        console.log('✅ [Conversation] User is participant');

        // Get conversation details with all participants
        const { data: conversation, error: conversationError } = await supabase
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
          .eq('id', params.conversationId)
          .single();

        if (conversationError || !conversation) {
          console.error('❌ [Conversation] Error loading conversation:', conversationError);
          setData(prev => ({ ...prev, error: 'Conversation not found', loading: false }));
          return;
        }

        console.log('✅ [Conversation] Conversation loaded');

        // Get related booking request if any
        const { data: bookingRequest } = await supabase
          .from('booking_requests')
          .select(`
            *,
            listing:listings(title, price_cents, duration_minutes)
          `)
          .eq('conversation_id', params.conversationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('✅ [Conversation] Booking request loaded:', bookingRequest ? 'found' : 'none');

        setData({
          conversation,
          currentUser: profile,
          bookingRequest,
          loading: false,
          error: null,
        });

      } catch (err) {
        console.error('❌ [Conversation] Unexpected error:', err);
        setData(prev => ({ ...prev, error: 'An unexpected error occurred', loading: false }));
      }
    }

    loadConversationData();
  }, [params.conversationId, router]);

  if (data.loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-8 w-8 border-2 border-brand-primary border-t-transparent rounded-full"></div>
          <span className="text-gray-600">Loading conversation...</span>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Error Loading Conversation</h2>
          <p className="text-gray-600 mb-4">{data.error}</p>
          <div className="space-x-3">
            <button 
              onClick={() => router.push('/messages')}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back to Messages
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Find the other participant (not the current user)
  const otherParticipant = data.conversation.participants.find(
    (p: any) => p.user_id !== data.currentUser.id
  )?.profile;

  const isCoach = data.currentUser.role === 'coach';

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/messages"
              className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Messages
            </Link>
          </div>
          
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">
              {otherParticipant?.full_name || 'Conversation'}
            </h1>
            {data.bookingRequest && (
              <p className="text-sm text-gray-500">
                {data.bookingRequest.listing?.title || 'Coaching Session'}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {data.bookingRequest && (
              <div className="text-sm">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  data.bookingRequest.status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-800'
                    : data.bookingRequest.status === 'accepted'
                    ? 'bg-green-100 text-green-800'
                    : data.bookingRequest.status === 'declined'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {data.bookingRequest.status.charAt(0).toUpperCase() + data.bookingRequest.status.slice(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Request Info */}
      {data.bookingRequest && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 8a2 2 0 110-4 2 2 0 010 4zm0 0v3m-4-3a4 4 0 108 0v-3m-4-3V9" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {data.bookingRequest.listing?.title || 'Coaching Session'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(data.bookingRequest.proposed_start).toLocaleDateString()} • {' '}
                    {new Date(data.bookingRequest.proposed_start).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {' '}
                    {new Date(data.bookingRequest.proposed_end).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} ({data.bookingRequest.timezone})
                  </p>
                </div>
              </div>
              
              {data.bookingRequest.status === 'pending' && isCoach && (
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                    Accept
                  </button>
                  <button className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                    Decline
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className="max-w-4xl mx-auto px-4 pb-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col" style={{ height: '600px' }}>
          {/* Chat Messages */}
          <ChatThread 
            conversationId={params.conversationId}
            currentUserId={data.currentUser.id}
          />
          
          {/* Message Input */}
          <ChatComposer 
            conversationId={params.conversationId}
            placeholder={`Message ${otherParticipant?.full_name || 'participant'}...`}
          />
        </div>
      </div>

      {/* Helper Text */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <div className="text-center text-sm text-gray-500">
          {data.bookingRequest?.status === 'pending' ? (
            isCoach ? (
              <p>💡 Review the request details above and respond to finalize the booking.</p>
            ) : (
              <p>⏳ Waiting for coach confirmation. Feel free to message any questions!</p>
            )
          ) : (
            <p>💬 Use this chat to coordinate details and communicate about your session.</p>
          )}
        </div>
      </div>
    </div>
  );
}