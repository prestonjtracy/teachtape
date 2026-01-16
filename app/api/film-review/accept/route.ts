import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import Stripe from "stripe";
import { sendEmailResend } from "@/lib/email";
import { generateFilmReviewAcceptedAthleteEmail, FilmReviewEmailData } from "@/lib/emailTemplates";
import { getActiveCommissionSettings, calcPlatformCutCents } from "@/lib/stripeFees";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const AcceptSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID")
});

export async function POST(req: NextRequest) {
  console.log(`🎬 [POST /api/film-review/accept] Request received`);

  try {
    const body = await req.json();
    const { bookingId } = AcceptSchema.parse(body);

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.error('❌ [POST /api/film-review/accept] Missing STRIPE_SECRET_KEY');
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
    const supabase = createClient();

    // Verify the current user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error(`❌ [POST /api/film-review/accept] Authentication failed`);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'coach') {
      console.error(`❌ [POST /api/film-review/accept] Not a coach`);
      return new Response(
        JSON.stringify({ error: "Only coaches can accept film review requests" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the booking with listing details
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        listing:listings(title, turnaround_hours, price_cents)
      `)
      .eq("id", bookingId)
      .eq("coach_id", profile.id)
      .eq("review_status", "pending_acceptance")
      .single();

    if (fetchError || !booking) {
      console.error(`❌ [POST /api/film-review/accept] Booking not found or unauthorized:`, fetchError);
      return new Response(
        JSON.stringify({ error: "Booking not found or already processed" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get turnaround hours from the listing
    const turnaroundHours = booking.listing?.turnaround_hours || 48;

    // Calculate deadline
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + turnaroundHours);

    console.log(`✅ [POST /api/film-review/accept] Accepting booking:`, {
      bookingId,
      turnaroundHours,
      deadline: deadline.toISOString(),
      hasPaymentMethod: !!booking.payment_method_id,
      status: booking.status
    });

    // Check if this is a deferred payment (new flow) or already paid (old flow)
    const needsPayment = booking.status === 'pending' && booking.payment_method_id;

    if (needsPayment) {
      console.log('💳 [POST /api/film-review/accept] Processing deferred payment');

      // Get coach's Stripe Connect account ID
      const { data: coachData, error: coachError } = await supabase
        .from('coaches')
        .select('stripe_account_id')
        .eq('profile_id', profile.id)
        .single();

      if (coachError || !coachData?.stripe_account_id) {
        console.error('❌ [POST /api/film-review/accept] Coach Stripe account not found');
        return new Response(
          JSON.stringify({ error: "Coach payment setup incomplete. Please complete Stripe onboarding first." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Verify Stripe account has charges_enabled
      const coachStripeAccount = await stripe.accounts.retrieve(coachData.stripe_account_id);
      if (!coachStripeAccount.charges_enabled) {
        console.error('❌ [POST /api/film-review/accept] Coach Stripe account not ready');
        return new Response(
          JSON.stringify({ error: "Coach payment setup incomplete. Please complete Stripe onboarding." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get commission settings and calculate platform fee
      const commissionSettings = await getActiveCommissionSettings();
      const listingPrice = booking.amount_paid_cents;
      const applicationFee = calcPlatformCutCents(listingPrice, commissionSettings.platformCommissionPercentage);

      console.log('💰 [POST /api/film-review/accept] Payment breakdown:', {
        listingPrice,
        applicationFee,
        coachReceives: listingPrice - applicationFee,
        commissionRate: commissionSettings.platformCommissionPercentage
      });

      // Get or verify customer ID
      let customerId = booking.stripe_customer_id;
      if (!customerId) {
        // Try to find existing customer
        const athleteEmail = booking.athlete_email || booking.customer_email;
        if (athleteEmail) {
          const existingCustomers = await stripe.customers.list({
            email: athleteEmail,
            limit: 1,
          });

          if (existingCustomers.data.length > 0) {
            customerId = existingCustomers.data[0].id;
          } else {
            const customer = await stripe.customers.create({
              email: athleteEmail,
              metadata: {
                booking_id: bookingId,
              },
            });
            customerId = customer.id;
          }
        }
      }

      if (!customerId) {
        console.error('❌ [POST /api/film-review/accept] No customer ID available');
        return new Response(
          JSON.stringify({ error: "Customer information not found. Please contact support." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Attach payment method to customer (if not already attached)
      try {
        await stripe.paymentMethods.attach(booking.payment_method_id, {
          customer: customerId,
        });
      } catch (attachError: any) {
        if (attachError.code !== 'resource_already_exists') {
          console.error('❌ [POST /api/film-review/accept] Failed to attach payment method:', attachError);
          throw attachError;
        }
      }

      // Create PaymentIntent and charge the saved payment method
      let paymentIntent: Stripe.PaymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: listingPrice,
          currency: 'usd',
          customer: customerId,
          payment_method: booking.payment_method_id,
          confirmation_method: 'manual',
          confirm: true,
          off_session: true,
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: coachData.stripe_account_id,
          },
          on_behalf_of: coachData.stripe_account_id,
          metadata: {
            booking_id: bookingId,
            booking_type: 'film_review',
            coach_id: booking.coach_id,
            athlete_email: booking.athlete_email || booking.customer_email || '',
          },
          description: `TeachTape Film Review: ${booking.listing?.title || 'Film Review'}`,
        }, {
          idempotencyKey: `film-review-accept-${bookingId}`,
        });

        console.log('✅ [POST /api/film-review/accept] PaymentIntent created:', paymentIntent.id, 'status:', paymentIntent.status);
      } catch (stripeError: any) {
        console.error('❌ [POST /api/film-review/accept] Payment failed:', stripeError);

        // Handle specific errors
        let errorMessage = "Payment failed. The athlete's card may have been declined.";
        if (stripeError.code === 'card_declined') {
          errorMessage = "The athlete's card was declined. They will need to update their payment method.";
        } else if (stripeError.code === 'expired_card') {
          errorMessage = "The athlete's card has expired. They will need to update their payment method.";
        } else if (stripeError.code === 'insufficient_funds') {
          errorMessage = "The athlete's card has insufficient funds.";
        } else if (stripeError.code === 'authentication_required') {
          errorMessage = "Additional authentication required. The athlete will need to confirm the payment.";
        }

        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Handle SCA (Strong Customer Authentication) if required
      if (paymentIntent.status === 'requires_action') {
        console.log('🔐 [POST /api/film-review/accept] Payment requires additional authentication');
        // TODO: Handle SCA flow - for now, return error
        return new Response(
          JSON.stringify({
            error: "Additional authentication required",
            requires_action: true,
            message: "The athlete's bank requires additional authentication. Please ask them to try again or use a different card."
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (paymentIntent.status !== 'succeeded') {
        console.error('❌ [POST /api/film-review/accept] Payment not succeeded:', paymentIntent.status);
        return new Response(
          JSON.stringify({ error: `Payment failed with status: ${paymentIntent.status}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log('✅ [POST /api/film-review/accept] Payment succeeded!');

      // Update booking with payment info and acceptance
      const adminClient = createAdminClient();
      const { error: updateError } = await adminClient
        .from("bookings")
        .update({
          status: "paid",
          review_status: "accepted",
          coach_accepted_at: new Date().toISOString(),
          deadline_at: deadline.toISOString(),
          payment_intent_id: paymentIntent.id,
          stripe_session_id: paymentIntent.id,
        })
        .eq("id", bookingId);

      if (updateError) {
        console.error(`❌ [POST /api/film-review/accept] Failed to update booking:`, updateError);
        console.error('🚨 CRITICAL: Payment succeeded but booking update failed!', {
          bookingId,
          paymentIntentId: paymentIntent.id
        });
        // Return error so user knows something went wrong
        return new Response(
          JSON.stringify({
            error: `Payment was processed but failed to update booking status: ${updateError.message}. Please contact support.`,
            payment_processed: true,
            payment_intent_id: paymentIntent.id
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      // Old flow - booking already paid, just update status
      console.log('📝 [POST /api/film-review/accept] Updating already-paid booking');

      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          review_status: "accepted",
          coach_accepted_at: new Date().toISOString(),
          deadline_at: deadline.toISOString()
        })
        .eq("id", bookingId)
        .eq("review_status", "pending_acceptance");

      if (updateError) {
        console.error(`❌ [POST /api/film-review/accept] Failed to update booking:`, updateError);
        return new Response(
          JSON.stringify({ error: "Failed to accept booking" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Send email notification to athlete
    try {
      const athleteEmail = booking.athlete_email || booking.customer_email;
      if (athleteEmail) {
        const appUrl = process.env.APP_URL || 'https://teachtapesports.com';

        const emailData: FilmReviewEmailData = {
          bookingId: booking.id,
          athleteEmail: athleteEmail,
          athleteName: booking.athlete_name || undefined,
          coachName: profile.full_name || 'Coach',
          listingTitle: booking.listing?.title || 'Film Review',
          turnaroundHours: turnaroundHours,
          priceCents: booking.amount_paid_cents,
          deadline: deadline,
          appUrl: appUrl
        };

        const emailContent = generateFilmReviewAcceptedAthleteEmail(emailData);

        await sendEmailResend({
          to: athleteEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });

        console.log(`✅ [POST /api/film-review/accept] Email sent to athlete: ${athleteEmail}`);
      }
    } catch (emailError) {
      // Log but don't fail the request - the acceptance was successful
      console.error(`⚠️ [POST /api/film-review/accept] Failed to send email:`, emailError);
    }

    console.log(`✅ [POST /api/film-review/accept] Successfully accepted booking ${bookingId}`);

    return new Response(
      JSON.stringify({
        success: true,
        deadline: deadline.toISOString(),
        turnaroundHours,
        payment_processed: needsPayment
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ [POST /api/film-review/accept] Validation error:`, error.errors);
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: error.errors.map(e => e.message)
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error(`❌ [POST /api/film-review/accept] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
