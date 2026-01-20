import Stripe from "stripe";
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Handles Stripe Connect Express onboarding for coaches.
 *
 * Creates a Stripe Express account, stores it in the coaches table,
 * and returns an onboarding link.
 */
export async function POST(request: Request) {
  console.log("🚀 [Stripe Connect] Route started - updated");

  try {
    // Verify required environment variables
    const secretKey = process.env.STRIPE_SECRET_KEY;
    console.log("🔑 [Stripe Connect] Environment check:", { 
      hasStripeKey: !!secretKey,
      appUrl: process.env.APP_URL || 'not set'
    });
    
    if (!secretKey) {
      console.log("❌ [Stripe Connect] Missing STRIPE_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Retrieve the application base URL used for redirects.
    // Priority: APP_URL env var > VERCEL_URL > default to production domain
    const appUrl =
      process.env.APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'https://teachtapesports.com';

    console.log('🌐 [Stripe Connect] Using APP_URL:', appUrl);

    let baseUrl: URL;
    try {
      baseUrl = new URL(appUrl);
    } catch (error) {
      console.error('❌ [Stripe Connect] Invalid APP_URL:', appUrl, error);
      return new Response(JSON.stringify({ error: "Invalid APP_URL configuration" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase and get current user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('🔍 [Stripe Connect] Auth check:', { 
      user: user ? user.id : null, 
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.log('❌ [Stripe Connect] Authentication failed');
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Find the coach record for this user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check if user is a coach
    if (profile.role !== 'coach') {
      return new Response(
        JSON.stringify({ error: "Only coaches can connect Stripe accounts" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get or create coach record
    let { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('id, stripe_account_id')
      .eq('profile_id', profile.id)
      .single();

    if (coachError && coachError.code === 'PGRST116') {
      // Coach record doesn't exist, create it
      const { data: newCoach, error: createError } = await supabase
        .from('coaches')
        .insert({
          profile_id: profile.id,
          is_public: true
        })
        .select('id, stripe_account_id')
        .single();

      if (createError) {
        console.error('Failed to create coach record:', createError);
        return new Response(
          JSON.stringify({ error: "Failed to create coach record" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      
      coach = newCoach;
    } else if (coachError) {
      console.error('Failed to fetch coach record:', coachError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch coach record" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Initialize Stripe
    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

    let stripeAccountId = coach?.stripe_account_id;

    // Create Stripe account if it doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: 'US', // You might want to make this configurable
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      });

      stripeAccountId = account.id;

      // Store the account ID in the coaches table using conditional update
      // to prevent race condition where two requests create separate accounts
      const { data: updateResult, error: updateError } = await supabase
        .from('coaches')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', coach!.id)
        .is('stripe_account_id', null) // Only update if no account exists yet
        .select('stripe_account_id')
        .single();

      if (updateError) {
        // Check if this is a race condition (another request already set the account)
        if (updateError.code === 'PGRST116') {
          // No row was updated - another request beat us to it
          // Fetch the existing account instead
          const { data: existingCoach } = await supabase
            .from('coaches')
            .select('stripe_account_id')
            .eq('id', coach!.id)
            .single();

          if (existingCoach?.stripe_account_id) {
            console.log('Race condition detected - using existing Stripe account:', existingCoach.stripe_account_id);
            stripeAccountId = existingCoach.stripe_account_id;
            // Clean up the orphaned account we just created (fire-and-forget)
            stripe.accounts.del(account.id).catch(err =>
              console.warn('Failed to clean up orphaned Stripe account:', err)
            );
          } else {
            console.error('Failed to store Stripe account ID:', updateError);
            return new Response(
              JSON.stringify({ error: "Failed to store Stripe account" }),
              {
                status: 500,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
        } else {
          console.error('Failed to store Stripe account ID:', updateError);
          return new Response(
            JSON.stringify({ error: "Failed to store Stripe account" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      } else {
        console.log('Created and stored new Stripe account:', stripeAccountId);
      }
    }

    // Check if account setup is complete
    const retrievedAccount = await stripe.accounts.retrieve(stripeAccountId);
    
    if (retrievedAccount.charges_enabled) {
      // Account is already fully set up
      return new Response(
        JSON.stringify({ 
          accountId: stripeAccountId, 
          chargesEnabled: true,
          message: "Account is already connected and enabled"
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Create onboarding link
    const refreshUrl = new URL("/my-profile?onboard=refresh", baseUrl).toString();
    const returnUrl = new URL(
      `/my-profile?onboard=done&acct=${stripeAccountId}`,
      baseUrl,
    ).toString();

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    console.log("Stripe account link created:", {
      accountId: stripeAccountId,
      url: accountLink.url,
      coachId: coach!.id
    });

    // Return the account ID and onboarding URL
    return new Response(
      JSON.stringify({ 
        accountId: stripeAccountId, 
        url: accountLink.url,
        chargesEnabled: false
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );

  } catch (error: any) {
    console.error('❌ [Stripe Connect] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}