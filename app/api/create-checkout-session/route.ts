import { NextRequest } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { listing_id, coach_id } = await req.json();

    if (!listing_id || !coach_id) {
      return new Response(
        JSON.stringify({ error: "Missing listing_id or coach_id" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    });

    // Check if we have a PRICE_ID, otherwise use price_data
    const priceId = process.env.STRIPE_PRICE_ID;
    
    let sessionParams: Stripe.Checkout.SessionCreateParams;
    
    if (priceId) {
      sessionParams = {
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/cancel`,
        metadata: {
          listing_id,
          coach_id,
        },
      };
    } else {
      // Use price_data if no PRICE_ID is available
      sessionParams = {
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Coaching Session",
                description: "1-on-1 coaching session",
              },
              unit_amount: 100, // $1.00 in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/cancel`,
        metadata: {
          listing_id,
          coach_id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create checkout session" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
