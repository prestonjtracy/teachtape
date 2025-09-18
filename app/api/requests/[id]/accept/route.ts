import { NextRequest, NextResponse } from "next/server";
import { createClientForApiRoute, createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { z } from "zod";
import { sendBookingRequestEmailsAsync } from "@/lib/email";
import { createMeeting } from "@/lib/zoom/api";

const AcceptRequestSchema = z.object({
  id: z.string().uuid("Invalid request ID"),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  console.log('🔍 [POST /api/requests/[id]/accept] Request received:', params.id);
  
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.error('❌ [POST /api/requests/accept] Missing STRIPE_SECRET_KEY');
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
    
    // Validate request ID
    const validatedData = AcceptRequestSchema.parse(params);
    const requestId = validatedData.id;

    const supabase = createClientForApiRoute(req);

    // Get current user (coach)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [POST /api/requests/accept] User not authenticated:', userError);
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
      console.error('❌ [POST /api/requests/accept] Coach profile not found or invalid role:', profileError);
      return NextResponse.json(
        { error: "Coach profile not found" },
        { status: 404 }
      );
    }

    // Get booking request with related data including coach info for Connect
    const { data: bookingRequest, error: requestError } = await supabase
      .from('booking_requests')
      .select(`
        *,
        listing:listings!inner(*),
        athlete:profiles!booking_requests_athlete_id_fkey(id, full_name, email),
        coach:profiles!booking_requests_coach_id_fkey(id, full_name)
      `)
      .eq('id', requestId)
      .eq('coach_id', coachProfile.id)
      .eq('status', 'pending')
      .single();

    if (requestError || !bookingRequest) {
      console.error('❌ [POST /api/requests/accept] Booking request not found:', requestError);
      return NextResponse.json(
        { error: "Booking request not found or not accessible" },
        { status: 404 }
      );
    }

    // Verify payment method exists
    if (!bookingRequest.payment_method_id) {
      console.error('❌ [POST /api/requests/accept] No payment method saved');
      return NextResponse.json(
        { error: "No payment method found for this request" },
        { status: 400 }
      );
    }

    // Get coach's Stripe Connect account ID
    const { data: coachData, error: coachError } = await supabase
      .from('coaches')
      .select('stripe_account_id')
      .eq('profile_id', coachProfile.id)
      .single();

    console.log('🔍 [POST /api/requests/accept] Coach data lookup:', {
      coachProfileId: coachProfile.id,
      coachData: coachData,
      coachError: coachError,
      hasStripeAccount: !!coachData?.stripe_account_id
    });

    if (coachError || !coachData?.stripe_account_id) {
      console.error('❌ [POST /api/requests/accept] Coach Stripe account not found:', {
        coachError,
        coachData,
        stripeAccountId: coachData?.stripe_account_id
      });
      return NextResponse.json(
        { error: "Coach payment setup incomplete" },
        { status: 400 }
      );
    }

    const coachStripeAccountId = coachData.stripe_account_id;

    // Calculate application fee using commission settings
    const listingPrice = bookingRequest.listing.price_cents;
    
    // Check feature flag
    const useCommissionSettings = process.env.ENABLE_COMMISSION_SETTINGS !== 'false';
    let applicationFee: number;
    
    if (useCommissionSettings) {
      // Use dynamic commission settings
      const { getActiveCommissionSettings, calcPlatformCutCents } = await import('@/lib/stripeFees');
      const commissionSettings = await getActiveCommissionSettings();
      applicationFee = calcPlatformCutCents(listingPrice, commissionSettings.platformCommissionPercentage);
      
      console.log('💰 [POST /api/requests/accept] Using commission settings:', {
        platformCommission: `${commissionSettings.platformCommissionPercentage}%`,
        applicationFee,
        listingPrice
      });
    } else {
      // Fall back to legacy 5% fee
      applicationFee = Math.round(listingPrice * 0.05);
      console.log('🚧 [POST /api/requests/accept] Using legacy 5% fee');
    }

    console.log('✅ [POST /api/requests/accept] Processing Connect payment:', {
      request_id: requestId,
      payment_method_id: bookingRequest.payment_method_id,
      amount: listingPrice,
      application_fee: applicationFee,
      coach_account: coachStripeAccountId
    });

    // Get or create Stripe Customer for the athlete
    let customerId: string;
    
    // Try to find existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: bookingRequest.athlete.email,
      limit: 1,
    });
    
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log('✅ [POST /api/requests/accept] Found existing customer:', customerId);
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: bookingRequest.athlete.email,
        name: bookingRequest.athlete.full_name,
        metadata: {
          athlete_id: bookingRequest.athlete_id,
        },
      });
      customerId = customer.id;
      console.log('✅ [POST /api/requests/accept] Created new customer:', customerId);
    }

    // Attach the payment method to the customer
    try {
      await stripe.paymentMethods.attach(bookingRequest.payment_method_id, {
        customer: customerId,
      });
      console.log('✅ [POST /api/requests/accept] Payment method attached to customer');
    } catch (attachError: any) {
      // If already attached, that's fine - continue
      if (attachError.code !== 'resource_already_exists') {
        console.error('❌ [POST /api/requests/accept] Failed to attach payment method:', attachError);
        throw attachError;
      }
      console.log('✅ [POST /api/requests/accept] Payment method already attached to customer');
    }

    // Create PaymentIntent with Stripe Connect
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: listingPrice,
        currency: 'usd',
        customer: customerId,
        payment_method: bookingRequest.payment_method_id,
        confirmation_method: 'manual',
        confirm: true,
        off_session: true, // Indicates this is for a saved payment method
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: coachStripeAccountId,
        },
        // Removed on_behalf_of to avoid card_payments capability requirement
        metadata: {
          booking_request_id: requestId,
          listing_id: bookingRequest.listing_id,
          coach_id: bookingRequest.coach_id,
          athlete_id: bookingRequest.athlete_id,
          coach_stripe_account: coachStripeAccountId,
          customer_id: customerId,
        },
        description: `TeachTape: ${bookingRequest.listing.title}`,
      });

      console.log('✅ [POST /api/requests/accept] Connect PaymentIntent created:', paymentIntent.id);
    } catch (stripeError: any) {
      console.error('❌ [POST /api/requests/accept] Stripe Connect payment failed:', stripeError);
      
      // Send failure message to conversation
      let errorMessage = "Payment failed. Please try again.";
      
      // Handle specific Stripe errors with user-friendly messages
      if (stripeError.code === 'authentication_required') {
        errorMessage = "Payment authentication required. Please update your payment method.";
      } else if (stripeError.code === 'card_declined') {
        errorMessage = "Payment was declined. Please try a different payment method.";
      } else if (stripeError.code === 'insufficient_funds') {
        errorMessage = "Insufficient funds. Please use a different payment method.";
      } else if (stripeError.code === 'expired_card') {
        errorMessage = "Your card has expired. Please update your payment method.";
      } else if (stripeError.message) {
        errorMessage = `Payment failed: ${stripeError.message}`;
      }

      // Send error message to conversation
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: bookingRequest.conversation_id,
          sender_id: null,
          body: `❌ ${errorMessage}`,
          kind: 'system'
        });

      if (msgError) {
        console.warn('⚠️ [POST /api/requests/accept] Failed to send error message:', msgError);
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Handle different payment intent statuses
    if (paymentIntent.status === 'requires_action') {
      console.log('🔐 [POST /api/requests/accept] Payment requires additional authentication (SCA)');
      
      // Send message to conversation with payment link
      const appUrl = process.env.APP_URL || 'https://teachtape.local';
      const paymentUrl = `${appUrl}/payment/complete?payment_intent_client_secret=${paymentIntent.client_secret}&conversation_id=${bookingRequest.conversation_id}`;
      const scaMessage = `🔐 Payment requires additional authentication. Please complete your payment using this secure link: ${paymentUrl}`;
      
      const { error: scaMessageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: bookingRequest.conversation_id,
          sender_id: null,
          body: scaMessage,
          kind: 'system'
        });

      if (scaMessageError) {
        console.warn('⚠️ [POST /api/requests/accept] Failed to send SCA message:', scaMessageError);
      }

      return NextResponse.json({
        success: false,
        requires_action: true,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        message: 'Payment requires additional authentication. Check the chat for payment link.'
      });
    }

    if (paymentIntent.status !== 'succeeded') {
      console.error('❌ [POST /api/requests/accept] Payment not succeeded:', paymentIntent.status);
      
      // Send failure message to conversation
      const failureMessage = `❌ Payment failed with status: ${paymentIntent.status}. Please try again or update your payment method.`;
      
      const { error: failureMessageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: bookingRequest.conversation_id,
          sender_id: null,
          body: failureMessage,
          kind: 'system'
        });

      if (failureMessageError) {
        console.warn('⚠️ [POST /api/requests/accept] Failed to send failure message:', failureMessageError);
      }

      return NextResponse.json(
        { error: `Payment failed with status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    console.log('✅ [POST /api/requests/accept] Payment successful, creating booking');

    // Create Zoom meeting for the session
    let zoomJoinUrl: string | null = null;
    let zoomStartUrl: string | null = null;
    
    try {
      console.log('🎥 [POST /api/requests/accept] Creating Zoom meeting...');
      const meetingDetails = await createMeeting({
        topic: `TeachTape Session: ${bookingRequest.listing.title}`,
        start_time: bookingRequest.proposed_start,
        duration: bookingRequest.listing.duration_minutes || 60,
        coach_email: user.email!,
        athlete_name: bookingRequest.athlete.full_name || 'Athlete',
      });
      
      zoomJoinUrl = meetingDetails.join_url;
      zoomStartUrl = meetingDetails.host_join_url;
      
      console.log('✅ [POST /api/requests/accept] Zoom meeting created:', meetingDetails.id);
    } catch (zoomError) {
      console.error('❌ [POST /api/requests/accept] Zoom meeting creation failed:', zoomError);
      // Don't fail the booking if Zoom fails - just log the error
      // The booking will be created without Zoom links
    }

    // Create booking record using admin client to bypass RLS
    const adminClient = createAdminClient();
    const { data: booking, error: bookingError } = await adminClient
      .from('bookings')
      .insert({
        listing_id: bookingRequest.listing_id,
        coach_id: bookingRequest.coach_id,
        customer_email: bookingRequest.athlete.email,
        amount_paid_cents: bookingRequest.listing.price_cents,
        status: 'paid', // Use 'paid' status as per original schema
        starts_at: bookingRequest.proposed_start,
        ends_at: bookingRequest.proposed_end,
        stripe_session_id: paymentIntent.id, // Use payment_intent_id as session_id for Connect payments
      })
      .select('id')
      .single();

    if (bookingError) {
      console.error('❌ [POST /api/requests/accept] Booking creation failed:', {
        error: bookingError,
        errorMessage: bookingError.message,
        errorCode: bookingError.code,
        errorDetails: bookingError.details,
        bookingData: {
          listing_id: bookingRequest.listing_id,
          coach_id: bookingRequest.coach_id,
          customer_email: bookingRequest.athlete.email,
          amount_paid_cents: bookingRequest.listing.price_cents,
          status: 'paid',
          starts_at: bookingRequest.proposed_start,
          ends_at: bookingRequest.proposed_end,
          stripe_session_id: paymentIntent.id,
        }
      });
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
    }

    // Update booking request status
    const { error: updateError } = await adminClient
      .from('booking_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ [POST /api/requests/accept] Failed to update request status:', updateError);
      // Don't fail the whole request for this
    }

    // Create structured system message for booking acceptance
    const messageData = {
      type: 'booking_accepted',
      booking_id: booking.id,
      starts_at: bookingRequest.proposed_start,
      ends_at: bookingRequest.proposed_end,
      timezone: bookingRequest.timezone,
      listing_title: bookingRequest.listing.title,
      athlete_join_url: zoomJoinUrl,
      coach_start_url: zoomStartUrl,
      amount_paid_cents: bookingRequest.listing.price_cents
    };

    // Create a fallback message for systems that don't support the new format
    let systemMessage = "✅ Booking accepted! Payment processed successfully.";
    
    // Add Zoom meeting info if available
    if (zoomJoinUrl) {
      const sessionDate = new Date(bookingRequest.proposed_start).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: bookingRequest.timezone,
      });
      
      systemMessage += `\n\n🎥 **Zoom Meeting Ready**\n📅 ${sessionDate}\n\n**For Athlete:** [🎥 Join Meeting](${zoomJoinUrl})\n\n**For Coach:** [🎥 Start Meeting](${zoomStartUrl})`;
    }

    const { error: messageError } = await adminClient
      .from('messages')
      .insert({
        conversation_id: bookingRequest.conversation_id,
        sender_id: null, // System message
        body: systemMessage,
        kind: 'booking_accepted',
        metadata: messageData
      });

    if (messageError) {
      console.warn('⚠️ [POST /api/requests/accept] Failed to send system message:', messageError);
    } else {
      console.log('✅ [POST /api/requests/accept] System message sent successfully');
    }

    console.log('✅ [POST /api/requests/accept] Request accepted successfully:', {
      request_id: requestId,
      booking_id: booking.id,
      payment_intent_id: paymentIntent.id
    });

    // Send email notification to athlete (fire-and-forget)
    try {
      const { data: athleteAuth } = await supabase.auth.admin.getUserById(bookingRequest.athlete.id);
      const athleteEmail = athleteAuth.user?.email;

      if (athleteEmail) {
        const emailData = {
          requestId: requestId,
          athleteEmail: athleteEmail,
          athleteName: bookingRequest.athlete.full_name || undefined,
          coachName: bookingRequest.coach.full_name || 'Coach',
          coachEmail: user.email!,
          listingTitle: bookingRequest.listing.title,
          listingDescription: undefined,
          duration: undefined,
          priceCents: bookingRequest.listing.price_cents,
          proposedStart: new Date(bookingRequest.proposed_start),
          proposedEnd: new Date(bookingRequest.proposed_end),
          timezone: bookingRequest.timezone,
          requestedAt: new Date(),
          chatUrl: `${process.env.APP_URL || 'https://teachtape.local'}/messages/${bookingRequest.conversation_id}`
        };

        sendBookingRequestEmailsAsync(emailData, 'accepted');
        console.log('📧 [POST /api/requests/accept] Email notification queued for athlete');
      }
    } catch (emailError) {
      console.warn('⚠️ [POST /api/requests/accept] Failed to send email notification:', emailError);
    }

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      payment_intent_id: paymentIntent.id,
      message: 'Booking request accepted and payment processed successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ [POST /api/requests/accept] Validation error:', error.errors);
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('❌ [POST /api/requests/accept] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}