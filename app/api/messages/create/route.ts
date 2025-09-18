import { NextRequest, NextResponse } from "next/server";
import { createClientForApiRoute } from "@/lib/supabase/server";
import { z } from "zod";

const CreateMessageSchema = z.object({
  conversation_id: z.string().uuid("Invalid conversation ID"),
  body: z.string().min(1, "Message body is required").max(2000, "Message too long"),
  kind: z.string().default("text"),
});

export async function POST(req: NextRequest) {
  console.log('🔍 [POST /api/messages/create] Request received');
  
  try {
    const body = await req.json();
    
    // Validate input
    const validatedData = CreateMessageSchema.parse(body);
    console.log('✅ [POST /api/messages/create] Input validated:', {
      conversation_id: validatedData.conversation_id,
      body_length: validatedData.body.length,
      kind: validatedData.kind
    });

    const supabase = createClientForApiRoute(req);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [POST /api/messages/create] User not authenticated:', userError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [POST /api/messages/create] Profile not found:', profileError);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Verify user is a participant in the conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', validatedData.conversation_id)
      .eq('user_id', profile.id)
      .single();

    if (participantError || !participant) {
      console.error('❌ [POST /api/messages/create] User not authorized for conversation:', participantError);
      return NextResponse.json(
        { error: "Not authorized to send messages in this conversation" },
        { status: 403 }
      );
    }

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: validatedData.conversation_id,
        sender_id: profile.id,
        body: validatedData.body,
        kind: validatedData.kind
      })
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
      `)
      .single();

    if (messageError || !message) {
      console.error('❌ [POST /api/messages/create] Failed to create message:', messageError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    // Update conversation's updated_at timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', validatedData.conversation_id);

    console.log('✅ [POST /api/messages/create] Message created successfully:', message.id);

    return NextResponse.json({
      success: true,
      message: message,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ [POST /api/messages/create] Validation error:', error.errors);
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('❌ [POST /api/messages/create] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}