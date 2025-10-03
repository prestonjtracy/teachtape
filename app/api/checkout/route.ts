import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { z } from "zod";
import { calculateApplicationFee, getFeeBreakdown, validateFeeAmount, getActiveCommissionSettings, getExtendedFeeBreakdown, calcPlatformCutCents, calcAthleteFeeLineItems } from "@/lib/stripeFees";

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

    // SECURITY: Prevent development mode in production
    const isDevelopment = process.env.DEVELOPMENT_MODE === 'true' && process.env.NODE_ENV !== 'production';

    if (process.env.DEVELOPMENT_MODE === 'true' && process.env.NODE_ENV === 'production') {
      console.error('❌ [POST /api/checkout] CRITICAL: DEVELOPMENT_MODE cannot be enabled in production!');
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isDevelopment && (coachError || !coachData || !coachData.stripe_account_id)) {
      console.error(`❌ [POST /api/checkout] Coach Stripe account not found:`, {
        coachId: listing.coach_id,
        error: coachError
      });
      return new Response(
        JSON.stringify({ error: "Coach payment setup incomplete" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (isDevelopment && (!coachData || !coachData.stripe_account_id)) {
      console.log(`🚧 [POST /api/checkout] Development mode: Skipping Stripe validation`);
      // In development mode, simulate a successful booking
      return new Response(
        JSON.stringify({ 
          success: true,
          url: `${appUrl}/success?session_id=dev_session_${Date.now()}`,
          sessionId: `dev_session_${Date.now()}`,
          development: true
        }), 
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify coach's Stripe account is ready to receive payments (skip in development)
    if (!isDevelopment) {
      if (!coachData?.stripe_account_id) {
        console.error(`❌ [POST /api/checkout] Coach has no Stripe account configured`);
        return new Response(
          JSON.stringify({ error: "Coach payment setup incomplete - no Stripe account" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

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
    } else {
      console.log(`🚧 [POST /api/checkout] Development mode: Skipping Stripe account verification`);
    }

    const coachName = coachProfile?.full_name || 'Coach';
    const rateCents = listing.price_cents;
    
    // In development mode with no Stripe account, create a simple checkout session without fees
    if (isDevelopment && (!coachData || !coachData.stripe_account_id)) {
      console.log(`🚧 [POST /api/checkout] Development mode: Creating simple checkout session`);
      
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
        success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}&dev=true`,
        cancel_url: `${appUrl}/cancel?coach_id=${validatedData.coach_id}`,
        metadata: {
          listing_id: validatedData.listing_id,
          coach_id: validatedData.coach_id,
          development_mode: 'true'
        }
      });

      console.log(`✅ [POST /api/checkout] Development Stripe session created:`, { 
        sessionId: session.id,
        url: session.url 
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          url: session.url,
          sessionId: session.id,
          development: true
        }), 
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Production mode with full Stripe setup
    // Check feature flag
    const useCommissionSettings = process.env.ENABLE_COMMISSION_SETTINGS !== 'false';
    
    if (!useCommissionSettings) {
      console.log('🚧 [POST /api/checkout] Commission settings disabled, using legacy behavior');
      // Fall back to legacy fixed behavior
      const platformFeeAmount = calculateApplicationFee(rateCents);
      
      if (!validateFeeAmount(rateCents, platformFeeAmount)) {
        return new Response(
          JSON.stringify({ error: "Invalid fee calculation" }), 
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // TypeScript assertion: coachData is guaranteed to be non-null here due to earlier checks
      if (!coachData) {
        throw new Error("Coach data unexpectedly null");
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${listing.title} with ${coachName}`,
              description: listing.description || `${listing.duration_minutes}-minute coaching session`
            },
            unit_amount: rateCents
          },
          quantity: 1
        }],
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
          coach_id: validatedData.coach_id,
          legacy_mode: 'true'
        }
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          url: session.url,
          sessionId: session.id
        }), 
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Get commission settings from database once
    const commissionSettings = await getActiveCommissionSettings();
    
    // Calculate platform cut using new function with clamping
    const actualPlatformFee = calcPlatformCutCents(rateCents, commissionSettings.platformCommissionPercentage);
    
    // Calculate athlete fee line items
    const athleteFeeLineItems = calcAthleteFeeLineItems(
      {
        percent: commissionSettings.athleteServiceFeePercentage,
        flatCents: commissionSettings.athleteServiceFeeFlatCents
      },
      rateCents
    );
    
    // Calculate total athlete fee
    let totalAthleteFee = 0;
    if (athleteFeeLineItems.percentItem) totalAthleteFee += athleteFeeLineItems.percentItem.amount_cents;
    if (athleteFeeLineItems.flatItem) totalAthleteFee += athleteFeeLineItems.flatItem.amount_cents;
    
    const totalChargeAmount = rateCents + totalAthleteFee;
    const coachReceives = rateCents - actualPlatformFee;
    
    // Validate fee amount for safety
    if (!validateFeeAmount(rateCents, actualPlatformFee)) {
      console.error(`❌ [POST /api/checkout] Invalid fee calculation:`, {
        rateCents,
        actualPlatformFee,
        coachReceives
      });
      return new Response(
        JSON.stringify({ error: "Invalid fee calculation" }), 
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure coachData is not null before proceeding
    if (!coachData) {
      throw new Error("Coach data unexpectedly null");
    }

    console.log(`💰 [POST /api/checkout] Payment breakdown:`, {
      listingPrice: rateCents,
      athleteServiceFee: totalAthleteFee,
      totalChargedToAthlete: totalChargeAmount,
      platformCommission: actualPlatformFee,
      coachReceives,
      commissionPercentage: `${commissionSettings.platformCommissionPercentage.toFixed(1)}%`,
      stripeAccountId: coachData.stripe_account_id
    });

    // Build line items for checkout - start with main listing
    const lineItems = [
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
    ];

    // Add athlete service fee line items if applicable (not included in coach subtotal)
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

    // Create Stripe Checkout Session with platform commission
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: actualPlatformFee,
        transfer_data: {
          destination: coachData.stripe_account_id
        }
      },
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancel?coach_id=${validatedData.coach_id}`,
      metadata: {
        listing_id: validatedData.listing_id,
        coach_id: validatedData.coach_id,
        commission_percentage: commissionSettings.platformCommissionPercentage.toString(),
        athlete_service_fee: totalAthleteFee.toString(),
        platform_fee_amount_cents: actualPlatformFee.toString(),
        commission_settings_applied: 'true'
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