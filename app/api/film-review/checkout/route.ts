import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { z } from "zod";
import { calcPlatformCutCents, calcAthleteFeeLineItems, getActiveCommissionSettings, validateFeeAmount } from "@/lib/stripeFees";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

// Video URL validation - only allow trusted platforms
const isValidVideoUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const allowedHosts = [
      'hudl.com', 'www.hudl.com',
      'youtube.com', 'www.youtube.com', 'youtu.be',
      'vimeo.com', 'www.vimeo.com', 'player.vimeo.com'
    ];
    return allowedHosts.some(host => urlObj.hostname === host || urlObj.hostname.endsWith('.' + host));
  } catch {
    return false;
  }
};

const FilmReviewCheckoutSchema = z.object({
  listing_id: z.string().uuid("Invalid listing ID"),
  coach_id: z.string().uuid("Invalid coach ID"),
  film_url: z.string().url("Invalid video URL").refine(isValidVideoUrl, {
    message: "Video URL must be from Hudl, YouTube, or Vimeo"
  }),
  athlete_notes: z.string().max(2000, "Notes too long (max 2000 characters)").optional().default('')
});

export async function POST(req: NextRequest) {
  console.log(`🎬 [POST /api/film-review/checkout] Request received`);

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.APP_URL;

    if (!secretKey || !appUrl) {
      console.error(`❌ [POST /api/film-review/checkout] Missing environment variables`);
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
    const body = await req.json();

    // Validate input
    const validatedData = FilmReviewCheckoutSchema.parse(body);
    console.log(`✅ [POST /api/film-review/checkout] Input validated:`, {
      listing_id: validatedData.listing_id,
      coach_id: validatedData.coach_id,
      film_url: '[HIDDEN FOR SECURITY]',
      has_notes: !!validatedData.athlete_notes
    });

    const supabase = createClient();

    // Fetch listing details - must be a film_review type listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', validatedData.listing_id)
      .eq('is_active', true)
      .single();

    if (listingError || !listing) {
      console.error(`❌ [POST /api/film-review/checkout] Listing fetch error:`, listingError);
      return new Response(
        JSON.stringify({ error: "Listing not found or inactive" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate listing type
    if (listing.listing_type !== 'film_review') {
      console.error(`❌ [POST /api/film-review/checkout] Invalid listing type:`, listing.listing_type);
      return new Response(
        JSON.stringify({ error: "This listing is not a film review service" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ [POST /api/film-review/checkout] Film review listing found:`, {
      title: listing.title,
      price: listing.price_cents,
      turnaround_hours: listing.turnaround_hours
    });

    // Validate coach ownership
    if (listing.coach_id !== validatedData.coach_id) {
      console.error(`❌ [POST /api/film-review/checkout] Coach ID mismatch`);
      return new Response(
        JSON.stringify({ error: "Listing does not belong to specified coach" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get coach profile and Stripe account
    const [profileResult, coachResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name')
        .eq('id', listing.coach_id)
        .single(),
      supabase
        .from('coaches')
        .select('stripe_account_id')
        .eq('profile_id', listing.coach_id)
        .single()
    ]);

    const coachProfile = profileResult.data;
    const coachData = coachResult.data;

    // Check for development mode
    const isDevelopment = process.env.DEVELOPMENT_MODE === 'true' && process.env.NODE_ENV !== 'production';

    if (!isDevelopment && (!coachData || !coachData.stripe_account_id)) {
      console.error(`❌ [POST /api/film-review/checkout] Coach Stripe account not found`);
      return new Response(
        JSON.stringify({ error: "Coach payment setup incomplete" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify Stripe account in production
    if (!isDevelopment && coachData?.stripe_account_id) {
      try {
        const account = await stripe.accounts.retrieve(coachData.stripe_account_id);
        if (!account.charges_enabled) {
          console.error(`❌ [POST /api/film-review/checkout] Coach charges not enabled`);
          return new Response(
            JSON.stringify({ error: "Coach payment setup incomplete" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        console.log(`✅ [POST /api/film-review/checkout] Coach Stripe account verified`);
      } catch (stripeError) {
        console.error(`❌ [POST /api/film-review/checkout] Stripe account verification failed:`, stripeError);
        return new Response(
          JSON.stringify({ error: "Coach payment setup verification failed" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const coachName = coachProfile?.full_name || 'Coach';
    const rateCents = listing.price_cents;
    const turnaroundHours = listing.turnaround_hours || 48;

    // Get commission settings
    const commissionSettings = await getActiveCommissionSettings();

    // Calculate platform cut
    const actualPlatformFee = calcPlatformCutCents(rateCents, commissionSettings.platformCommissionPercentage);

    // Calculate athlete service fees
    const athleteFeeLineItems = calcAthleteFeeLineItems(
      {
        percent: commissionSettings.athleteServiceFeePercentage,
        flatCents: commissionSettings.athleteServiceFeeFlatCents
      },
      rateCents
    );

    let totalAthleteFee = 0;
    if (athleteFeeLineItems.percentItem) totalAthleteFee += athleteFeeLineItems.percentItem.amount_cents;
    if (athleteFeeLineItems.flatItem) totalAthleteFee += athleteFeeLineItems.flatItem.amount_cents;

    // Validate fee calculation
    if (!validateFeeAmount(rateCents, actualPlatformFee)) {
      console.error(`❌ [POST /api/film-review/checkout] Invalid fee calculation`);
      return new Response(
        JSON.stringify({ error: "Invalid fee calculation" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`💰 [POST /api/film-review/checkout] Payment breakdown:`, {
      listingPrice: rateCents,
      athleteServiceFee: totalAthleteFee,
      totalCharged: rateCents + totalAthleteFee,
      platformCommission: actualPlatformFee,
      coachReceives: rateCents - actualPlatformFee,
      turnaroundHours
    });

    // Build line items
    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Film Review: ${listing.title}`,
            description: `${turnaroundHours}-hour turnaround film analysis by ${coachName}`
          },
          unit_amount: rateCents
        },
        quantity: 1
      }
    ];

    // Add service fee line items
    if (athleteFeeLineItems.percentItem) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: athleteFeeLineItems.percentItem.name,
            description: 'Platform service fee'
          },
          unit_amount: athleteFeeLineItems.percentItem.amount_cents
        },
        quantity: 1
      });
    }

    if (athleteFeeLineItems.flatItem) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: athleteFeeLineItems.flatItem.name,
            description: 'Platform service fee'
          },
          unit_amount: athleteFeeLineItems.flatItem.amount_cents
        },
        quantity: 1
      });
    }

    // Create checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: lineItems,
      success_url: `${appUrl}/dashboard?status=film_review_success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/coaches/${validatedData.coach_id}?status=cancelled`,
      metadata: {
        listing_id: validatedData.listing_id,
        coach_id: validatedData.coach_id,
        booking_type: 'film_review',
        film_url: validatedData.film_url,
        athlete_notes: validatedData.athlete_notes,
        turnaround_hours: turnaroundHours.toString(),
        commission_settings_applied: 'true',
        platform_fee_amount_cents: actualPlatformFee.toString(),
        athlete_service_fee: totalAthleteFee.toString()
      }
    };

    // Add payment intent data for Stripe Connect (if not in dev mode without account)
    if (coachData?.stripe_account_id) {
      sessionParams.payment_intent_data = {
        application_fee_amount: actualPlatformFee,
        transfer_data: {
          destination: coachData.stripe_account_id
        }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`✅ [POST /api/film-review/checkout] Stripe session created:`, {
      sessionId: session.id,
      url: session.url
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: session.url,
        sessionId: session.id
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ [POST /api/film-review/checkout] Validation error:`, error.errors);
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: error.errors.map(e => e.message)
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error(`❌ [POST /api/film-review/checkout] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
