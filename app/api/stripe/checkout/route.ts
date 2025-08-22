import { NextRequest } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.APP_URL) {
    return new Response(
      JSON.stringify({ error: "Missing STRIPE_SECRET_KEY or APP_URL" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: "2024-06-20",
  });

  // Parse body safely (this avoids the “Bad control character in JSON” crash)
  const raw = await req.text();
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body", raw }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const {
    bookingId = "test-booking-1",
    amount = 500,            // cents
    currency = "usd",
    coachStripeAccountId,
    listingId,
    coachId,
  } = body;

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amount,
          product_data: { name: "TeachTape Booking" },
        },
      },
    ],
    success_url: `${process.env.APP_URL}/dashboard?status=success&b=${encodeURIComponent(bookingId)}`,
    cancel_url: `${process.env.APP_URL}/dashboard?status=cancelled&b=${encodeURIComponent(bookingId)}`,
    metadata: {
      listing_id: listingId ?? "",
      coach_id: coachId ?? "",
    },
  };

  // Only include transfer (connected account) when we have a valid acct_ id
  if (coachStripeAccountId && /^acct_[A-Za-z0-9]+$/.test(coachStripeAccountId)) {
    params.payment_intent_data = {
      transfer_data: { destination: coachStripeAccountId },
      application_fee_amount: 0,
    };
  }

  try {
    const session = await stripe.checkout.sessions.create(params);
    return new Response(
      JSON.stringify({ id: session.id, url: session.url }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Stripe error:", err);
    return new Response(
      JSON.stringify({ error: err.message, type: err.type, raw: err.raw }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
