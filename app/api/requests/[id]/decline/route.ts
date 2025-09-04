import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendBookingRequestEmailsAsync } from "@/lib/email";

const DeclineRequestSchema = z.object({
  id: z.string().uuid("Invalid request ID"),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('🔍 [POST /api/requests/[id]/decline] Request received:', params.id);
  
  try {
    // Validate request ID
    const validatedData = DeclineRequestSchema.parse(params);
    const requestId = validatedData.id;

    const supabase = createClient();

    // Get current user (coach)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [POST /api/requests/decline] User not authenticated:', userError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get coach profile
    const { data: coachProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !coachProfile || coachProfile.role !== 'coach') {
      console.error('❌ [POST /api/requests/decline] Coach profile not found or invalid role:', profileError);
      return NextResponse.json(
        { error: "Coach profile not found" },
        { status: 404 }
      );
    }

    // Get booking request with related data for email
    const { data: bookingRequest, error: requestError } = await supabase
      .from('booking_requests')
      .select(`
        id, 
        coach_id, 
        conversation_id, 
        status, 
        proposed_start, 
        proposed_end, 
        timezone,
        athlete:profiles!booking_requests_athlete_id_fkey(id, full_name, auth_user_id),
        coach:profiles!booking_requests_coach_id_fkey(id, full_name),
        listing:listings!inner(id, title, price_cents)
      `)
      .eq('id', requestId)
      .eq('coach_id', coachProfile.id)
      .eq('status', 'pending')
      .single();

    if (requestError || !bookingRequest) {
      console.error('❌ [POST /api/requests/decline] Booking request not found:', requestError);
      return NextResponse.json(
        { error: "Booking request not found or not accessible" },
        { status: 404 }
      );
    }

    console.log('✅ [POST /api/requests/decline] Declining request:', requestId);

    // Update booking request status to declined
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ [POST /api/requests/decline] Failed to update request status:', updateError);
      return NextResponse.json(
        { error: "Failed to update request status" },
        { status: 500 }
      );
    }

    // Send system message to conversation
    const systemMessage = "❌ Declined.";
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: bookingRequest.conversation_id,
        sender_id: null, // System message
        body: systemMessage,
        kind: 'system'
      });

    if (messageError) {
      console.warn('⚠️ [POST /api/requests/decline] Failed to send system message:', messageError);
      // Don't fail the request for message error
    }

    console.log('✅ [POST /api/requests/decline] Request declined successfully:', requestId);

    // Send email notification to athlete (fire-and-forget)
    try {
      const { data: athleteAuth } = await supabase.auth.admin.getUserById(bookingRequest.athlete.auth_user_id);
      const athleteEmail = athleteAuth.user?.email;

      if (athleteEmail) {
        const emailData = {
          requestId: requestId,
          athleteEmail: athleteEmail,
          athleteName: bookingRequest.athlete.full_name || undefined,
          coachName: bookingRequest.coach.full_name || 'Coach',
          coachEmail: user.email!,
          listingTitle: bookingRequest.listing.title,
          listingDescription: undefined,
          duration: undefined,
          priceCents: bookingRequest.listing.price_cents,
          proposedStart: new Date(bookingRequest.proposed_start),
          proposedEnd: new Date(bookingRequest.proposed_end),
          timezone: bookingRequest.timezone,
          requestedAt: new Date(),
          chatUrl: `${process.env.APP_URL || 'https://teachtape.local'}/messages/${bookingRequest.conversation_id}`
        };

        sendBookingRequestEmailsAsync(emailData, 'declined');
        console.log('📧 [POST /api/requests/decline] Email notification queued for athlete');
      }
    } catch (emailError) {
      console.warn('⚠️ [POST /api/requests/decline] Failed to send email notification:', emailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Booking request declined successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ [POST /api/requests/decline] Validation error:', error.errors);
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('❌ [POST /api/requests/decline] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}