import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Zoom Webhook Handler
 *
 * Handles webhook events from Zoom for meeting lifecycle management
 * https://developers.zoom.us/docs/api/rest/webhook-reference/
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Verification event - Zoom sends this when you first configure the webhook URL
  if (body.event === "endpoint.url_validation") {
    const token = body.payload?.plainToken;
    console.log('🔐 [Zoom Webhook] Endpoint validation request received');
    return new Response(JSON.stringify({ plainToken: token, encryptedToken: token }), { status: 200 });
  }

  // SECURITY: Validate Zoom webhook authentication
  const verificationToken = process.env.ZOOM_VERIFICATION_TOKEN;
  if (verificationToken) {
    const headerToken = req.headers.get("authorization");
    if (headerToken !== verificationToken) {
      console.warn('❌ [Zoom Webhook] Invalid verification token');
      return new Response("Unauthorized", { status: 401 });
    }
  } else {
    console.warn('⚠️ [Zoom Webhook] ZOOM_VERIFICATION_TOKEN not set - webhook authentication disabled');
  }

  console.log(`📥 [Zoom Webhook] Event received: ${body.event}`, {
    meetingId: body.payload?.object?.id,
    topic: body.payload?.object?.topic
  });

  try {
    const supabase = createClient();

    // Handle different Zoom events
    switch (body.event) {
      case "meeting.started":
        await handleMeetingStarted(supabase, body.payload);
        break;

      case "meeting.ended":
        await handleMeetingEnded(supabase, body.payload);
        break;

      case "meeting.participant_joined":
        await handleParticipantJoined(supabase, body.payload);
        break;

      case "meeting.participant_left":
        await handleParticipantLeft(supabase, body.payload);
        break;

      default:
        console.log(`ℹ️ [Zoom Webhook] Unhandled event type: ${body.event}`);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    console.error('❌ [Zoom Webhook] Error processing webhook:', error);
    // Return 200 to prevent Zoom from retrying
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
}

/**
 * Handle meeting started event
 */
async function handleMeetingStarted(supabase: any, payload: any) {
  const meetingId = payload?.object?.id?.toString();
  if (!meetingId) return;

  console.log(`🎥 [Zoom Webhook] Meeting started: ${meetingId}`);

  // Log the session start
  const { error } = await supabase
    .from('zoom_session_logs')
    .insert({
      zoom_meeting_id: meetingId,
      event_type: 'meeting.started',
      event_data: payload,
      occurred_at: new Date(payload?.object?.start_time || Date.now()).toISOString()
    });

  if (error) {
    console.error('Failed to log meeting start:', error);
  }
}

/**
 * Handle meeting ended event
 */
async function handleMeetingEnded(supabase: any, payload: any) {
  const meetingId = payload?.object?.id?.toString();
  if (!meetingId) return;

  console.log(`🎥 [Zoom Webhook] Meeting ended: ${meetingId}`);

  // Log the session end
  const { error: logError } = await supabase
    .from('zoom_session_logs')
    .insert({
      zoom_meeting_id: meetingId,
      event_type: 'meeting.ended',
      event_data: payload,
      occurred_at: new Date(payload?.object?.end_time || Date.now()).toISOString()
    });

  if (logError) {
    console.error('Failed to log meeting end:', logError);
  }

  // Update booking status to completed if it exists
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('zoom_meeting_id', meetingId)
    .single();

  if (booking && booking.status === 'confirmed') {
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', booking.id);

    if (updateError) {
      console.error('Failed to update booking status:', updateError);
    } else {
      console.log(`✅ [Zoom Webhook] Booking ${booking.id} marked as completed`);
    }
  }
}

/**
 * Handle participant joined event
 */
async function handleParticipantJoined(supabase: any, payload: any) {
  const meetingId = payload?.object?.id?.toString();
  const participantName = payload?.object?.participant?.user_name;

  console.log(`👤 [Zoom Webhook] Participant joined ${meetingId}: ${participantName}`);

  // Log participant join
  const { error } = await supabase
    .from('zoom_session_logs')
    .insert({
      zoom_meeting_id: meetingId,
      event_type: 'participant.joined',
      event_data: payload,
      occurred_at: new Date(payload?.object?.participant?.join_time || Date.now()).toISOString()
    });

  if (error) {
    console.error('Failed to log participant join:', error);
  }
}

/**
 * Handle participant left event
 */
async function handleParticipantLeft(supabase: any, payload: any) {
  const meetingId = payload?.object?.id?.toString();
  const participantName = payload?.object?.participant?.user_name;

  console.log(`👋 [Zoom Webhook] Participant left ${meetingId}: ${participantName}`);

  // Log participant leave
  const { error } = await supabase
    .from('zoom_session_logs')
    .insert({
      zoom_meeting_id: meetingId,
      event_type: 'participant.left',
      event_data: payload,
      occurred_at: new Date(payload?.object?.participant?.leave_time || Date.now()).toISOString()
    });

  if (error) {
    console.error('Failed to log participant leave:', error);
  }
}
