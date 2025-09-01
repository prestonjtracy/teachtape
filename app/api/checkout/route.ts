import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { z } from "zod";
import { calculateApplicationFee, getFeeBreakdown, validateFeeAmount } from "@/lib/stripeFees";

const CheckoutSchema = z.object({
  listing_id: z.string().uuid("Invalid listing ID"),
  coach_id: z.string().uuid("Invalid coach ID")
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log(`🔍 [POST /api/checkout] Request received`);
  
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.APP_URL;

    if (!secretKey) {
      console.error(`❌ [POST /api/checkout] Missing STRIPE_SECRET_KEY`);
      return new Response(
        JSON.stringify({ error: "Server configuration error" }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!appUrl) {
      console.error(`❌ [POST /api/checkout] Missing APP_URL`);
      return new Response(
        JSON.stringify({ error: "Server configuration error" }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
    const body = await req.json();
    
    // Validate input
    const validatedData = CheckoutSchema.parse(body);
    console.log(`✅ [POST /api/checkout] Input validated:`, {
      listing_id: validatedData.listing_id,
      coach_id: validatedData.coach_id
    });

    const supabase = createClient();

    // Fetch listing details from the listings table
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', validatedData.listing_id)
      .eq('is_active', true)
      .single();

    if (listingError || !listing) {
      console.error(`❌ [POST /api/checkout] Listing fetch error:`, listingError);
      return new Response(
        JSON.stringify({ error: "Listing not found or inactive" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ [POST /api/checkout] Listing found:`, {
      title: listing.title,
      price: listing.price_cents,
      duration: listing.duration_minutes
    });

    // Validate that the listing belongs to the specified coach
    if (listing.coach_id !== validatedData.coach_id) {
      console.error(`❌ [POST /api/checkout] Coach ID mismatch:`, {
        expectedCoachId: validatedData.coach_id,
        actualCoachId: listing.coach_id
      });
      return new Response(
        JSON.stringify({ error: "Listing does not belong to specified coach" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get coach data including Stripe account
    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', listing.coach_id)
      .single();

    const { data: coachData, error: coachError } = await supabase
      .from('coaches')
      .select('stripe_account_id')
      .eq('profile_id', listing.coach_id)
      .single();

    if (coachError || !coachData || !coachData.stripe_account_id) {
      console.error(`❌ [POST /api/checkout] Coach Stripe account not found:`, {
        coachId: listing.coach_id,
        error: coachError
      });
      return new Response(
        JSON.stringify({ error: "Coach payment setup incomplete" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify coach's Stripe account is ready to receive payments
    try {
      const account = await stripe.accounts.retrieve(coachData.stripe_account_id);
      
      if (!account.charges_enabled) {
        console.error(`❌ [POST /api/checkout] Coach charges not enabled:`, {
          coachId: listing.coach_id,
          stripeAccountId: coachData.stripe_account_id,
          chargesEnabled: account.charges_enabled
        });
        return new Response(
          JSON.stringify({ error: "Coach payment setup incomplete - charges not enabled" }), 
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(`✅ [POST /api/checkout] Coach Stripe account verified:`, {
        accountId: coachData.stripe_account_id,
        chargesEnabled: account.charges_enabled
      });
    } catch (stripeError) {
      console.error(`❌ [POST /api/checkout] Failed to verify Stripe account:`, stripeError);
      return new Response(
        JSON.stringify({ error: "Coach payment setup verification failed" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const coachName = coachProfile?.full_name || 'Coach';
    const rateCents = listing.price_cents;
    
    // Calculate platform fee using fee policy
    const platformFeeAmount = calculateApplicationFee(rateCents);
    const feeBreakdown = getFeeBreakdown(rateCents);
    
    // Validate fee amount for safety
    if (!validateFeeAmount(rateCents, platformFeeAmount)) {
      console.error(`❌ [POST /api/checkout] Invalid fee calculation:`, {
        rateCents,
        platformFeeAmount,
        coachReceives: rateCents - platformFeeAmount
      });
      return new Response(
        JSON.stringify({ error: "Invalid fee calculation" }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    
    console.log(`💰 [POST /api/checkout] Payment breakdown:`, {
      rateCents,
      platformFeeAmount,
      coachReceives: feeBreakdown.coachAmount,
      feePercentage: `${(feeBreakdown.feePercentage * 100).toFixed(1)}%`,
      fixedFee: `$${(feeBreakdown.fixedFeeCents / 100).toFixed(2)}`,
      stripeAccountId: coachData.stripe_account_id
    });

    // Create Stripe Checkout Session with platform fee
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${listing.title} with ${coachName}`,
              description: listing.description || `${listing.duration_minutes}-minute coaching session`
            },
            unit_amount: rateCents
          },
          quantity: 1
        }
      ],
      payment_intent_data: {
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: coachData.stripe_account_id
        }
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel?coach_id=${validatedData.coach_id}`,
      metadata: {
        listing_id: validatedData.listing_id,
        coach_id: validatedData.coach_id
      }
    });

    console.log(`✅ [POST /api/checkout] Stripe session created:`, { 
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
      console.error(`❌ [POST /api/checkout] Validation error:`, error.errors);
      return new Response(
        JSON.stringify({ 
          error: "Invalid request data",
          details: error.errors
        }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error(`❌ [POST /api/checkout] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}