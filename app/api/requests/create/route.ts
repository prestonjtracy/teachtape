import { NextRequest, NextResponse } from "next/server";
import { createClientForApiRoute, createAdminClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { z } from "zod";
import { sendBookingRequestEmails } from "@/lib/email";
import { applyRateLimit } from "@/lib/rateLimitHelpers";

export const dynamic = 'force-dynamic';

const CreateBookingRequestSchema = z.object({
  listing_id: z.string().uuid("Invalid listing ID"),
  coach_id: z.string().uuid("Invalid coach ID"),
  proposed_start: z.string().datetime("Invalid start time"),
  proposed_end: z.string().datetime("Invalid end time"),
  timezone: z.string().min(1, "Timezone is required"),
  setup_intent_id: z.string().optional(),
  payment_method_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  console.log('🔍 [POST /api/requests/create] Request received');

  // Apply rate limiting (30 requests per minute)
  const rateLimitResponse = applyRateLimit(req, 'MODERATE');
  if (rateLimitResponse) return rateLimitResponse;
  
  try {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.error('❌ [POST /api/requests/create] Missing STRIPE_SECRET_KEY');
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });
    const body = await req.json();
    
    // Validate input
    const validatedData = CreateBookingRequestSchema.parse(body);
    console.log('✅ [POST /api/requests/create] Input validated:', {
      listing_id: validatedData.listing_id,
      coach_id: validatedData.coach_id,
      proposed_start: validatedData.proposed_start,
      timezone: validatedData.timezone
    });

    const supabase = createClientForApiRoute(req);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ [POST /api/requests/create] User not authenticated:', userError);
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ [POST /api/requests/create] Profile not found:', profileError);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Verify user is an athlete
    if (profile.role !== 'athlete') {
      console.error('❌ [POST /api/requests/create] User is not an athlete:', profile.role);
      return NextResponse.json(
        { error: "Only athletes can create booking requests" },
        { status: 403 }
      );
    }

    // Fetch and validate the listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*')
      .eq('id', validatedData.listing_id)
      .eq('is_active', true)
      .single();

    if (listingError || !listing) {
      console.error('❌ [POST /api/requests/create] Listing not found:', listingError);
      return NextResponse.json(
        { error: "Listing not found or inactive" },
        { status: 404 }
      );
    }

    // Verify the coach_id matches the listing's coach
    if (listing.coach_id !== validatedData.coach_id) {
      console.error('❌ [POST /api/requests/create] Coach ID mismatch');
      return NextResponse.json(
        { error: "Coach ID does not match listing" },
        { status: 400 }
      );
    }

    // Create or find existing conversation between athlete and coach
    let conversationId: string | null = null;
    
    try {
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(*)
        `)
        .eq('user_id', profile.id)
        .eq('role', 'athlete');

      if (existingConversation && existingConversation.length > 0) {
        // Find conversation with this specific coach
        for (const participant of existingConversation) {
          const { data: coachParticipant } = await supabase
            .from('conversation_participants')
            .select('*')
            .eq('conversation_id', participant.conversation_id)
            .eq('user_id', validatedData.coach_id)
            .eq('role', 'coach')
            .single();

          if (coachParticipant) {
            conversationId = participant.conversation_id;
            break;
          }
        }
      }

      // If no existing conversation, create a new one
      if (!conversationId) {
        console.log('🆕 [POST /api/requests/create] Creating new conversation');
        
        const { data: newConversation, error: conversationError } = await supabase
          .from('conversations')
          .insert({})
          .select('id')
          .single();

        if (conversationError || !newConversation) {
          throw new Error(`Failed to create conversation: ${conversationError?.message}`);
        }

        conversationId = newConversation.id;

        // Add participants
        const { error: participantsError } = await supabase
          .from('conversation_participants')
          .insert([
            {
              conversation_id: conversationId,
              user_id: profile.id,
              role: 'athlete'
            },
            {
              conversation_id: conversationId,
              user_id: validatedData.coach_id,
              role: 'coach'
            }
          ]);

        if (participantsError) {
          throw new Error(`Failed to add participants: ${participantsError.message}`);
        }
      }

      console.log('✅ [POST /api/requests/create] Conversation ready:', conversationId);

    } catch (error) {
      console.error('❌ [POST /api/requests/create] Conversation creation error:', error);
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    // Create the booking request
    const { data: bookingRequest, error: requestError } = await supabase
      .from('booking_requests')
      .insert({
        listing_id: validatedData.listing_id,
        coach_id: validatedData.coach_id,
        athlete_id: profile.id,
        proposed_start: validatedData.proposed_start,
        proposed_end: validatedData.proposed_end,
        timezone: validatedData.timezone,
        conversation_id: conversationId,
        setup_intent_id: validatedData.setup_intent_id,
        payment_method_id: validatedData.payment_method_id,
        status: 'pending'
      })
      .select('id')
      .single();

    if (requestError || !bookingRequest) {
      console.error('❌ [POST /api/requests/create] Failed to create booking request:', requestError);
      return NextResponse.json(
        { error: "Failed to create booking request" },
        { status: 500 }
      );
    }

    // Send initial system message to conversation
    const proposedStart = new Date(validatedData.proposed_start);
    const proposedEnd = new Date(validatedData.proposed_end);
    
    // Format the time nicely
    const startTime = proposedStart.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const endTime = proposedEnd.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const dateStr = proposedStart.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const systemMessage = `🗓️ Booking request: ${dateStr}, ${startTime}–${endTime} (${validatedData.timezone})`;

    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: null, // System message
        body: systemMessage,
        kind: 'system'
      });

    if (messageError) {
      console.warn('⚠️ [POST /api/requests/create] Failed to send initial message:', messageError);
      // Don't fail the request if message creation fails
    }

    // Check if we need to create a SetupIntent for payment method collection
    let setupIntentClientSecret: string | null = null;
    
    // Only create SetupIntent if no payment method was provided
    if (!validatedData.payment_method_id && !validatedData.setup_intent_id) {
      console.log('🔧 [POST /api/requests/create] Creating SetupIntent for payment method collection');
      
      try {
        const setupIntent = await stripe.setupIntents.create({
          usage: 'off_session', // For future payments
          metadata: {
            booking_request_id: bookingRequest.id,
            athlete_id: profile.id,
            coach_id: validatedData.coach_id,
            listing_id: validatedData.listing_id,
          },
          description: `Payment setup for ${listing.title}`,
        });

        setupIntentClientSecret = setupIntent.client_secret;
        
        // Update the booking request with the setup intent ID
        await supabase
          .from('booking_requests')
          .update({ setup_intent_id: setupIntent.id })
          .eq('id', bookingRequest.id);

        console.log('✅ [POST /api/requests/create] SetupIntent created:', setupIntent.id);
      } catch (setupError) {
        console.error('❌ [POST /api/requests/create] SetupIntent creation failed:', setupError);
        // Don't fail the entire request - the payment can be handled later
      }
    }

    console.log('✅ [POST /api/requests/create] Booking request created successfully:', bookingRequest.id);

    // Send email notification to coach (fire-and-forget)
    try {
      console.log('📧 [POST /api/requests/create] Starting email notification process');

      const { data: coachProfile, error: coachProfileError } = await supabase
        .from('profiles')
        .select('full_name, auth_user_id')
        .eq('id', validatedData.coach_id)
        .single();

      if (coachProfileError) {
        console.error('❌ [POST /api/requests/create] Failed to fetch coach profile:', coachProfileError);
      }
      if (!coachProfile) {
        console.error('❌ [POST /api/requests/create] Coach profile is null');
      }

      const { data: athleteProfile, error: athleteProfileError } = await supabase
        .from('profiles')
        .select('full_name, auth_user_id')
        .eq('id', profile.id)
        .single();

      if (athleteProfileError) {
        console.error('❌ [POST /api/requests/create] Failed to fetch athlete profile:', athleteProfileError);
      }
      if (!athleteProfile) {
        console.error('❌ [POST /api/requests/create] Athlete profile is null');
      }

      if (coachProfile && athleteProfile) {
        console.log('✅ [POST /api/requests/create] Profiles loaded, fetching auth emails');

        // Get coach email from auth - need admin client for auth.admin API
        const adminClient = createAdminClient();
        const { data: coachAuth, error: coachAuthError } = await adminClient.auth.admin.getUserById(coachProfile.auth_user_id);

        if (coachAuthError) {
          console.error('❌ [POST /api/requests/create] Failed to fetch coach auth user:', coachAuthError);
        }

        const coachEmail = coachAuth?.user?.email;
        console.log('📧 [POST /api/requests/create] Coach email:', coachEmail ? 'found' : 'NOT FOUND');

        const { data: athleteAuth, error: athleteAuthError } = await adminClient.auth.admin.getUserById(athleteProfile.auth_user_id);

        if (athleteAuthError) {
          console.error('❌ [POST /api/requests/create] Failed to fetch athlete auth user:', athleteAuthError);
        }

        const athleteEmail = athleteAuth?.user?.email;
        console.log('📧 [POST /api/requests/create] Athlete email:', athleteEmail ? 'found' : 'NOT FOUND');

        if (coachEmail && athleteEmail) {
          const emailData = {
            requestId: bookingRequest.id,
            athleteEmail: athleteEmail,
            athleteName: athleteProfile.full_name || undefined,
            coachName: coachProfile.full_name || 'Coach',
            coachEmail: coachEmail,
            listingTitle: listing.title,
            listingDescription: listing.description || undefined,
            duration: listing.duration_minutes || undefined,
            priceCents: listing.price_cents,
            proposedStart: new Date(validatedData.proposed_start),
            proposedEnd: new Date(validatedData.proposed_end),
            timezone: validatedData.timezone,
            requestedAt: new Date(),
            chatUrl: `${process.env.APP_URL || 'https://teachtape.local'}/messages/${conversationId}`
          };

          console.log('📧 [POST /api/requests/create] Sending email to coach:', coachEmail);
          await sendBookingRequestEmails(emailData, 'new_request');
          console.log('✅ [POST /api/requests/create] Email notification sent to coach');
        } else {
          console.error('❌ [POST /api/requests/create] Missing email addresses - coach:', !!coachEmail, 'athlete:', !!athleteEmail);
        }
      } else {
        console.error('❌ [POST /api/requests/create] Missing profiles - coach:', !!coachProfile, 'athlete:', !!athleteProfile);
      }
    } catch (emailError) {
      console.error('❌ [POST /api/requests/create] Failed to send email notification:', emailError);
    }

    return NextResponse.json({
      success: true,
      booking_request_id: bookingRequest.id,
      conversation_id: conversationId,
      client_secret: setupIntentClientSecret, // Will be null if payment method already exists
      needs_payment_method: setupIntentClientSecret !== null,
      message: 'Booking request created successfully'
    }, { 
      status: 200
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ [POST /api/requests/create] Validation error:', error.errors);
      return NextResponse.json(
        { 
          error: "Invalid request data",
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('❌ [POST /api/requests/create] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}