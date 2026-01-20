import { NextRequest } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendBookingEmailsAsync } from "@/lib/email";
import { getFeeBreakdown } from "@/lib/stripeFees";
import { BookingEmailData } from "@/lib/emailTemplates";
import { applyRateLimit } from "@/lib/rateLimitHelpers";
import { sanitizeDBError, logError } from "@/lib/errorHandling";

// Force Node.js runtime for webhook handling
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Determine if an error should trigger a webhook retry
 * Returns true for temporary/transient errors (DB connection, network issues)
 * Returns false for permanent errors (validation, bad data)
 */
function isRetryableError(error: any): boolean {
  // Database connection errors (temporary)
  if (error?.code === 'ECONNREFUSED' ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ENOTFOUND' ||
      error?.message?.includes('connection') ||
      error?.message?.includes('timeout')) {
    return true;
  }

  // Supabase-specific errors
  if (error?.code) {
    // Temporary database errors (retry)
    if (error.code === 'PGRST301' || // connection error
        error.code === 'PGRST504' || // gateway timeout
        error.code === '57P03' ||    // cannot connect now
        error.code === '08006' ||    // connection failure
        error.code === '08001') {    // unable to connect
      return true;
    }

    // Permanent errors (don't retry)
    if (error.code === 'PGRST116' ||  // not found
        error.code === '23505' ||     // unique violation
        error.code === '23503' ||     // foreign key violation
        error.code === '23502' ||     // not null violation
        error.code === '42P01') {     // undefined table
      return false;
    }
  }

  // Rate limit errors (temporary)
  if (error?.status === 429 || error?.code === 'rate_limit_error') {
    return true;
  }

  // Generic network errors (temporary)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Validation errors (permanent)
  if (error?.name === 'ValidationError' ||
      error?.name === 'ZodError' ||
      error?.message?.includes('Invalid') ||
      error?.message?.includes('required')) {
    return false;
  }

  // Default to non-retryable for safety (prevents infinite retries)
  return false;
}

