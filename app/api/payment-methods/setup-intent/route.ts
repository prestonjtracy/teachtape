import { NextRequest, NextResponse } from "next/server";
import { createClientForApiRoute } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
    const supabase = createClientForApiRoute(req);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('[setup-intent] Auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      error: userError?.message 
    });
    
    if (userError || !user) {
      console.error('[setup-intent] Authentication failed:', userError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Create a setup intent for saving payment method
    const setupIntent = await stripe.setupIntents.create({
      usage: 'off_session', // For future payments
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });

  } catch (error) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { error: "Failed to create setup intent" },
      { status: 500 }
    );
  }
}