import { NextRequest } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/supabase/server";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error("Missing Stripe environment variables");
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const listingId = session.metadata?.listing_id;
    const coachId = session.metadata?.coach_id;
    const customerEmail =
      session.customer_details?.email || session.customer_email || null;
    const amountPaid = session.amount_total ?? 0;

    if (listingId && coachId) {
      const supabase = createServerClient();
      const { error } = await supabase.from("bookings").insert({
        listing_id: listingId,
        coach_id: coachId,
        customer_email: customerEmail,
        amount_paid_cents: amountPaid,
        status: "paid",
        stripe_session_id: session.id,
      });

      if (error) {
        console.error("Error inserting booking", error);
        return new Response("Database insert failed", { status: 500 });
      }
    } else {
      console.warn("Missing listing_id or coach_id in session metadata", session.id);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
export const dynamic = "force-dynamic";
