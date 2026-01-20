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
    console.log('🔍 [API /conversations/:id] Loading conversation:', conversationId);

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('❌ [API /conversations/:id] No user found');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('✅ [API /conversations/:id] User authenticated:', user.email);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [API /conversations/:id] Profile error:', profileError);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.log('✅ [API /conversations/:id] Profile loaded:', profile.full_name);

    // Check if user is a participant in this conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (participantError) {
      console.error('❌ [API /conversations/:id] Participant check error:', participantError);
      return NextResponse.json({ error: "Failed to verify access" }, { status: 500 });
    }

    if (!participant) {
      console.error('❌ [API /conversations/:id] Not a participant');
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    console.log('✅ [API /conversations/:id] User is participant');

    // Get conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error('❌ [API /conversations/:id] Conversation not found:', conversationError);
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Get all participants
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id, role')
      .eq('conversation_id', conversationId);

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

    console.log('✅ [API /conversations/:id] Participants loaded:', participantsWithProfiles.length);

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

    console.log('✅ [API /conversations/:id] Booking request:', bookingRequest ? 'found' : 'none');

    return NextResponse.json({
      conversation: {
        ...conversation,
        participants: participantsWithProfiles
      },
      currentUser: profile,
      bookingRequest
    });

  } catch (error) {
    console.error('❌ [API /conversations/:id] Unexpected error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
