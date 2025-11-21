import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHmac } from "crypto";
import { applyRateLimit } from "@/lib/rateLimitHelpers";
import { ZoomWebhookPayload, ZoomSupabaseClient } from "@/types/zoom";

export const dynamic = 'force-dynamic';

/**
 * Zoom Webhook Handler
 *
 * Handles webhook events from Zoom for meeting lifecycle management
 * https://developers.zoom.us/docs/api/rest/webhook-reference/
 */
export async function POST(req: NextRequest) {
  // Apply rate limiting for webhooks
  const rateLimitResponse = applyRateLimit(req, 'WEBHOOK');
  if (rateLimitResponse) return rateLimitResponse;

  // Get raw body for signature verification
  const rawBody = await req.text();
  let body: ZoomWebhookPayload;

  try {
    body = JSON.parse(rawBody);
  } catch (error) {
    console.error('❌ [Zoom Webhook] Invalid JSON payload');
    return new Response(
      JSON.stringify({ error: 'Invalid payload' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verification event - Zoom sends this when you first configure the webhook URL
  if (body.event === "endpoint.url_validation") {
    const token = body.payload?.plainToken;
    console.log('🔐 [Zoom Webhook] Endpoint validation request received');
    return new Response(JSON.stringify({ plainToken: token, encryptedToken: token }), { status: 200 });
  }

  // SECURITY: Validate Zoom webhook HMAC signature
  const webhookSecretToken = process.env.ZOOM_WEBHOOK_SECRET;
  if (!webhookSecretToken) {
    console.error('❌ [Zoom Webhook] ZOOM_WEBHOOK_SECRET not configured');
    return new Response(
      JSON.stringify({ error: 'Webhook authentication not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify HMAC signature (Zoom v2 signature verification)
  const timestamp = req.headers.get("x-zm-request-timestamp");
  const signature = req.headers.get("x-zm-signature");

  if (!timestamp || !signature) {
    console.warn('❌ [Zoom Webhook] Missing signature headers');
    return new Response(
      JSON.stringify({ error: 'Missing signature headers' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate timestamp to prevent replay attacks (5 minute window)
  const requestTimestamp = parseInt(timestamp);
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const timeDifference = Math.abs(currentTimestamp - requestTimestamp);

  if (timeDifference > 300) { // 5 minutes
    console.warn('❌ [Zoom Webhook] Timestamp too old', {
      timeDifference,
      requestTimestamp,
      currentTimestamp
    });
    return new Response(
      JSON.stringify({ error: 'Request timestamp too old' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Compute HMAC signature
  const message = `v0:${timestamp}:${rawBody}`;
  const hashForVerify = createHmac('sha256', webhookSecretToken)
    .update(message)
    .digest('hex');
  const expectedSignature = `v0=${hashForVerify}`;

  if (signature !== expectedSignature) {
    console.warn('❌ [Zoom Webhook] Invalid HMAC signature');
    return new Response(
      JSON.stringify({ error: 'Invalid signature' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log('✅ [Zoom Webhook] Signature verified successfully');

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
async function handleMeetingStarted(supabase: ZoomSupabaseClient, payload: ZoomWebhookPayload['payload']) {
  const meetingId = payload?.object?.id?.toString();
  if (!meetingId) return;

  console.log(`🎥 [Zoom Webhook] Meeting started: ${meetingId}`);

  // Find the booking for this meeting
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('zoom_meeting_id', meetingId)
    .single();

  // Log the event to zoom_webhook_events table
  const { error } = await supabase
    .from('zoom_webhook_events')
    .insert({
      zoom_meeting_id: meetingId,
      booking_id: booking?.id || null,
      event_type: 'meeting.started',
      occurred_at: new Date(payload?.object?.start_time || Date.now()).toISOString(),
      raw_data: payload
    });

  if (error) {
    console.error('❌ [Zoom Webhook] Failed to log meeting start:', error);
  } else {
    console.log('✅ [Zoom Webhook] Meeting start logged successfully');
  }
}

/**
 * Handle meeting ended event
 */
async function handleMeetingEnded(supabase: ZoomSupabaseClient, payload: ZoomWebhookPayload['payload']) {
  const meetingId = payload?.object?.id?.toString();
  if (!meetingId) return;

  console.log(`🎥 [Zoom Webhook] Meeting ended: ${meetingId}`);

  // Find the booking for this meeting
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('zoom_meeting_id', meetingId)
    .single();

  // Log the event to zoom_webhook_events table
  const { error: logError } = await supabase
    .from('zoom_webhook_events')
    .insert({
      zoom_meeting_id: meetingId,
      booking_id: booking?.id || null,
      event_type: 'meeting.ended',
      occurred_at: new Date(payload?.object?.end_time || Date.now()).toISOString(),
      raw_data: payload
    });

  if (logError) {
    console.error('❌ [Zoom Webhook] Failed to log meeting end:', logError);
  } else {
    console.log('✅ [Zoom Webhook] Meeting end logged successfully');
  }

  // Update booking status to completed if it exists
  if (booking && booking.status === 'paid') {
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', booking.id);

    if (updateError) {
      console.error('❌ [Zoom Webhook] Failed to update booking status:', updateError);
    } else {
      console.log(`✅ [Zoom Webhook] Booking ${booking.id} marked as completed`);
    }
  }
}

/**
 * Handle participant joined event
 */
async function handleParticipantJoined(supabase: ZoomSupabaseClient, payload: ZoomWebhookPayload['payload']) {
  const meetingId = payload?.object?.id?.toString();
  const participantName = payload?.object?.participant?.user_name;
  const participantEmail = payload?.object?.participant?.email;
  const participantUserId = payload?.object?.participant?.user_id;

  console.log(`👤 [Zoom Webhook] Participant joined ${meetingId}: ${participantName}`);

  // Find the booking for this meeting
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('zoom_meeting_id', meetingId)
    .single();

  // Log participant join
  const { error } = await supabase
    .from('zoom_webhook_events')
    .insert({
      zoom_meeting_id: meetingId,
      booking_id: booking?.id || null,
      event_type: 'meeting.participant_joined',
      participant_name: participantName,
      participant_email: participantEmail,
      participant_user_id: participantUserId,
      occurred_at: new Date(payload?.object?.participant?.join_time || Date.now()).toISOString(),
      raw_data: payload
    });

  if (error) {
    console.error('❌ [Zoom Webhook] Failed to log participant join:', error);
  } else {
    console.log('✅ [Zoom Webhook] Participant join logged successfully');
  }
}

/**
 * Handle participant left event
 */
async function handleParticipantLeft(supabase: ZoomSupabaseClient, payload: ZoomWebhookPayload['payload']) {
  const meetingId = payload?.object?.id?.toString();
  const participantName = payload?.object?.participant?.user_name;
  const participantEmail = payload?.object?.participant?.email;
  const participantUserId = payload?.object?.participant?.user_id;

  console.log(`👋 [Zoom Webhook] Participant left ${meetingId}: ${participantName}`);

  // Find the booking for this meeting
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('zoom_meeting_id', meetingId)
    .single();

  // Log participant leave
  const { error } = await supabase
    .from('zoom_webhook_events')
    .insert({
      zoom_meeting_id: meetingId,
      booking_id: booking?.id || null,
      event_type: 'meeting.participant_left',
      participant_name: participantName,
      participant_email: participantEmail,
      participant_user_id: participantUserId,
      occurred_at: new Date(payload?.object?.participant?.leave_time || Date.now()).toISOString(),
      raw_data: payload
    });

  if (error) {
    console.error('❌ [Zoom Webhook] Failed to log participant leave:', error);
  } else {
    console.log('✅ [Zoom Webhook] Participant leave logged successfully');
  }
}
