import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatThread } from '@/components/chat/ChatThread';
import { ChatComposer } from '@/components/chat/ChatComposer';
import Link from 'next/link';

interface MessagePageProps {
  params: {
    conversationId: string;
  };
}

async function getConversationData(conversationId: string) {
  const supabase = createClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/login');
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('auth_user_id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/login');
  }

  // Check if user is a participant in this conversation
  const { data: participant, error: participantError } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('user_id', profile.id)
    .single();

  if (participantError || !participant) {
    notFound();
  }

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
    .eq('id', conversationId)
    .single();

  if (conversationError || !conversation) {
    notFound();
  }

  // Get related booking request if any
  const { data: bookingRequest } = await supabase
    .from('booking_requests')
    .select(`
      *,
      listing:listings(title, price_cents, duration_minutes)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    conversation,
    currentUser: profile,
    bookingRequest,
  };
}

export default async function MessagePage({ params }: MessagePageProps) {
  const { conversation, currentUser, bookingRequest } = await getConversationData(params.conversationId);

  // Find the other participant (not the current user)
  const otherParticipant = conversation.participants.find(
    (p: any) => p.user_id !== currentUser.id
  )?.profile;

  const isCoach = currentUser.role === 'coach';

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
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
          
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">
              {otherParticipant?.full_name || 'Conversation'}
            </h1>
            {bookingRequest && (
              <p className="text-sm text-gray-500">
                {bookingRequest.listing?.title || 'Coaching Session'}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {bookingRequest && (
              <div className="text-sm">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                  bookingRequest.status === 'pending' 
                    ? 'bg-yellow-100 text-yellow-800'
                    : bookingRequest.status === 'accepted'
                    ? 'bg-green-100 text-green-800'
                    : bookingRequest.status === 'declined'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {bookingRequest.status.charAt(0).toUpperCase() + bookingRequest.status.slice(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Request Info */}
      {bookingRequest && (
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
                    {bookingRequest.listing?.title || 'Coaching Session'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {new Date(bookingRequest.proposed_start).toLocaleDateString()} • {' '}
                    {new Date(bookingRequest.proposed_start).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {' '}
                    {new Date(bookingRequest.proposed_end).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} ({bookingRequest.timezone})
                  </p>
                </div>
              </div>
              
              {bookingRequest.status === 'pending' && isCoach && (
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
            currentUserId={currentUser.id}
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
          {bookingRequest?.status === 'pending' ? (
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