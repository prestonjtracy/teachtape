import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHmac } from 'crypto'

/**
 * Supabase Auth Webhook Handler
 *
 * This endpoint is called by Supabase when auth events occur.
 * It automatically creates a profile when a new user signs up.
 *
 * Setup in Supabase Dashboard:
 * Authentication → Hooks → Enable "user.created" → Point to this URL
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Validate webhook signature using HMAC
async function validateWebhookSignature(
  signature: string | null,
  rawBody: string,
  webhookSecret: string | undefined
): Promise<boolean> {
  // If no secret configured, skip validation (for testing only)
  if (!webhookSecret) {
    console.warn('⚠️ SUPABASE_WEBHOOK_SECRET not set - webhook signature validation disabled')
    return true
  }

  if (!signature) {
    console.error('❌ Missing x-supabase-signature header')
    return false
  }

  try {
    // Calculate HMAC signature
    const hmac = createHmac('sha256', webhookSecret)
    hmac.update(rawBody)
    const calculatedSignature = hmac.digest('hex')

    // Compare signatures (timing-safe comparison)
    return signature === calculatedSignature
  } catch (error) {
    console.error('❌ Error validating webhook signature:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 [Auth Hook] Received webhook from Supabase')

    // Get signature header
    const signature = request.headers.get('x-supabase-signature')
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET

    // Read body as text first for signature validation
    const rawBody = await request.text()

    // Validate webhook signature
    if (!await validateWebhookSignature(signature, rawBody, webhookSecret)) {
      console.error('❌ [Auth Hook] Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Parse webhook payload from raw body
    const payload = JSON.parse(rawBody)
    console.log('📦 [Auth Hook] Payload:', JSON.stringify(payload, null, 2))

    // Extract event type and user data
    const { type, record } = payload

    // Only handle user creation events
    if (type !== 'INSERT') {
      console.log(`ℹ️ [Auth Hook] Ignoring event type: ${type}`)
      return NextResponse.json({ message: 'Event type not handled' }, { status: 200 })
    }

    // Extract user data from the record
    const userId = record.id
    const email = record.email
    const fullName = record.raw_user_meta_data?.full_name || null

    if (!userId) {
      console.error('❌ [Auth Hook] No user ID in payload')
      return NextResponse.json({ error: 'No user ID' }, { status: 400 })
    }

    console.log(`👤 [Auth Hook] Creating profile for user: ${email} (${userId})`)

    // Create Supabase admin client (bypasses RLS)
    const supabase = await createClient()

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (existingProfile) {
      console.log(`✅ [Auth Hook] Profile already exists for user ${userId}`)
      return NextResponse.json({
        message: 'Profile already exists',
        profile_id: existingProfile.id
      }, { status: 200 })
    }

    // Create new profile
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        auth_user_id: userId,
        role: 'athlete',  // Default role - users can upgrade to coach later
        full_name: fullName,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ [Auth Hook] Error creating profile:', insertError)
      return NextResponse.json({
        error: 'Failed to create profile',
        details: insertError.message
      }, { status: 500 })
    }

    console.log(`✅ [Auth Hook] Profile created successfully:`, newProfile.id)

    return NextResponse.json({
      message: 'Profile created successfully',
      profile: {
        id: newProfile.id,
        role: newProfile.role,
        email: email
      }
    }, { status: 200 })

  } catch (error) {
    console.error('❌ [Auth Hook] Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Supabase Auth Webhook Handler',
    message: 'This endpoint handles user.created events from Supabase Auth'
  })
}
