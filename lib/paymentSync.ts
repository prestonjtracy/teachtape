/**
 * Payment synchronization utilities for TeachTape admin panel
 * Helps sync Stripe payment data to the payments table
 */

import { createClient } from '@/lib/supabase/server'
import { getFeeBreakdown } from './stripeFees'
import Stripe from 'stripe'

export interface PaymentSyncData {
  stripe_payment_intent_id: string
  stripe_session_id?: string
  booking_id?: string
  booking_request_id?: string
  coach_id: string
  athlete_id?: string
  total_amount_cents: number
  platform_fee_cents: number
  coach_amount_cents: number
  stripe_fee_cents?: number
  payment_status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'refunded'
  currency?: string
  description?: string
  customer_email?: string
}

/**
 * Sync a payment from Stripe to the payments table
 */
export async function syncPaymentToDatabase(paymentData: PaymentSyncData) {
  const supabase = createClient()

  try {
    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('stripe_payment_intent_id', paymentData.stripe_payment_intent_id)
      .single()

    if (existingPayment) {
      // Update existing payment
      const { error } = await supabase
        .from('payments')
        .update({
          payment_status: paymentData.payment_status,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_payment_intent_id', paymentData.stripe_payment_intent_id)

      if (error) {
        console.error('Failed to update payment:', error)
        return { success: false, error }
      }

      return { success: true, action: 'updated' }
    } else {
      // Create new payment record
      const { error } = await supabase
        .from('payments')
        .insert(paymentData)

      if (error) {
        console.error('Failed to create payment:', error)
        return { success: false, error }
      }

      return { success: true, action: 'created' }
    }
  } catch (error) {
    console.error('Payment sync error:', error)
    return { success: false, error }
  }
}

/**
 * Process a Stripe payment intent webhook and sync to database
 */
export async function processPaymentIntentWebhook(paymentIntent: Stripe.PaymentIntent) {
  const supabase = createClient()

  try {
    // Try to find associated booking or booking request
    let bookingId = null
    let bookingRequestId = null
    let coachId = null
    let athleteId = null

    // Look for booking by session ID in metadata
    if (paymentIntent.metadata.session_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, coach_id')
        .eq('stripe_session_id', paymentIntent.metadata.session_id)
        .single()

      if (booking) {
        bookingId = booking.id
        coachId = booking.coach_id
      }
    }

    // Look for booking request by ID in metadata
    if (paymentIntent.metadata.booking_request_id) {
      const { data: bookingRequest } = await supabase
        .from('booking_requests')
        .select('id, coach_id, athlete_id')
        .eq('id', paymentIntent.metadata.booking_request_id)
        .single()

      if (bookingRequest) {
        bookingRequestId = bookingRequest.id
        coachId = bookingRequest.coach_id
        athleteId = bookingRequest.athlete_id
      }
    }

    if (!coachId) {
      console.warn('No coach found for payment intent:', paymentIntent.id)
      return { success: false, error: 'No associated booking found' }
    }

    // Calculate fee breakdown
    const feeBreakdown = getFeeBreakdown(paymentIntent.amount)

    const paymentData: PaymentSyncData = {
      stripe_payment_intent_id: paymentIntent.id,
      booking_id: bookingId,
      booking_request_id: bookingRequestId,
      coach_id: coachId,
      athlete_id: athleteId,
      total_amount_cents: paymentIntent.amount,
      platform_fee_cents: feeBreakdown.platformFee,
      coach_amount_cents: feeBreakdown.coachAmount,
      stripe_fee_cents: 0, // Would need to get from Stripe fees API
      payment_status: paymentIntent.status as any,
      currency: paymentIntent.currency,
      description: paymentIntent.description,
      customer_email: paymentIntent.receipt_email
    }

    return await syncPaymentToDatabase(paymentData)

  } catch (error) {
    console.error('Payment intent webhook processing error:', error)
    return { success: false, error }
  }
}

/**
 * Update payout status when transfer webhook is received
 */
export async function updatePayoutStatus(
  transferId: string, 
  status: 'pending' | 'in_transit' | 'paid' | 'failed' | 'canceled',
  failureReason?: string
) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('payments')
      .update({
        payout_status: status,
        payout_failed_reason: failureReason || null,
        payout_date: status === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_transfer_id', transferId)

    if (error) {
      console.error('Failed to update payout status:', error)
      return { success: false, error }
    }

    return { success: true }

  } catch (error) {
    console.error('Payout status update error:', error)
    return { success: false, error }
  }
}