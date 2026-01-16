import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { z } from "zod";
import { applyRateLimit } from "@/lib/rateLimitHelpers";

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

const FilmReviewRequestSchema = z.object({
  listing_id: z.string().uuid("Invalid listing ID"),
  coach_id: z.string().uuid("Invalid coach ID"),
  film_url: z.string().url("Invalid video URL").refine(isValidVideoUrl, {
    message: "Video URL must be from Hudl, YouTube, or Vimeo"
  }),
  athlete_notes: z.string().max(2000, "Notes too long (max 2000 characters)").optional().default(''),
  // Payment method info from SetupIntent
  setup_intent_id: z.string().optional(),
  payment_method_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  console.log(`🎬 [POST /api/film-review/request] Request received`);

  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(req, 'MODERATE');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.error(`❌ [POST /api/film-review/request] Missing STRIPE_SECRET_KEY`);
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
    const body = await req.json();

    // Validate input
    const validatedData = FilmReviewRequestSchema.parse(body);
    console.log(`✅ [POST /api/film-review/request] Input validated:`, {
      listing_id: validatedData.listing_id,
      coach_id: validatedData.coach_id,
      film_url: '[HIDDEN FOR SECURITY]',
      has_notes: !!validatedData.athlete_notes,
      has_payment_method: !!validatedData.payment_method_id
    });

    const supabase = createClient();

    // Get current user (athlete)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [POST /api/film-review/request] User not authenticated:', userError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [POST /api/film-review/request] Profile not found:', profileError);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Fetch listing details - must be a film_review type listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', validatedData.listing_id)
      .eq('is_active', true)
      .single();

    if (listingError || !listing) {
      console.error(`❌ [POST /api/film-review/request] Listing fetch error:`, listingError);
      return NextResponse.json(
        { error: "Listing not found or inactive" },
        { status: 400 }
      );
    }

    // Validate listing type
    if (listing.listing_type !== 'film_review') {
      console.error(`❌ [POST /api/film-review/request] Invalid listing type:`, listing.listing_type);
      return NextResponse.json(
        { error: "This listing is not a film review service" },
        { status: 400 }
      );
    }

    // Validate coach ownership
    if (listing.coach_id !== validatedData.coach_id) {
      console.error(`❌ [POST /api/film-review/request] Coach ID mismatch`);
      return NextResponse.json(
        { error: "Listing does not belong to specified coach" },
        { status: 400 }
      );
    }

    console.log(`✅ [POST /api/film-review/request] Film review listing found:`, {
      title: listing.title,
      price: listing.price_cents,
      turnaround_hours: listing.turnaround_hours
    });

    // Get coach profile
    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', listing.coach_id)
      .single();

    const coachName = coachProfile?.full_name || 'Coach';

    // Create or get Stripe customer for the athlete
    let stripeCustomerId: string | null = null;
    let paymentMethodId = validatedData.payment_method_id;
    let setupIntentId = validatedData.setup_intent_id;
    let setupIntentClientSecret: string | null = null;

    // If no payment method provided, create a SetupIntent for the client to complete
    if (!paymentMethodId) {
      console.log('🔧 [POST /api/film-review/request] Creating SetupIntent for payment method collection');

      try {
        // Get or create customer
        const existingCustomers = await stripe.customers.list({
          email: user.email!,
          limit: 1,
        });

        if (existingCustomers.data.length > 0) {
          stripeCustomerId = existingCustomers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: user.email!,
            name: profile.full_name || undefined,
            metadata: {
              profile_id: profile.id,
            },
          });
          stripeCustomerId = customer.id;
        }

        const setupIntent = await stripe.setupIntents.create({
          customer: stripeCustomerId,
          usage: 'off_session',
          metadata: {
            type: 'film_review_request',
            listing_id: validatedData.listing_id,
            coach_id: validatedData.coach_id,
            athlete_id: profile.id,
          },
          description: `Payment setup for film review: ${listing.title}`,
        });

        setupIntentId = setupIntent.id;
        setupIntentClientSecret = setupIntent.client_secret;

        console.log('✅ [POST /api/film-review/request] SetupIntent created:', setupIntent.id);

        // Return early - client needs to complete SetupIntent
        return NextResponse.json({
          success: false,
          needs_payment_method: true,
          client_secret: setupIntentClientSecret,
          setup_intent_id: setupIntentId,
          listing: {
            title: listing.title,
            price_cents: listing.price_cents,
            turnaround_hours: listing.turnaround_hours || 48,
          },
          message: 'Please complete payment method setup'
        });

      } catch (stripeError) {
        console.error('❌ [POST /api/film-review/request] SetupIntent creation failed:', stripeError);
        return NextResponse.json(
          { error: "Failed to setup payment method" },
          { status: 500 }
        );
      }
    }

    // Payment method provided - create the film review request (pending acceptance)
    console.log('✅ [POST /api/film-review/request] Payment method provided, creating request');

    // Get or verify customer ID
    if (!stripeCustomerId) {
      const existingCustomers = await stripe.customers.list({
        email: user.email!,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email!,
          name: profile.full_name || undefined,
          metadata: {
            profile_id: profile.id,
          },
        });
        stripeCustomerId = customer.id;
      }

      // Attach payment method to customer
      try {
        await stripe.paymentMethods.attach(paymentMethodId!, {
          customer: stripeCustomerId,
        });
      } catch (attachError: any) {
        if (attachError.code !== 'resource_already_exists') {
          console.error('❌ [POST /api/film-review/request] Failed to attach payment method:', attachError);
          return NextResponse.json(
            { error: "Failed to save payment method" },
            { status: 400 }
          );
        }
      }
    }

    // Use admin client to create the booking record
    const adminClient = createAdminClient();

    const { data: filmReviewRequest, error: insertError } = await adminClient
      .from('bookings')
      .insert({
        listing_id: validatedData.listing_id,
        coach_id: validatedData.coach_id,
        athlete_id: profile.id,
        customer_email: user.email,
        athlete_email: user.email,
        amount_paid_cents: listing.price_cents,
        status: 'pending', // Not paid yet
        booking_type: 'film_review',
        review_status: 'pending_acceptance',
        film_url: validatedData.film_url,
        athlete_notes: validatedData.athlete_notes,
        setup_intent_id: setupIntentId,
        payment_method_id: paymentMethodId,
        stripe_customer_id: stripeCustomerId,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ [POST /api/film-review/request] Failed to create request:', insertError);
      return NextResponse.json(
        { error: "Failed to create film review request" },
        { status: 500 }
      );
    }

    console.log('✅ [POST /api/film-review/request] Film review request created:', filmReviewRequest.id);

    // TODO: Send notification email to coach

    return NextResponse.json({
      success: true,
      request_id: filmReviewRequest.id,
      message: 'Film review request submitted successfully. The coach will review your request and you will only be charged if they accept.'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ [POST /api/film-review/request] Validation error:`, error.errors);
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors.map(e => e.message)
        },
        { status: 400 }
      );
    }

    console.error(`❌ [POST /api/film-review/request] Unexpected error:`, error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
