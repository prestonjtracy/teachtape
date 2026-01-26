import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

// Force Node.js runtime for webhook handling (needed for crypto)
// Endpoint: POST /api/zoom/webhook
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Zoom Webhook Handler
 * https://developers.zoom.us/docs/api/rest/webhook-reference/
 *
 * Uses admin client to bypass RLS since webhooks don't have user auth context.
 */
export async function POST(req: NextRequest) {
  // FIRST LINE - log immediately to prove we received the request
  const logTimestamp = new Date().toISOString()
  console.log(`\n`)
  console.log(`${'🔔'.repeat(35)}`)
  console.log(`🔔🔔🔔 ZOOM WEBHOOK RECEIVED 🔔🔔🔔`)
  console.log(`${'🔔'.repeat(35)}`)
  console.log(`📥 [Zoom Webhook] ${logTimestamp} - POST request received`)
  console.log(`${'='.repeat(70)}`)

  // Log request details for debugging
  console.log(`📋 [Zoom Webhook] Request URL: ${req.url}`)
  console.log(`📋 [Zoom Webhook] Request method: ${req.method}`)
  console.log(`📋 [Zoom Webhook] Next URL pathname: ${req.nextUrl.pathname}`)

  // Log ALL headers to see everything
  console.log(`📋 [Zoom Webhook] ALL Headers:`)
  const allHeaders: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    // Truncate sensitive headers
    if (key === 'x-zm-signature' && value) {
      allHeaders[key] = `${value.substring(0, 20)}...`
    } else if (key === 'authorization' && value) {
      allHeaders[key] = `${value.substring(0, 15)}...`
    } else {
      allHeaders[key] = value
    }
  })
  console.log(JSON.stringify(allHeaders, null, 2))

  // Get webhook secret early - needed for both validation and signature verification
  const webhookSecret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN

  if (!webhookSecret) {
    console.error('❌ [Zoom Webhook] ZOOM_WEBHOOK_SECRET_TOKEN not configured in environment')
    console.error('   Please set ZOOM_WEBHOOK_SECRET_TOKEN in your .env file')
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    )
  }
  console.log(`✅ [Zoom Webhook] ZOOM_WEBHOOK_SECRET_TOKEN is configured`)

  // Check for other required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log(`📋 [Zoom Webhook] Environment check:`)
  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '[configured]' : '[MISSING!]'}`)
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '[configured]' : '[MISSING!]'}`)

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ [Zoom Webhook] Missing required Supabase environment variables')
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  try {
    // Get raw body for signature verification
    console.log(`📋 [Zoom Webhook] About to read request body...`)
    const rawBody = await req.text()
    console.log(`📋 [Zoom Webhook] Raw body length: ${rawBody.length} bytes`)
    console.log(`📋 [Zoom Webhook] Raw body (first 500 chars): ${rawBody.substring(0, 500)}`)
    if (rawBody.length > 500) {
      console.log(`📋 [Zoom Webhook] Raw body (last 200 chars): ...${rawBody.substring(rawBody.length - 200)}`)
    }

    let body: any

    try {
      body = JSON.parse(rawBody)
      console.log(`${'*'.repeat(50)}`)
      console.log(`📥 [Zoom Webhook] *** EVENT TYPE: "${body.event}" ***`)
      console.log(`${'*'.repeat(50)}`)
      console.log(`📥 [Zoom Webhook] Account ID: ${body.payload?.account_id || '[not present]'}`)
      console.log(`📥 [Zoom Webhook] Full payload structure:`)
      console.log(JSON.stringify({
        event: body.event,
        event_ts: body.event_ts,
        payload: {
          account_id: body.payload?.account_id,
          object: body.payload?.object ? {
            id: body.payload.object.id,
            uuid: body.payload.object.uuid,
            topic: body.payload.object.topic,
            host_id: body.payload.object.host_id,
            start_time: body.payload.object.start_time,
            end_time: body.payload.object.end_time,
            duration: body.payload.object.duration,
            participant: body.payload.object.participant ? '[present]' : undefined
          } : undefined,
          plainToken: body.payload?.plainToken ? '[present]' : undefined
        }
      }, null, 2))
    } catch (parseError) {
      console.error('❌ [Zoom Webhook] Invalid JSON in request body')
      console.error(`   Parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
      console.error(`   Raw body preview: ${rawBody.substring(0, 500)}`)
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Handle Zoom endpoint validation (URL verification challenge)
    // https://developers.zoom.us/docs/api/rest/webhook-reference/#validate-your-webhook-endpoint
    if (body.event === 'endpoint.url_validation') {
      const plainToken = body.payload?.plainToken

      console.log('🔐 [Zoom Webhook] URL Validation Request received')
      console.log(`   plainToken received: ${plainToken ? '[PRESENT]' : '[MISSING]'}`)

      if (!plainToken) {
        console.error('❌ [Zoom Webhook] Missing plainToken in validation request')
        return NextResponse.json({ error: 'Missing plainToken' }, { status: 400 })
      }

      // Create HMAC SHA256 hash of plainToken using webhook secret
      const encryptedToken = createHmac('sha256', webhookSecret)
        .update(plainToken)
        .digest('hex')

      console.log('✅ [Zoom Webhook] URL validation response prepared')
      console.log(`   Response: { plainToken: "...", encryptedToken: "${encryptedToken.substring(0, 20)}..." }`)

      return NextResponse.json({
        plainToken: plainToken,
        encryptedToken: encryptedToken
      })
    }

    // Verify webhook signature for all other events
    const zoomTimestamp = req.headers.get('x-zm-request-timestamp')
    const signature = req.headers.get('x-zm-signature')

    if (!zoomTimestamp || !signature) {
      console.warn('❌ [Zoom Webhook] Missing signature headers')
      console.warn(`   x-zm-request-timestamp: ${zoomTimestamp || '[MISSING]'}`)
      console.warn(`   x-zm-signature: ${signature ? '[PRESENT]' : '[MISSING]'}`)
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Validate timestamp (5 minute window)
    const requestTimestamp = parseInt(zoomTimestamp)
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const timeDifference = Math.abs(currentTimestamp - requestTimestamp)

    console.log(`🕐 [Zoom Webhook] Timestamp validation:`)
    console.log(`   Request timestamp: ${requestTimestamp} (${new Date(requestTimestamp * 1000).toISOString()})`)
    console.log(`   Current timestamp: ${currentTimestamp} (${new Date(currentTimestamp * 1000).toISOString()})`)
    console.log(`   Difference: ${timeDifference} seconds`)

    if (timeDifference > 300) {
      console.warn('❌ [Zoom Webhook] Timestamp too old (> 5 minutes)')
      return NextResponse.json(
        { error: 'Timestamp expired' },
        { status: 401 }
      )
    }

    // Verify HMAC signature
    const message = `v0:${zoomTimestamp}:${rawBody}`
    const hash = createHmac('sha256', webhookSecret)
      .update(message)
      .digest('hex')
    const expectedSignature = `v0=${hash}`

    if (signature !== expectedSignature) {
      console.warn('❌ [Zoom Webhook] Invalid signature')
      console.warn(`   Received: ${signature.substring(0, 30)}...`)
      console.warn(`   Expected: ${expectedSignature.substring(0, 30)}...`)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    console.log('✅ [Zoom Webhook] Signature verified successfully')

    // Handle different event types using admin client (bypasses RLS)
    console.log('📋 [Zoom Webhook] Creating Supabase admin client...')
    const supabase = createAdminClient()
    console.log('✅ [Zoom Webhook] Supabase admin client created')

    // TEST DATABASE CONNECTIVITY
    console.log('🔍 [Zoom Webhook] Testing database connectivity...')
    try {
      const { data: testData, error: testError } = await supabase
        .from('zoom_webhook_events')
        .select('id')
        .limit(1)

      if (testError) {
        console.error('❌ [Zoom Webhook] Database connectivity test FAILED:', testError.message)
        console.error('   Error code:', testError.code)
        console.error('   This suggests the zoom_webhook_events table may not exist or RLS is blocking')
      } else {
        console.log('✅ [Zoom Webhook] Database connectivity test PASSED')
        console.log(`   Sample data: ${JSON.stringify(testData)}`)
      }
    } catch (dbTestError) {
      console.error('❌ [Zoom Webhook] Database test threw exception:', dbTestError)
    }

    const meetingId = body.payload?.object?.id?.toString()
    console.log(`📋 [Zoom Webhook] Meeting ID from payload: ${meetingId || '[not found]'}`)

    console.log(`📋 [Zoom Webhook] About to process event type: "${body.event}"`)

    switch (body.event) {
      case 'meeting.started':
        console.log(`🎥 [Zoom Webhook] >>> PROCESSING meeting.started for meeting: ${meetingId}`)
        await logWebhookEvent(supabase, meetingId, 'meeting.started', body)
        console.log(`🎥 [Zoom Webhook] <<< FINISHED processing meeting.started`)
        break

      case 'meeting.ended':
        console.log(`🎥 [Zoom Webhook] >>> PROCESSING meeting.ended for meeting: ${meetingId}`)
        await logWebhookEvent(supabase, meetingId, 'meeting.ended', body)
        console.log(`🎥 [Zoom Webhook] <<< FINISHED logWebhookEvent for meeting.ended`)
        await markBookingCompleted(supabase, meetingId)
        console.log(`🎥 [Zoom Webhook] <<< FINISHED markBookingCompleted`)
        break

      case 'meeting.participant_joined':
        console.log(`👤 [Zoom Webhook] >>> PROCESSING participant_joined for meeting: ${meetingId}`)
        await logParticipantEvent(supabase, meetingId, 'joined', body)
        console.log(`👤 [Zoom Webhook] <<< FINISHED processing participant_joined`)
        break

      case 'meeting.participant_left':
        console.log(`👋 [Zoom Webhook] >>> PROCESSING participant_left for meeting: ${meetingId}`)
        await logParticipantEvent(supabase, meetingId, 'left', body)
        console.log(`👋 [Zoom Webhook] <<< FINISHED processing participant_left`)
        break

      default:
        console.log(`ℹ️ [Zoom Webhook] *** UNHANDLED event type: ${body.event} ***`)
        console.log(`   Known event types: meeting.started, meeting.ended, meeting.participant_joined, meeting.participant_left`)
    }

    console.log(`${'='.repeat(70)}`)
    console.log(`✅ [Zoom Webhook] Request processed successfully at ${new Date().toISOString()}`)
    console.log(`${'='.repeat(70)}\n`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ [Zoom Webhook] Unexpected error:', error)
    console.error(`   Error type: ${error instanceof Error ? error.constructor.name : typeof error}`)
    console.error(`   Error message: ${error instanceof Error ? error.message : String(error)}`)
    if (error instanceof Error && error.stack) {
      console.error(`   Stack trace: ${error.stack}`)
    }
    // Return 200 to prevent Zoom from retrying
    return NextResponse.json({ ok: true }, { status: 200 })
  }
}

async function logWebhookEvent(
  supabase: ReturnType<typeof createAdminClient>,
  meetingId: string | undefined,
  eventType: string,
  payload: any
) {
  console.log(`${'─'.repeat(50)}`)
  console.log(`📝 [logWebhookEvent] >>> STARTING for event: ${eventType}`)
  console.log(`📝 [logWebhookEvent] Meeting ID: ${meetingId || '[undefined]'}`)

  if (!meetingId) {
    console.warn(`⚠️ [logWebhookEvent] No meetingId for ${eventType} event - SKIPPING (cannot log without meeting ID)`)
    return
  }

  try {
    // Look up associated booking
    console.log(`🔍 [logWebhookEvent] Looking up booking for meeting ID: ${meetingId}`)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('zoom_meeting_id', meetingId)
      .single()

    if (bookingError) {
      if (bookingError.code === 'PGRST116') {
        console.log(`ℹ️ [logWebhookEvent] No booking found for meeting ${meetingId} (this is OK for non-TeachTape meetings)`)
      } else {
        console.warn(`⚠️ [logWebhookEvent] Error finding booking: ${bookingError.message} (code: ${bookingError.code})`)
      }
    } else {
      console.log(`✅ [logWebhookEvent] Found booking: ${booking?.id}`)
    }

    // Extract timestamp from Zoom payload
    const zoomObject = payload?.payload?.object
    const occurredAt = zoomObject?.start_time || zoomObject?.end_time || new Date().toISOString()
    console.log(`📋 [logWebhookEvent] Event occurred at: ${occurredAt}`)

    // Prepare the event data
    const eventData = {
      zoom_meeting_id: meetingId,
      booking_id: booking?.id || null,
      event_type: eventType,
      occurred_at: occurredAt,
      raw_data: payload
    }
    console.log(`📋 [logWebhookEvent] Prepared event data:`)
    console.log(JSON.stringify({
      ...eventData,
      raw_data: '[PAYLOAD OBJECT - truncated for log]'
    }, null, 2))

    // Use upsert to handle duplicate webhook deliveries idempotently
    console.log(`📋 [logWebhookEvent] Executing upsert to zoom_webhook_events...`)
    const startTime = Date.now()
    const { data: upsertData, error: upsertError } = await supabase
      .from('zoom_webhook_events')
      .upsert(eventData, {
        onConflict: 'zoom_meeting_id,event_type,occurred_at',
        ignoreDuplicates: true
      })
      .select()
    const endTime = Date.now()
    console.log(`📋 [logWebhookEvent] Upsert completed in ${endTime - startTime}ms`)

    if (upsertError) {
      console.error(`❌ [logWebhookEvent] UPSERT FAILED for ${eventType} event:`)
      console.error(`   Error message: ${upsertError.message}`)
      console.error(`   Error code: ${upsertError.code}`)
      console.error(`   Error details: ${JSON.stringify(upsertError.details)}`)
      console.error(`   Error hint: ${upsertError.hint}`)
    } else {
      console.log(`✅ [logWebhookEvent] UPSERT SUCCEEDED for ${eventType} event`)
      console.log(`   Meeting ID: ${meetingId}`)
      if (upsertData && upsertData.length > 0) {
        console.log(`   Inserted/updated row ID: ${upsertData[0]?.id}`)
        console.log(`   Full response: ${JSON.stringify(upsertData[0])}`)
      } else {
        console.log(`   Note: upsertData is empty/null (may indicate ignoreDuplicates triggered)`)
      }
    }
  } catch (error) {
    console.error(`❌ [logWebhookEvent] EXCEPTION in logWebhookEvent:`)
    console.error(`   Error type: ${error instanceof Error ? error.constructor.name : typeof error}`)
    if (error instanceof Error) {
      console.error(`   Error message: ${error.message}`)
      console.error(`   Stack: ${error.stack}`)
    } else {
      console.error(`   Error value: ${String(error)}`)
    }
  }
  console.log(`📝 [logWebhookEvent] <<< FINISHED for event: ${eventType}`)
  console.log(`${'─'.repeat(50)}`)
}

async function logParticipantEvent(
  supabase: ReturnType<typeof createAdminClient>,
  meetingId: string | undefined,
  action: 'joined' | 'left',
  payload: any
) {
  console.log(`${'─'.repeat(50)}`)
  console.log(`📝 [logParticipantEvent] >>> STARTING for action: ${action}`)
  console.log(`📝 [logParticipantEvent] Meeting ID: ${meetingId || '[undefined]'}`)

  if (!meetingId) {
    console.warn(`⚠️ [logParticipantEvent] No meetingId for participant ${action} event - SKIPPING`)
    return
  }

  try {
    // Zoom payload structure: payload.payload.object.participant
    const zoomObject = payload?.payload?.object
    const participant = zoomObject?.participant
    console.log(`📋 [logParticipantEvent] Participant info:`)
    console.log(JSON.stringify({
      user_name: participant?.user_name || '[not provided]',
      email: participant?.email ? '[redacted]' : '[not provided]',
      user_id: participant?.user_id || '[not provided]',
      participant_uuid: participant?.participant_uuid || '[not provided]'
    }, null, 2))

    // Look up associated booking
    console.log(`🔍 [logParticipantEvent] Looking up booking for meeting ID: ${meetingId}`)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('zoom_meeting_id', meetingId)
      .single()

    if (bookingError) {
      if (bookingError.code === 'PGRST116') {
        console.log(`ℹ️ [logParticipantEvent] No booking found for meeting ${meetingId} (OK for non-TeachTape meetings)`)
      } else {
        console.warn(`⚠️ [logParticipantEvent] Error finding booking: ${bookingError.message}`)
      }
    } else {
      console.log(`✅ [logParticipantEvent] Found booking: ${booking?.id}`)
    }

    // Extract timestamp - Zoom uses join_time for joined, leave_time for left
    const occurredAt = participant?.join_time || participant?.leave_time || new Date().toISOString()
    console.log(`📋 [logParticipantEvent] Event occurred at: ${occurredAt}`)

    // Prepare event data
    const eventData = {
      zoom_meeting_id: meetingId,
      booking_id: booking?.id || null,
      event_type: `meeting.participant_${action}`,
      participant_name: participant?.user_name,
      participant_email: participant?.email,
      participant_user_id: participant?.user_id,
      occurred_at: occurredAt,
      raw_data: payload
    }
    console.log(`📋 [logParticipantEvent] Prepared event data:`)
    console.log(JSON.stringify({
      ...eventData,
      participant_email: eventData.participant_email ? '[redacted]' : null,
      raw_data: '[PAYLOAD OBJECT - truncated for log]'
    }, null, 2))

    // Use upsert to handle duplicate webhook deliveries idempotently
    console.log(`📋 [logParticipantEvent] Executing upsert to zoom_webhook_events...`)
    const startTime = Date.now()
    const { data: upsertData, error: upsertError } = await supabase
      .from('zoom_webhook_events')
      .upsert(eventData, {
        onConflict: 'zoom_meeting_id,event_type,occurred_at',
        ignoreDuplicates: true
      })
      .select()
    const endTime = Date.now()
    console.log(`📋 [logParticipantEvent] Upsert completed in ${endTime - startTime}ms`)

    if (upsertError) {
      console.error(`❌ [logParticipantEvent] UPSERT FAILED for participant ${action}:`)
      console.error(`   Error message: ${upsertError.message}`)
      console.error(`   Error code: ${upsertError.code}`)
      console.error(`   Error details: ${JSON.stringify(upsertError.details)}`)
      console.error(`   Error hint: ${upsertError.hint}`)
    } else {
      console.log(`✅ [logParticipantEvent] UPSERT SUCCEEDED for participant ${action}`)
      console.log(`   Meeting ID: ${meetingId}`)
      if (upsertData && upsertData.length > 0) {
        console.log(`   Inserted/updated row ID: ${upsertData[0]?.id}`)
        console.log(`   Full response: ${JSON.stringify(upsertData[0])}`)
      } else {
        console.log(`   Note: upsertData is empty/null (may indicate ignoreDuplicates triggered)`)
      }
    }
  } catch (error) {
    console.error(`❌ [logParticipantEvent] EXCEPTION:`)
    console.error(`   Error type: ${error instanceof Error ? error.constructor.name : typeof error}`)
    if (error instanceof Error) {
      console.error(`   Error message: ${error.message}`)
      console.error(`   Stack: ${error.stack}`)
    } else {
      console.error(`   Error value: ${String(error)}`)
    }
  }
  console.log(`📝 [logParticipantEvent] <<< FINISHED for action: ${action}`)
  console.log(`${'─'.repeat(50)}`)
}

async function markBookingCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  meetingId: string | undefined
) {
  console.log(`📝 [markBookingCompleted] Starting for meeting: ${meetingId}`)

  if (!meetingId) {
    console.warn('⚠️ [markBookingCompleted] No meetingId - cannot mark booking completed')
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
        console.log(`ℹ️ [markBookingCompleted] No booking found for meeting ${meetingId}`)
      } else {
        console.error(`❌ [markBookingCompleted] Error finding booking: ${findError.message}`)
      }
      return
    }

    console.log(`📋 [markBookingCompleted] Found booking: ${booking.id} with status: ${booking.status}`)

    if (booking && booking.status === 'paid') {
      // Verify that at least 2 participants joined before marking as completed
      console.log(`🔍 [markBookingCompleted] Checking participant count for meeting ${meetingId}`)
      const { count: participantCount, error: countError } = await supabase
        .from('zoom_webhook_events')
        .select('*', { count: 'exact', head: true })
        .eq('zoom_meeting_id', meetingId)
        .eq('event_type', 'meeting.participant_joined')

      if (countError) {
        console.warn(`⚠️ [markBookingCompleted] Could not verify attendance: ${countError.message}`)
      }

      const actualCount = participantCount || 0
      console.log(`📋 [markBookingCompleted] Participant count: ${actualCount}`)

      if (actualCount < 2) {
        console.warn(`⚠️ [markBookingCompleted] Meeting ${meetingId} ended with only ${actualCount} participant(s) - flagging for review`)
        const { error: flagError } = await supabase
          .from('bookings')
          .update({
            status: 'needs_review',
            review_notes: `Meeting ended with only ${actualCount} participant(s). Manual review required.`
          })
          .eq('id', booking.id)
          .eq('status', 'paid')

        if (flagError) {
          console.error(`❌ [markBookingCompleted] Failed to flag booking for review: ${flagError.message}`)
        } else {
          console.log(`⚠️ [markBookingCompleted] Booking ${booking.id} flagged for review due to low attendance`)
        }
        return
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', booking.id)

      if (updateError) {
        console.error(`❌ [markBookingCompleted] Failed to update booking status: ${updateError.message}`)
      } else {
        console.log(`✅ [markBookingCompleted] Booking ${booking.id} marked as completed (${actualCount} participants verified)`)

        // Record payout event for completed session
        const { data: fullBooking } = await supabase
          .from('bookings')
          .select('coach_id, amount_paid_cents')
          .eq('id', booking.id)
          .single()

        if (fullBooking) {
          const { error: payoutError } = await supabase.from('payout_events').insert({
            booking_id: booking.id,
            coach_id: fullBooking.coach_id,
            event_type: 'session_completed',
            amount_cents: fullBooking.amount_paid_cents,
            status: 'pending'
          })

          if (payoutError) {
            console.warn(`⚠️ [markBookingCompleted] Failed to record payout event: ${payoutError.message}`)
          } else {
            console.log(`✅ [markBookingCompleted] Payout event recorded for booking ${booking.id}`)
          }
        }
      }
    } else if (booking) {
      console.log(`ℹ️ [markBookingCompleted] Booking ${booking.id} status is '${booking.status}', not updating`)
    }
  } catch (error) {
    console.error(`❌ [markBookingCompleted] Error:`, error)
    if (error instanceof Error) {
      console.error(`   Error message: ${error.message}`)
      console.error(`   Stack: ${error.stack}`)
    }
  }
}

// Also add a GET handler for testing if the endpoint is reachable
export async function GET(req: NextRequest) {
  console.log(`📥 [Zoom Webhook] GET request received (health check)`)
  console.log(`📥 [Zoom Webhook] Request URL: ${req.url}`)
  console.log(`📥 [Zoom Webhook] Pathname: ${req.nextUrl.pathname}`)

  const webhookSecret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN

  // Test database connectivity
  let dbStatus = 'unknown'
  let dbError = null
  let eventCount = 0
  try {
    const supabase = createAdminClient()
    const { count, error } = await supabase
      .from('zoom_webhook_events')
      .select('*', { count: 'exact', head: true })

    if (error) {
      dbStatus = 'error'
      dbError = error.message
    } else {
      dbStatus = 'connected'
      eventCount = count || 0
    }
  } catch (e) {
    dbStatus = 'exception'
    dbError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/zoom/webhook',
    method: 'POST required for webhooks',
    configured: !!webhookSecret,
    timestamp: new Date().toISOString(),
    message: 'Zoom webhook endpoint is reachable. Use POST for actual webhook events.',
    database: {
      status: dbStatus,
      error: dbError,
      eventCount: eventCount
    },
    debug: {
      url: req.url,
      pathname: req.nextUrl.pathname,
      headers: {
        host: req.headers.get('host'),
        'x-forwarded-proto': req.headers.get('x-forwarded-proto')
      }
    }
  })
}
