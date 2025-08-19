import { NextRequest } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") as string;

  if (!secret) return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // TODO: handle events (checkout.session.completed, account.updated, payment_intent.succeeded, etc)
  switch (event.type) {
    case "checkout.session.completed":
      // TODO: mark booking paid, schedule Zoom, send emails
      break;
    case "account.updated":
      // TODO: track Connect onboarding state
      break;
    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
export const dynamic = "force-dynamic";
