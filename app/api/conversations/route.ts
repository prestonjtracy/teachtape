import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET() {
  try {
    console.log('🔍 [API /conversations] Starting...');

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('❌ [API /conversations] No user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('✅ [API /conversations] User authenticated:', user.email);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [API /conversations] Profile error:', profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.log('✅ [API /conversations] Profile loaded:', profile.full_name, 'ID:', profile.id);

    // Get conversation IDs where user is a participant
    // Using a raw query approach to avoid RLS issues
    const { data: userConversations, error: userConvError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', profile.id);

    console.log('📋 [API /conversations] conversation_participants result:', {
      count: userConversations?.length || 0,
      error: userConvError?.message
    });

    if (userConvError) {
      console.error('❌ [API /conversations] Error getting user conversations:', userConvError);
      return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
    }

    if (!userConversations?.length) {
      console.log('ℹ️ [API /conversations] No conversations found for user');
      return NextResponse.json({
        conversations: [],
        currentUser: profile
      });
    }

    const conversationIds = userConversations.map(uc => uc.conversation_id);
    console.log('📋 [API /conversations] Found conversation IDs:', conversationIds);

    // Get conversations
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (conversationsError) {
      console.error('❌ [API /conversations] Error fetching conversations:', conversationsError);
      return NextResponse.json({ error: "Failed to load conversations" }, { status: 500 });
    }

    console.log('✅ [API /conversations] Conversations loaded:', conversationsData?.length || 0);

    // Build full conversation data
    const conversationsWithDetails = await Promise.all(
      (conversationsData || []).map(async (conversation) => {
        // Get all participants for this conversation
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id, role')
          .eq('conversation_id', conversation.id);

        // Get profiles for all participants
        const participantIds = (participants || []).map(p => p.user_id);
        const { data: participantProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role')
          .in('id', participantIds);

        // Merge participant data with profiles
        const participantsWithProfiles = (participants || []).map(participant => {
          const profileData = participantProfiles?.find(p => p.id === participant.user_id);
          return {
            user_id: participant.user_id,
            role: participant.role,
            profile: profileData || null
          };
        });

        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get sender profile for last message
        let lastMessageWithSender = null;
        if (lastMessage) {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', lastMessage.sender_id)
            .maybeSingle();

          lastMessageWithSender = {
            ...lastMessage,
            sender: senderProfile
          };
        }

        return {
          ...conversation,
          participants: participantsWithProfiles,
          lastMessage: lastMessageWithSender
        };
      })
    );

    console.log('✅ [API /conversations] All data loaded successfully');

    return NextResponse.json({
      conversations: conversationsWithDetails,
      currentUser: profile
    });

  } catch (error) {
    console.error('❌ [API /conversations] Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
