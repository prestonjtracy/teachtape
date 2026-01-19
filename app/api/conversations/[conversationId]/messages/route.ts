import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const conversationId = params.conversationId;
    console.log('🔍 [API /conversations/:id/messages] Loading messages for:', conversationId);

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('❌ [API /conversations/:id/messages] No user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Verify user is a participant in this conversation
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!participant) {
      return NextResponse.json({ error: "Not authorized to view these messages" }, { status: 403 });
    }

    // Fetch messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('❌ [API /conversations/:id/messages] Error:', messagesError);
      return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
    }

    // Get sender profiles for all messages
    const senderIds = [...new Set((messages || []).map(m => m.sender_id).filter(Boolean))];

    let senderProfiles: Record<string, any> = {};
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      senderProfiles = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {} as Record<string, any>);
    }

    // Attach sender info to messages
    const messagesWithSenders = (messages || []).map(message => ({
      ...message,
      sender: message.sender_id ? senderProfiles[message.sender_id] || null : null
    }));

    console.log('✅ [API /conversations/:id/messages] Loaded', messagesWithSenders.length, 'messages');

    return NextResponse.json({ messages: messagesWithSenders });

  } catch (error) {
    console.error('❌ [API /conversations/:id/messages] Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
