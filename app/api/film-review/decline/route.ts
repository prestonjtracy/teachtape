import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import Stripe from "stripe";
import { sendEmailResend } from "@/lib/email";
import { generateFilmReviewDeclinedAthleteEmail, FilmReviewEmailData } from "@/lib/emailTemplates";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const DeclineSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID")
});

export async function POST(req: NextRequest) {
  console.log(`🎬 [POST /api/film-review/decline] Request received`);

  try {
    const body = await req.json();
    const { bookingId } = DeclineSchema.parse(body);

    const supabase = createClient();

    // Verify the current user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error(`❌ [POST /api/film-review/decline] Authentication failed`);
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
      console.error(`❌ [POST /api/film-review/decline] Not a coach`);
      return new Response(
        JSON.stringify({ error: "Only coaches can decline film review requests" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the booking with listing details
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        listing:listings(title, turnaround_hours)
      `)
      .eq("id", bookingId)
      .eq("coach_id", profile.id)
      .eq("review_status", "pending_acceptance")
      .single();

    if (fetchError || !booking) {
      console.error(`❌ [POST /api/film-review/decline] Booking not found or unauthorized:`, fetchError);
      return new Response(
        JSON.stringify({ error: "Booking not found or already processed" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`⚠️ [POST /api/film-review/decline] Declining booking:`, {
      bookingId,
      amountPaid: booking.amount_paid_cents,
      athleteEmail: booking.athlete_email || booking.customer_email
    });

    // Update booking status to declined
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        review_status: "declined"
      })
      .eq("id", bookingId)
      .eq("review_status", "pending_acceptance");

    if (updateError) {
      console.error(`❌ [POST /api/film-review/decline] Failed to update booking:`, updateError);
      return new Response(
        JSON.stringify({ error: "Failed to decline booking" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Process refund through Stripe
    let refundIssued = false;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (stripeSecretKey && booking.stripe_session_id) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2024-06-20"
        });

        const session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id);

        if (session.payment_intent) {
          const refund = await stripe.refunds.create({
            payment_intent: session.payment_intent as string,
            reason: 'requested_by_customer'
          });

          console.log(`✅ [POST /api/film-review/decline] Refund created:`, {
            refundId: refund.id,
            amount: refund.amount,
            status: refund.status
          });

          refundIssued = true;
        } else {
          console.warn(`⚠️ [POST /api/film-review/decline] No payment intent found for session`);
        }
      } catch (stripeError) {
        console.error(`❌ [POST /api/film-review/decline] Stripe refund error:`, stripeError);
        // Continue even if refund fails - admin can handle manually
      }
    } else {
      console.log(`⚠️ [POST /api/film-review/decline] Skipping refund (no Stripe key or session ID)`);
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
          turnaroundHours: booking.listing?.turnaround_hours || 48,
          priceCents: booking.amount_paid_cents,
          appUrl: appUrl
        };

        const emailContent = generateFilmReviewDeclinedAthleteEmail(emailData);

        await sendEmailResend({
          to: athleteEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });

        console.log(`✅ [POST /api/film-review/decline] Refund email sent to athlete: ${athleteEmail}`);
      }
    } catch (emailError) {
      // Log but don't fail the request
      console.error(`⚠️ [POST /api/film-review/decline] Failed to send email:`, emailError);
    }

    console.log(`✅ [POST /api/film-review/decline] Successfully declined booking ${bookingId}`);

    return new Response(
      JSON.stringify({
        success: true,
        refundIssued,
        message: refundIssued
          ? "Booking declined and refund issued"
          : "Booking declined (refund may need manual processing)"
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ [POST /api/film-review/decline] Validation error:`, error.errors);
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: error.errors.map(e => e.message)
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error(`❌ [POST /api/film-review/decline] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
