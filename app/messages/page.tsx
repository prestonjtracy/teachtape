import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MessagesPage() {
  const supabase = createClient();
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect("/auth/login");
  }

  // Get user's profile to determine if they're a coach or athlete
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) {
    redirect("/auth/login");
  }

  // Get conversations for this user through conversation_participants
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select(`
      id,
      created_at,
      conversation_participants (
        user_id,
        role,
        profiles!conversation_participants_user_id_fkey (
          full_name,
          email
        )
      ),
      booking_requests (
        id,
        athlete_id,
        coach_id,
        athlete:profiles!booking_requests_athlete_id_fkey (
          full_name,
          email
        ),
        coach:profiles!booking_requests_coach_id_fkey (
          full_name,
          email
        ),
        listing:listings (
          title
        )
      ),
      messages (
        id,
        body,
        created_at,
        sender_id
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    return <div>Error loading conversations</div>;
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Messages</h1>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No conversations yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Conversations are created when booking requests are made.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>
      
      <div className="space-y-4">
        {conversations.map((conversation) => {
          const bookingRequest = conversation.booking_requests?.[0]; // Get first booking request if any
          const latestMessage = conversation.messages?.[conversation.messages.length - 1];
          
          // Find the other participant (not the current user)
          const otherParticipant = conversation.conversation_participants?.find(
            participant => participant.user_id !== profile.id
          );
          const otherPerson = otherParticipant?.profiles;
          
          return (
            <Link
              key={conversation.id}
              href={`/messages/${conversation.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border border-gray-200"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {otherPerson?.full_name || otherPerson?.email || "Unknown User"}
                    </h3>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">
                      {bookingRequest?.listing?.title || "Conversation"}
                    </span>
                  </div>
                  
                  {latestMessage && (
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {latestMessage.body.length > 100 
                        ? `${latestMessage.body.substring(0, 100)}...`
                        : latestMessage.body
                      }
                    </p>
                  )}
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {new Date(conversation.created_at).toLocaleDateString()}
                  </p>
                  {conversation.messages && conversation.messages.length > 0 && (
                    <p className="text-xs text-gray-400">
                      {conversation.messages.length} message{conversation.messages.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}