export async function POST(req: NextRequest) {
  console.log("🔗 Webhook hit");

  // Apply rate limiting for webhooks (200 requests per minute)
  const rateLimitResponse = applyRateLimit(req, 'WEBHOOK');
  if (rateLimitResponse) return rateLimitResponse;

  // Validate environment variables
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error("❌ Missing Stripe environment variables");
    return new Response("Server misconfigured", { status: 500 });
  }

  // Initialize Stripe client
  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  // Get raw body for signature verification (do NOT parse as JSON first)
  let rawBody: ArrayBuffer;
  try {
    rawBody = await req.arrayBuffer();
  } catch (error) {
    console.error("❌ Failed to read request body:", error);
    return new Response("Failed to read request body", { status: 400 });
  }

  // Verify webhook signature
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    console.error("❌ No stripe-signature header found");
    return new Response("No signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // Convert ArrayBuffer to Buffer for Stripe
    const buffer = Buffer.from(rawBody);
    event = stripe.webhooks.constructEvent(buffer, signature, webhookSecret);
    console.log(`✅ Webhook signature verified for event: ${event.type}`);
  } catch (error) {
    console.error("❌ Webhook signature verification failed:", error);
    return new Response("Invalid signature", { status: 400 });
  }

  // SECURITY: Check for duplicate event processing (idempotency)
  const supabase = await createClient();
  const { data: existingEvent } = await supabase
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existingEvent) {
    console.log(`ℹ️ Event already processed: ${event.id}`);
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle different event types
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, stripe);
        console.log("✅ Checkout completion handled successfully");
        break;

      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        console.log("✅ Payment success handled successfully");
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        console.log("✅ Payment failure handled successfully");
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
        break;
    }

    // Record successful processing
    await supabase.from('webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error(`❌ Error handling webhook event ${event.type}:`, error);

    // Determine if error is retryable
    const isRetryable = isRetryableError(error);

    if (isRetryable) {
      // Return 500 for temporary errors (DB connection, network) - Stripe will retry
      console.warn(`⚠️ Retryable error occurred for event ${event.type} - Stripe will retry`);
      return new Response("Temporary error - will retry", { status: 500 });
    } else {
      // Return 200 for permanent errors (bad data, validation) - stops retries
      console.error(`❌ Permanent error occurred for event ${event.type} - stopping retries`);
      return new Response(JSON.stringify({
        received: true,
        error: "Permanent error - event discarded",
        event_id: event.id
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Always return 200 for valid webhooks
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, stripe: Stripe) {
  // Retrieve expanded session with customer details and payment intent
  const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['customer_details', 'payment_intent']
  });

  console.log("📋 Processing checkout session:", {
    session_id: expandedSession.id,
    payment_intent: expandedSession.payment_intent,
    amount_total: expandedSession.amount_total,
    currency: expandedSession.currency,
    commission_settings_applied: expandedSession.metadata?.commission_settings_applied
  });

  // Extract required metadata
  const listingId = expandedSession.metadata?.listing_id;
  const coachId = expandedSession.metadata?.coach_id;
  const isCommissionSettingsApplied = expandedSession.metadata?.commission_settings_applied === 'true';
  const platformFeeAmountCents = expandedSession.metadata?.platform_fee_amount_cents;
  const athleteServiceFee = expandedSession.metadata?.athlete_service_fee;

  // Film review specific metadata
  const bookingType = (expandedSession.metadata?.booking_type || 'live_lesson') as 'live_lesson' | 'film_review';
  const filmUrl = expandedSession.metadata?.film_url || null;
  const athleteNotes = expandedSession.metadata?.athlete_notes || null;
  const turnaroundHours = expandedSession.metadata?.turnaround_hours ? parseInt(expandedSession.metadata.turnaround_hours) : 48;

  if (!listingId || !coachId) {
    console.error("⚠️ Missing required metadata:", {
      listing_id: listingId,
      coach_id: coachId,
      metadata: expandedSession.metadata
    });
    throw new Error("Missing required metadata: listing_id or coach_id");
  }

  // Emit audit log entry for commission settings application
  if (isCommissionSettingsApplied) {
    console.log("📊 [AUDIT] commission_settings.applied:", {
      session_id: expandedSession.id,
      platform_fee_amount_cents: platformFeeAmountCents,
      athlete_fee_added_cents: athleteServiceFee,
      // No PII logged
    });
  }

  // Extract payment intent ID for idempotency
  const paymentIntentId = typeof expandedSession.payment_intent === 'string' 
    ? expandedSession.payment_intent 
    : expandedSession.payment_intent?.id;

  if (!paymentIntentId) {
    console.error("⚠️ Missing payment intent ID");
    throw new Error("Missing payment intent ID");
  }

  // Extract and validate email
  const emailSchema = z.string().email();
  let customerEmail: string | null = null;

  try {
    customerEmail = emailSchema.parse(expandedSession.customer_details?.email);
  } catch (emailError) {
    console.error("⚠️ Invalid email from Stripe:", expandedSession.customer_details?.email);
    // Continue without email - booking will still be created but email sending may fail
  }

  const amountPaidCents = expandedSession.amount_total; // Already in cents
  const stripeSessionId = expandedSession.id;

  console.log("📝 Upserting booking with data:", {
    payment_intent_id: paymentIntentId,
    listing_id: listingId,
    coach_id: coachId,
    customer_email: customerEmail,
    amount_paid_cents: amountPaidCents,
    status: 'paid',
    stripe_session_id: stripeSessionId,
    booking_type: bookingType,
    film_url: bookingType === 'film_review' ? '[HIDDEN]' : null
  });

  // Verify application fee amount if commission settings were applied
  if (isCommissionSettingsApplied && platformFeeAmountCents) {
    try {
      const paymentIntentObj = typeof expandedSession.payment_intent === 'string'
        ? await stripe.paymentIntents.retrieve(expandedSession.payment_intent)
        : expandedSession.payment_intent;

      const actualApplicationFee = paymentIntentObj?.application_fee_amount;
      const expectedApplicationFee = parseInt(platformFeeAmountCents, 10);

      if (actualApplicationFee !== expectedApplicationFee) {
        console.warn("⚠️ Application fee mismatch:", {
          expected: expectedApplicationFee,
          actual: actualApplicationFee,
          session_id: expandedSession.id
        });
      } else {
        console.log("✅ Application fee verified:", {
          amount: actualApplicationFee,
          session_id: expandedSession.id
        });
      }
    } catch (error) {
      console.warn("⚠️ Could not verify application fee:", error);
    }
  }

  // Create server-side Supabase client
  const supabase = await createClient();

  // Build booking data based on type
  const bookingData: Record<string, any> = {
    payment_intent_id: paymentIntentId,
    listing_id: listingId,
    coach_id: coachId,
    customer_email: customerEmail,
    amount_paid_cents: amountPaidCents,
    status: 'paid',
    stripe_session_id: stripeSessionId,
    booking_type: bookingType
  };

  // Add film review specific fields
  if (bookingType === 'film_review') {
    bookingData.film_url = filmUrl;
    bookingData.athlete_notes = athleteNotes;
    bookingData.review_status = 'pending_acceptance';
    // Deadline will be set when coach accepts (turnaround_hours from acceptance time)
    // For now, store the expected deadline as 24hrs from now for coach to accept
    console.log(`🎬 Film review booking created - Coach has 24hrs to accept, then ${turnaroundHours}hrs to deliver`);
  }

  // Upsert booking record using payment_intent_id for idempotency
  const { data: booking, error: dbError } = await supabase
    .from("bookings")
    .upsert(bookingData, {
      onConflict: 'payment_intent_id'
    })
    .select('id, payment_intent_id, booking_type')
    .single();

  if (dbError) {
    const sanitized = sanitizeDBError(dbError, 'Stripe webhook - booking upsert');
    logError('Stripe webhook - booking upsert', sanitized.logDetails);
    throw new Error(sanitized.message);
  }

  console.log("✅ Booking created/updated successfully:", {
    booking_id: booking.id,
    payment_intent_id: booking.payment_intent_id,
    listing_id: listingId,
    coach_id: coachId,
    amount_paid_cents: amountPaidCents,
    stripe_session_id: stripeSessionId,
    booking_type: booking.booking_type
  });

  // Send booking confirmation emails (fire-and-forget)
  try {
    await sendBookingConfirmationEmails(expandedSession, booking.id);
    console.log("📧 Booking emails queued for sending");
  } catch (error) {
    // Log error but don't throw - emails shouldn't block webhook response
    console.error("⚠️ Email sending failed (non-blocking):", error);
  }
}

async function sendBookingConfirmationEmails(session: Stripe.Checkout.Session, bookingId: string) {
  const supabase = await createClient();
  
  // Get additional booking data needed for emails
  const listingId = session.metadata?.listing_id;
  const coachId = session.metadata?.coach_id;
  
  if (!listingId || !coachId) {
    console.warn("Missing metadata for email sending:", { listingId, coachId });
    return;
  }

  // Fetch coach and listing details
  const [coachResult, listingResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, auth_user_id')
      .eq('id', coachId)
      .single(),
    supabase
      .from('listings')
      .select('title, description, duration_minutes')
      .eq('id', listingId)
      .single()
  ]);

  const coach = coachResult.data;
  const listing = listingResult.data;

  if (!coach || !listing) {
    console.warn("Missing coach or listing data for emails:", { 
      coach: !!coach, 
      listing: !!listing 
    });
    return;
  }

  // Get coach's email from auth user (if available)
  let coachEmail: string | undefined;
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(coach.auth_user_id);
    coachEmail = authUser.user?.email;
  } catch (error) {
    console.warn("Could not fetch coach email:", error);
  }

  // Calculate fee breakdown for transparency
  const feeBreakdown = getFeeBreakdown(session.amount_total || 0);

  // Prepare email data
  const emailData: BookingEmailData = {
    sessionId: session.id,
    bookingId: bookingId,

    athleteEmail: session.customer_details?.email || '',
    athleteName: session.customer_details?.name || undefined,

    coachName: coach.full_name || 'Coach',
    coachEmail: coachEmail || undefined,

    listingTitle: listing.title || 'Coaching Session',
    listingDescription: listing.description || undefined,
    duration: listing.duration_minutes || 60,

    amountPaid: session.amount_total || 0,
    currency: session.currency || 'usd',
    platformFee: feeBreakdown.platformFee,

    bookedAt: new Date(),

    nextSteps: "The coach will contact you within 24 hours to schedule your session."
  };

  // Send emails asynchronously (fire-and-forget)
  sendBookingEmailsAsync(emailData);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("✅ Processing payment success:", {
    payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    booking_request_id: paymentIntent.metadata?.booking_request_id
  });

  const supabase = await createClient();
  const bookingRequestId = paymentIntent.metadata?.booking_request_id;

  if (bookingRequestId) {
    // This is from /api/requests/[id]/accept flow - update booking_request status
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update({ status: 'accepted' })
      .eq('id', bookingRequestId);

    if (updateError) {
      console.error('❌ Failed to update booking request status:', updateError);
    }

    // Get booking request to send system message
    const { data: bookingRequest, error: requestError } = await supabase
      .from('booking_requests')
      .select('conversation_id')
      .eq('id', bookingRequestId)
      .single();

    if (!requestError && bookingRequest?.conversation_id) {
      // Send system message to conversation
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: bookingRequest.conversation_id,
          sender_id: null,
          body: "✅ Payment confirmed. Booking is now active!",
          kind: 'system'
        });

      if (messageError) {
        console.warn('⚠️ Failed to send payment success message:', messageError);
      }
    }
  }

  console.log("✅ Payment success handled for PaymentIntent:", paymentIntent.id);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("💥 Processing payment failure:", {
    payment_intent_id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    last_payment_error: paymentIntent.last_payment_error?.message,
    booking_request_id: paymentIntent.metadata?.booking_request_id
  });

  const supabase = await createClient();
  const bookingRequestId = paymentIntent.metadata?.booking_request_id;

  // Handle booking request payment failures
  if (bookingRequestId) {
    // Update booking request status back to pending
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update({ status: 'pending' })
      .eq('id', bookingRequestId);

    if (updateError) {
      console.error('❌ Failed to update booking request status:', updateError);
    }

    // Get booking request to send system message
    const { data: bookingRequest, error: requestError } = await supabase
      .from('booking_requests')
      .select('conversation_id')
      .eq('id', bookingRequestId)
      .single();

    if (!requestError && bookingRequest?.conversation_id) {
      const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
      
      // Send system message to conversation
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: bookingRequest.conversation_id,
          sender_id: null,
          body: `❌ Payment failed: ${errorMessage}. Please try again or update your payment method.`,
          kind: 'system'
        });

      if (messageError) {
        console.warn('⚠️ Failed to send payment failure message:', messageError);
      }
    }

    console.log("✅ Booking request payment failure handled:", bookingRequestId);
    return;
  }

  // Handle legacy checkout booking failures
  const { data: booking, error: findError } = await supabase
    .from("bookings")
    .select('id, status, payment_intent_id')
    .eq('payment_intent_id', paymentIntent.id)
    .single();

  if (findError) {
    if (findError.code === 'PGRST116') {
      console.log("ℹ️ No booking found for failed payment intent:", paymentIntent.id);
      // This is normal - payment failed before checkout completed
      return;
    }
    console.error("❌ Error finding booking for failed payment:", findError);
    throw new Error(`Database query failed: ${findError.message}`);
  }

  // Update booking status to failed
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ 
      status: 'failed',
      // Optionally store the failure reason
      // failure_reason: paymentIntent.last_payment_error?.message 
    })
    .eq('id', booking.id);

  if (updateError) {
    console.error("❌ Error updating booking status:", updateError);
    throw new Error(`Failed to update booking status: ${updateError.message}`);
  }

  console.log("✅ Booking status updated to failed:", {
    booking_id: booking.id,
    payment_intent_id: paymentIntent.id,
    previous_status: booking.status,
    new_status: 'failed'
  });
}