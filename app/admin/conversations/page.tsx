import { createClient, createAdminClient } from '@/lib/supabase/server'
import ConversationsTable from '@/components/admin/ConversationsTable'

export default async function ConversationsPage() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  
  // Get all conversations with participants and message count
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select(`
      id,
      created_at,
      updated_at,
      conversation_participants (
        role,
        user:profiles!conversation_participants_user_id_fkey (
          id,
          full_name,
          avatar_url,
          auth_user_id
        )
      )
    `)
    .order('updated_at', { ascending: false })

  // Get message counts for each conversation
  let conversationsWithCounts: Array<{
    id: string
    created_at: string
    updated_at: string
    message_count: number
    coach: { id: string; full_name: string; avatar_url: string | null; email: string } | null
    athlete: { id: string; full_name: string; avatar_url: string | null; email: string } | null
  }> = []

  if (conversations) {
    const conversationIds = conversations.map(c => c.id)

    const { data: messageCounts } = await supabase
      .from('messages')
      .select('conversation_id, id')
      .in('conversation_id', conversationIds)

    // Count messages per conversation
    const countMap = messageCounts?.reduce((acc: Record<string, number>, msg) => {
      acc[msg.conversation_id] = (acc[msg.conversation_id] || 0) + 1
      return acc
    }, {}) || {}

    // Get auth users data for email addresses
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
    const userEmailMap = authUsers?.users.reduce((acc: Record<string, string>, user) => {
      acc[user.id] = user.email || 'N/A'
      return acc
    }, {}) || {}

    conversationsWithCounts = conversations.map(conversation => {
      const participants = conversation.conversation_participants || []
      const coachParticipant = participants.find(p => p.role === 'coach')
      const athleteParticipant = participants.find(p => p.role === 'athlete')

      // Supabase returns the joined user as an object, not an array
      const coach = coachParticipant?.user as { id: string; full_name: string; avatar_url: string | null; auth_user_id: string } | null
      const athlete = athleteParticipant?.user as { id: string; full_name: string; avatar_url: string | null; auth_user_id: string } | null

      return {
        id: conversation.id,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        message_count: countMap[conversation.id] || 0,
        coach: coach ? {
          id: coach.id,
          full_name: coach.full_name || 'Unknown',
          avatar_url: coach.avatar_url,
          email: userEmailMap[coach.auth_user_id] || 'N/A'
        } : null,
        athlete: athlete ? {
          id: athlete.id,
          full_name: athlete.full_name || 'Unknown',
          avatar_url: athlete.avatar_url,
          email: userEmailMap[athlete.auth_user_id] || 'N/A'
        } : null
      }
    })
  }

  if (conversationsError) {
    console.error('Error fetching conversations:', conversationsError)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#123A72]">Conversation Management</h1>
        <p className="text-gray-600 mt-2">Monitor chat messages between coaches and athletes</p>
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-yellow-800">
              <strong>Read-only view:</strong> This interface is for monitoring purposes only. Admins cannot send messages.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <ConversationsTable initialConversations={conversationsWithCounts} />
      </div>
    </div>
  )
}