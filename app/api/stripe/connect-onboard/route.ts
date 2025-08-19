import Stripe from "stripe";
import { adminClient } from "@/supabase/client";

/**
 * Handles Stripe Connect Express onboarding requests.
 *
 * The route validates required environment variables, creates a connected
 * account, generates onboarding links, and returns the link and account ID.
 */
export async function POST() {
  // Log that the endpoint has received a request.
  console.log("Stripe Connect onboarding route started");

  // Retrieve and verify the Stripe secret key.
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

  // Retrieve and verify the application base URL used for redirects.
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    return new Response(JSON.stringify({ error: "Missing APP_URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Ensure APP_URL is a valid absolute URL before using it.
  let baseUrl: URL;
  try {
    baseUrl = new URL(appUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid APP_URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Initialize the Stripe SDK with the specified API version.
  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  // Create an Express connected account for the user.
  const account = await stripe.accounts.create({ type: "express" });

  // Persist the new account ID in Supabase if possible.
  try {
    await adminClient
      .from("stripe_accounts")
      .insert({ account_id: account.id });
  } catch (error) {
    console.error("Failed to store Stripe account", error);
  }

  // Build absolute URLs for refresh and return redirects.
  const refreshUrl = new URL("/dashboard?onboard=refresh", baseUrl).toString();
  const returnUrl = new URL(
    `/dashboard?onboard=done&acct=${account.id}`,
    baseUrl,
  ).toString();

  // Create an onboarding link directing the user to Stripe.
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  // Log completion details for debugging and traceability.
  console.log("Stripe account link creation finished", {
    accountId: account.id,
    url: accountLink.url,
  });

  // Return the account ID and onboarding URL to the client.
  return new Response(
    JSON.stringify({ accountId: account.id, url: accountLink.url }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
