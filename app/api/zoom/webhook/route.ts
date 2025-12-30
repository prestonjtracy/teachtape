import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

// Force Node.js runtime for webhook handling (needed for crypto)
// Endpoint: POST /api/zoom/webhook
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Zoom Webhook Handler
 * https://developers.zoom.us/docs/api/rest/webhook-reference/
 */
export async function POST(req: NextRequest) {
  console.log('📥 [Zoom Webhook] POST request received')

  // Get webhook secret early - needed for both validation and signature verification
  const webhookSecret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN

  if (!webhookSecret) {
    console.error('❌ [Zoom Webhook] ZOOM_WEBHOOK_SECRET_TOKEN not configured')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }

  try {
    // Get raw body for signature verification
    const rawBody = await req.text()
    let body: any

    try {
      body = JSON.parse(rawBody)
      console.log('📥 [Zoom Webhook] Event:', body.event)
    } catch (error) {
      console.error('❌ [Zoom Webhook] Invalid JSON')
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Handle Zoom endpoint validation (URL verification challenge)
    // https://developers.zoom.us/docs/api/rest/webhook-reference/#validate-your-webhook-endpoint
    if (body.event === 'endpoint.url_validation') {
      const plainToken = body.payload?.plainToken

      // Logging for debugging (sensitive data redacted)
      console.log('🔐 [Zoom Webhook] URL Validation Request received')
      console.log('  plainToken received:', plainToken ? '[PRESENT]' : '[MISSING]')

      if (!plainToken) {
        console.error('❌ [Zoom Webhook] Missing plainToken in validation request')
        return NextResponse.json({ error: 'Missing plainToken' }, { status: 400 })
      }

      // Create HMAC SHA256 hash of plainToken using webhook secret
      const encryptedToken = createHmac('sha256', webhookSecret)
        .update(plainToken)
        .digest('hex')

      console.log('✅ [Zoom Webhook] URL validation response prepared')

      return NextResponse.json({
        plainToken: plainToken,
        encryptedToken: encryptedToken
      })
    }

    // Verify webhook signature for all other events
    const timestamp = req.headers.get('x-zm-request-timestamp')
    const signature = req.headers.get('x-zm-signature')

    if (!timestamp || !signature) {
      console.warn('❌ [Zoom Webhook] Missing signature headers')
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Validate timestamp (5 minute window)
    const requestTimestamp = parseInt(timestamp)
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const timeDifference = Math.abs(currentTimestamp - requestTimestamp)

    if (timeDifference > 300) {
      console.warn('❌ [Zoom Webhook] Timestamp too old')
      return NextResponse.json(
        { error: 'Timestamp expired' },
        { status: 401 }
      )
    }

    // Verify HMAC signature
    const message = `v0:${timestamp}:${rawBody}`
    const hash = createHmac('sha256', webhookSecret)
      .update(message)
      .digest('hex')
    const expectedSignature = `v0=${hash}`

    if (signature !== expectedSignature) {
      console.warn('❌ [Zoom Webhook] Invalid signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    console.log('✅ [Zoom Webhook] Signature verified')

    // Handle different event types
    const supabase = createClient()
    const meetingId = body.payload?.object?.id?.toString()

    switch (body.event) {
      case 'meeting.started':
        console.log(`🎥 [Zoom Webhook] Meeting started: ${meetingId}`)
        await logWebhookEvent(supabase, meetingId, 'meeting.started', body)
        break

      case 'meeting.ended':
        console.log(`🎥 [Zoom Webhook] Meeting ended: ${meetingId}`)
        await logWebhookEvent(supabase, meetingId, 'meeting.ended', body)
        await markBookingCompleted(supabase, meetingId)
        break

      case 'meeting.participant_joined':
        console.log(`👤 [Zoom Webhook] Participant joined: ${meetingId}`)
        await logParticipantEvent(supabase, meetingId, 'joined', body)
        break

      case 'meeting.participant_left':
        console.log(`👋 [Zoom Webhook] Participant left: ${meetingId}`)
        await logParticipantEvent(supabase, meetingId, 'left', body)
        break

      default:
        console.log(`ℹ️ [Zoom Webhook] Unhandled event: ${body.event}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ [Zoom Webhook] Error:', error)
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}

async function logWebhookEvent(
  supabase: any,
  meetingId: string | undefined,
  eventType: string,
  payload: any
) {
  if (!meetingId) {
    console.warn(`⚠️ [Zoom Webhook] No meetingId for ${eventType} event`)
    return
  }

  try {
    // Look up associated booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('zoom_meeting_id', meetingId)
      .single()

    if (bookingError && bookingError.code !== 'PGRST116') {
      console.warn(`⚠️ [Zoom Webhook] Error finding booking: ${bookingError.message}`)
    }

    // Extract timestamp from Zoom payload
    // The 'payload' param is the full webhook body: { event, payload: { object: {...} } }
    // So we access payload.payload.object for the meeting data
    const zoomObject = payload?.payload?.object
    const occurredAt = zoomObject?.start_time || zoomObject?.end_time || new Date().toISOString()

    console.log(`📝 [Zoom Webhook] ${eventType} - Meeting ID: ${meetingId}`)

    // Use upsert to handle duplicate webhook deliveries idempotently
    // Zoom may retry webhooks, so we use a unique constraint on (zoom_meeting_id, event_type, occurred_at)
    const { error: upsertError } = await supabase.from('zoom_webhook_events').upsert({
      zoom_meeting_id: meetingId,
      booking_id: booking?.id || null,
      event_type: eventType,
      occurred_at: occurredAt,
      raw_data: payload
    }, {
      onConflict: 'zoom_meeting_id,event_type,occurred_at',
      ignoreDuplicates: true
    })

    if (upsertError) {
      console.error(`❌ [Zoom Webhook] Failed to upsert ${eventType} event:`, upsertError.message)
    } else {
      console.log(`✅ [Zoom Webhook] Logged ${eventType} event for meeting ${meetingId}`)
    }
  } catch (error) {
    console.error(`❌ [Zoom Webhook] Error in logWebhookEvent:`, error)
  }
}

async function logParticipantEvent(
  supabase: any,
  meetingId: string | undefined,
  action: 'joined' | 'left',
  payload: any
) {
  if (!meetingId) {
    console.warn(`⚠️ [Zoom Webhook] No meetingId for participant ${action} event`)
    return
  }

  try {
    // Zoom payload structure: payload.payload.object.participant
    const zoomObject = payload?.payload?.object
    const participant = zoomObject?.participant

    // Look up associated booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('zoom_meeting_id', meetingId)
      .single()

    if (bookingError && bookingError.code !== 'PGRST116') {
      console.warn(`⚠️ [Zoom Webhook] Error finding booking: ${bookingError.message}`)
    }

    // Extract timestamp - Zoom uses join_time for joined, leave_time for left
    const occurredAt = participant?.join_time || participant?.leave_time || new Date().toISOString()

    // Use upsert to handle duplicate webhook deliveries idempotently
    const { error: upsertError } = await supabase.from('zoom_webhook_events').upsert({
      zoom_meeting_id: meetingId,
      booking_id: booking?.id || null,
      event_type: `meeting.participant_${action}`,
      participant_name: participant?.user_name,
      participant_email: participant?.email,
      participant_user_id: participant?.user_id,
      occurred_at: occurredAt,
      raw_data: payload
    }, {
      onConflict: 'zoom_meeting_id,event_type,occurred_at',
      ignoreDuplicates: true
    })

    if (upsertError) {
      console.error(`❌ [Zoom Webhook] Failed to upsert participant ${action} event:`, upsertError.message)
    } else {
      // Don't log participant names/emails for privacy
      console.log(`✅ [Zoom Webhook] Logged participant ${action} for meeting ${meetingId}`)
    }
  } catch (error) {
    console.error(`❌ [Zoom Webhook] Error in logParticipantEvent:`, error)
  }
}

async function markBookingCompleted(supabase: any, meetingId: string | undefined) {
  if (!meetingId) {
    console.warn('⚠️ [Zoom Webhook] No meetingId for markBookingCompleted')
    return
  }

  try {
    const { data: booking, error: findError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('zoom_meeting_id', meetingId)
      .single()

    if (findError) {
      if (findError.code === 'PGRST116') {
        console.log(`ℹ️ [Zoom Webhook] No booking found for meeting ${meetingId}`)
      } else {
        console.error(`❌ [Zoom Webhook] Error finding booking: ${findError.message}`)
      }
      return
    }

    if (booking && booking.status === 'paid') {
      // Verify that at least 2 participants joined before marking as completed
      // This prevents coaches from being paid for sessions that didn't happen
      const { count: participantCount, error: countError } = await supabase
        .from('zoom_webhook_events')
        .select('*', { count: 'exact', head: true })
        .eq('zoom_meeting_id', meetingId)
        .eq('event_type', 'meeting.participant_joined')

      if (countError) {
        console.warn(`⚠️ [Zoom Webhook] Could not verify attendance: ${countError.message}`)
        // Continue with completion but log the issue
      }

      const actualCount = participantCount || 0
      if (actualCount < 2) {
        console.warn(`⚠️ [Zoom Webhook] Meeting ${meetingId} ended with only ${actualCount} participant(s) - not marking as completed`)
        // Update booking to flag it for review instead of completing
        const { error: flagError } = await supabase
          .from('bookings')
          .update({
            status: 'needs_review',
            review_notes: `Meeting ended with only ${actualCount} participant(s). Manual review required.`
          })
          .eq('id', booking.id)
          .eq('status', 'paid') // Only update if still paid

        if (flagError) {
          console.error(`❌ [Zoom Webhook] Failed to flag booking for review: ${flagError.message}`)
        } else {
          console.log(`⚠️ [Zoom Webhook] Booking ${booking.id} flagged for review due to low attendance`)
        }
        return
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', booking.id)

      if (updateError) {
        console.error(`❌ [Zoom Webhook] Failed to update booking status: ${updateError.message}`)
      } else {
        console.log(`✅ [Zoom Webhook] Booking ${booking.id} marked as completed (${actualCount} participants verified)`)
      }
    } else if (booking) {
      console.log(`ℹ️ [Zoom Webhook] Booking ${booking.id} status is '${booking.status}', not updating`)
    }
  } catch (error) {
    console.error(`❌ [Zoom Webhook] Error in markBookingCompleted:`, error)
  }
}
