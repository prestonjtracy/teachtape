import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Zoom Webhook Handler
 * https://developers.zoom.us/docs/api/rest/webhook-reference/
 */
export async function POST(req: NextRequest) {
  console.log('📥 [Zoom Webhook] POST request received')

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

    // Handle Zoom endpoint validation
    if (body.event === 'endpoint.url_validation') {
      const token = body.payload?.plainToken
      console.log('🔐 [Zoom Webhook] Endpoint validation')
      return NextResponse.json({
        plainToken: token,
        encryptedToken: token
      })
    }

    // Verify webhook signature
    const webhookSecret = process.env.ZOOM_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('❌ [Zoom Webhook] ZOOM_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      )
    }

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
  if (!meetingId) return

  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('zoom_meeting_id', meetingId)
    .single()

  await supabase.from('zoom_webhook_events').insert({
    zoom_meeting_id: meetingId,
    booking_id: booking?.id || null,
    event_type: eventType,
    occurred_at: new Date(
      payload?.object?.start_time || payload?.object?.end_time || Date.now()
    ).toISOString(),
    raw_data: payload
  })
}

async function logParticipantEvent(
  supabase: any,
  meetingId: string | undefined,
  action: 'joined' | 'left',
  payload: any
) {
  if (!meetingId) return

  const participant = payload?.object?.participant
  const { data: booking } = await supabase
    .from('bookings')
    .select('id')
    .eq('zoom_meeting_id', meetingId)
    .single()

  await supabase.from('zoom_webhook_events').insert({
    zoom_meeting_id: meetingId,
    booking_id: booking?.id || null,
    event_type: `meeting.participant_${action}`,
    participant_name: participant?.user_name,
    participant_email: participant?.email,
    participant_user_id: participant?.user_id,
    occurred_at: new Date(
      participant?.join_time || participant?.leave_time || Date.now()
    ).toISOString(),
    raw_data: payload
  })
}

async function markBookingCompleted(supabase: any, meetingId: string | undefined) {
  if (!meetingId) return

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('zoom_meeting_id', meetingId)
    .single()

  if (booking && booking.status === 'paid') {
    await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', booking.id)
    console.log(`✅ [Zoom Webhook] Booking ${booking.id} marked as completed`)
  }
}
