import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logAdminAction, AuditActions, getTargetIdentifier } from '@/lib/auditLog'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { paymentId, action } = await request.json()
    
    if (!paymentId || !action) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }
    
    // Verify admin access
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })

    const adminSupabase = createAdminClient()

    switch (action) {
      case 'retry_payout':
        return await retryPayout(supabase, stripe, paymentId, user.id)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Admin payment action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function retryPayout(supabase: any, stripe: Stripe, paymentId: string, adminUserId: string) {
  try {
    // Get payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        coach_id,
        coach_amount_cents,
        stripe_payment_intent_id,
        payout_retry_count,
        coach:profiles!payments_coach_id_fkey (
          id,
          coaches!coaches_profile_id_fkey (
            stripe_account_id
          )
        )
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Check if coach has Stripe Connect account
    const coachStripeAccount = payment.coach?.coaches?.[0]?.stripe_account_id
    if (!coachStripeAccount) {
      return NextResponse.json({ error: 'Coach does not have Stripe Connect account' }, { status: 400 })
    }

    // Attempt to create a transfer to the coach's Stripe account
    try {
      const transfer = await stripe.transfers.create({
        amount: payment.coach_amount_cents,
        currency: 'usd',
        destination: coachStripeAccount,
        transfer_group: `payment_${paymentId}`,
        metadata: {
          payment_id: paymentId,
          coach_id: payment.coach_id,
          retry: 'true'
        }
      })

      // Update payment record with successful payout
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payout_status: 'in_transit',
          stripe_transfer_id: transfer.id,
          payout_date: new Date().toISOString(),
          payout_failed_reason: null,
          payout_retry_count: (payment.payout_retry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)

      if (updateError) {
        console.error('Failed to update payment record:', updateError)
      }

      // Log the successful retry
      await logAdminAction(adminUserId, {
        action: AuditActions.PAYOUT_RETRIED,
        targetType: 'payment',
        targetId: paymentId,
        targetIdentifier: `Payment ${payment.stripe_payment_intent_id?.slice(-8) || paymentId.slice(0, 8)}`,
        details: {
          retry_count: (payment.payout_retry_count || 0) + 1,
          transfer_id: transfer.id,
          amount_cents: payment.coach_amount_cents,
          coach_id: payment.coach_id,
          status: 'successful'
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: 'Payout retry initiated',
        transfer_id: transfer.id
      })

    } catch (stripeError: any) {
      // Update payment record with failed payout
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payout_status: 'failed',
          payout_failed_reason: stripeError.message || 'Stripe transfer failed',
          payout_retry_count: (payment.payout_retry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)

      if (updateError) {
        console.error('Failed to update payment record:', updateError)
      }

      // Log the failed retry
      await logAdminAction(adminUserId, {
        action: AuditActions.PAYOUT_RETRIED,
        targetType: 'payment',
        targetId: paymentId,
        targetIdentifier: `Payment ${payment.stripe_payment_intent_id?.slice(-8) || paymentId.slice(0, 8)}`,
        details: {
          retry_count: (payment.payout_retry_count || 0) + 1,
          amount_cents: payment.coach_amount_cents,
          coach_id: payment.coach_id,
          status: 'failed',
          error_message: stripeError.message || 'Stripe transfer failed'
        }
      })

      return NextResponse.json({ 
        error: 'Payout failed', 
        details: stripeError.message 
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Retry payout error:', error)
    return NextResponse.json({ error: 'Failed to retry payout' }, { status: 500 })
  }
}

// GET endpoint to sync payment data from Stripe
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })

    // Get recent payment intents and transfers from Stripe
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      created: {
        gte: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // Last 30 days
      }
    })

    const transfers = await stripe.transfers.list({
      limit: 100,
      created: {
        gte: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // Last 30 days
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        payment_intents: paymentIntents.data.length,
        transfers: transfers.data.length,
        total_volume: paymentIntents.data.reduce((sum, pi) => sum + pi.amount, 0),
        successful_payments: paymentIntents.data.filter(pi => pi.status === 'succeeded').length
      }
    })

  } catch (error) {
    console.error('Stripe sync error:', error)
    return NextResponse.json({ error: 'Failed to sync with Stripe' }, { status: 500 })
  }
}