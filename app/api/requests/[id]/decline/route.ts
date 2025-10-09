import { NextRequest, NextResponse } from "next/server";
import { createClientForApiRoute } from "@/lib/supabase/server";
import { z } from "zod";
import { sendBookingRequestEmailsAsync } from "@/lib/email";

export const dynamic = 'force-dynamic';

const DeclineRequestSchema = z.object({
  id: z.string().uuid("Invalid request ID"),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now();
  const requestId = params.id;
  console.log(`🔍 [POST /api/requests/[id]/decline] ===== REQUEST START ===== ID: ${requestId}, Time: ${new Date().toISOString()}`);

  try {
    // Validate request ID
    const validatedData = DeclineRequestSchema.parse(params);

    const supabase = createClientForApiRoute(req);

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
    // IMPORTANT: Do NOT filter by status here - we need to check status AFTER fetching
    // to provide proper error messages for non-pending requests
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
      .single();

    if (requestError || !bookingRequest) {
      console.error('❌ [POST /api/requests/decline] Booking request not found:', requestError);
      return NextResponse.json(
        { error: "Booking request not found or not accessible" },
        { status: 404 }
      );
    }

    console.log('🔍 [POST /api/requests/decline] Found booking request with status:', bookingRequest.status);

    // Check if request has already been accepted (payment processed)
    if (bookingRequest.status === 'accepted') {
      console.error('❌ [POST /api/requests/decline] Cannot decline accepted request (payment already processed)');
      return NextResponse.json(
        { error: "Cannot decline an already accepted booking request. Payment has been processed." },
        { status: 400 }
      );
    }

    // Check if request has already been declined
    if (bookingRequest.status === 'declined') {
      console.error('❌ [POST /api/requests/decline] Request already declined');
      return NextResponse.json(
        { error: "This booking request has already been declined." },
        { status: 400 }
      );
    }

    // Check if request is not pending
    if (bookingRequest.status !== 'pending') {
      console.error('❌ [POST /api/requests/decline] Invalid status:', bookingRequest.status);
      return NextResponse.json(
        { error: `Cannot decline request with status: ${bookingRequest.status}` },
        { status: 400 }
      );
    }

    console.log('✅ [POST /api/requests/decline] Declining request:', requestId);

    // Update booking request status atomically with row-level locking
    // This prevents race conditions where both accept and decline are called simultaneously
    const { data: statusUpdateResult, error: statusUpdateError } = await supabase
      .rpc('update_booking_request_status_atomic', {
        request_id: requestId,
        expected_current_status: 'pending',
        new_status: 'declined'
      });

    if (statusUpdateError || !statusUpdateResult?.success) {
      console.error('❌ [POST /api/requests/decline] Failed to update request status atomically:', {
        error: statusUpdateError,
        result: statusUpdateResult
      });

      // If there was a status mismatch, provide a helpful error
      if (statusUpdateResult?.error === 'status_mismatch') {
        return NextResponse.json(
          { error: `Cannot decline request. Current status is ${statusUpdateResult.current_status}, expected pending.` },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to update request status" },
        { status: 500 }
      );
    }

    console.log('✅ [POST /api/requests/decline] Status updated atomically from pending to declined');

    // Send system message to conversation
    const systemMessage = "❌ **Booking Request Declined**\n\nThe coach has declined your booking request. You can submit a new request with different times if needed.";
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
      const athleteData = (bookingRequest.athlete as any)?.[0];
      const coachData = (bookingRequest.coach as any)?.[0];
      const listingData = (bookingRequest.listing as any)?.[0];

      if (!athleteData?.auth_user_id) {
        console.warn('⚠️ Missing athlete auth_user_id for request:', requestId);
      } else {
        const { data: athleteAuth } = await supabase.auth.admin.getUserById(athleteData.auth_user_id);
        const athleteEmail = athleteAuth.user?.email;

        if (athleteEmail) {
          const emailData = {
            requestId: requestId,
            athleteEmail: athleteEmail,
            athleteName: athleteData.full_name || undefined,
            coachName: coachData?.full_name || 'Coach',
            coachEmail: user.email!,
            listingTitle: listingData?.title || 'Session',
            listingDescription: undefined,
            duration: undefined,
            priceCents: listingData?.price_cents || 0,
            proposedStart: new Date(bookingRequest.proposed_start),
            proposedEnd: new Date(bookingRequest.proposed_end),
            timezone: bookingRequest.timezone,
            requestedAt: new Date(),
            chatUrl: `${process.env.APP_URL || 'https://teachtape.local'}/messages/${bookingRequest.conversation_id}`
          };

          sendBookingRequestEmailsAsync(emailData, 'declined');
          console.log('📧 [POST /api/requests/decline] Email notification queued for athlete');
        }
      }
    } catch (emailError) {
      console.warn('⚠️ [POST /api/requests/decline] Failed to send email notification:', emailError);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [POST /api/requests/[id]/decline] ===== REQUEST SUCCESS ===== ID: ${requestId}, Duration: ${duration}ms, Time: ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Booking request declined successfully'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ [POST /api/requests/[id]/decline] ===== REQUEST ERROR ===== ID: ${requestId}, Duration: ${duration}ms, Time: ${new Date().toISOString()}`);

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