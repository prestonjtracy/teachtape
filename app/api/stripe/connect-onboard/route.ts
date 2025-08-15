import { NextRequest } from "next/server";
import Stripe from "stripe";

export async function POST(_req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2024-06-20" as any,
  });

  // Create a connected account (Express) for MVP
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    business_type: "individual",
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.APP_URL}/dashboard?onboard=refresh`,
    return_url: `${process.env.APP_URL}/dashboard?onboard=done&acct=${account.id}`,
    type: "account_onboarding",
  });

  return new Response(JSON.stringify({ accountId: account.id, url: accountLink.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
