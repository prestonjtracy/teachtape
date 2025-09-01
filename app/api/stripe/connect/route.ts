import Stripe from "stripe";
import { createServerClient } from "@/supabase/server";

/**
 * Handles Stripe Connect Express onboarding for coaches.
 * 
 * Creates a Stripe Express account, stores it in the coaches table,
 * and returns an onboarding link.
 */
export async function POST() {
  console.log("Stripe Connect coach onboarding route started");

  try {
    // Verify required environment variables
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    let baseUrl: URL;
    try {
      baseUrl = new URL(appUrl);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid APP_URL" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase and get current user
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
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
        country: 'US' // You might want to make this configurable
      });
      
      stripeAccountId = account.id;

      // Store the account ID in the coaches table
      const { error: updateError } = await supabase
        .from('coaches')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', coach!.id);

      if (updateError) {
        console.error('Failed to store Stripe account ID:', updateError);
        return new Response(
          JSON.stringify({ error: "Failed to store Stripe account" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      console.log('Created and stored new Stripe account:', stripeAccountId);
    }

    // Check if account setup is complete
    const account = await stripe.accounts.retrieve(stripeAccountId);
    
    if (account.charges_enabled) {
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
    console.error('Stripe Connect error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}