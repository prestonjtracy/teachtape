import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

// GET or create a conversation for a booking
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    // SECURITY: Require authentication
    const { user, error: authError } = await requireAuth();
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: authError.status });
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get user's profile
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get the booking with listing info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        conversation_id,
        customer_email,
        listing_id,
        coach_id,
        listings:listing_id (
          coach_id
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const coachId = booking.coach_id || (booking.listings as any)?.[0]?.coach_id;

    // SECURITY: Verify user is the coach for this booking
    if (userProfile.id !== coachId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // If conversation already exists, return it
    if (booking.conversation_id) {
      return NextResponse.json({
        conversation_id: booking.conversation_id,
        created: false
      });
    }

    // Need to create a conversation
    // First, find or create the athlete profile based on customer_email
    let athleteProfileId: string | null = null;

    if (booking.customer_email) {
      // Try to find a profile with this email
      const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
      const athleteAuthUser = authUsers?.users?.find(u => u.email === booking.customer_email);

      if (athleteAuthUser) {
        const { data: athleteProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", athleteAuthUser.id)
          .single();

        if (athleteProfile) {
          athleteProfileId = athleteProfile.id;
        }
      }
    }

    if (!athleteProfileId) {
      // Can't create conversation without an athlete profile
      return NextResponse.json({
        error: "Cannot create conversation - athlete profile not found",
        message: "The customer hasn't created an account yet"
      }, { status: 400 });
    }

    // Create the conversation
    const { data: newConversation, error: convError } = await adminSupabase
      .from("conversations")
      .insert({})
      .select("id")
      .single();

    if (convError || !newConversation) {
      console.error("Failed to create conversation:", convError);
      return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
    }

    // Add participants
    const { error: participantsError } = await adminSupabase
      .from("conversation_participants")
      .insert([
        {
          conversation_id: newConversation.id,
          user_id: coachId,
          role: "coach"
        },
        {
          conversation_id: newConversation.id,
          user_id: athleteProfileId,
          role: "athlete"
        }
      ]);

    if (participantsError) {
      console.error("Failed to add participants:", participantsError);
      return NextResponse.json({ error: "Failed to create conversation participants" }, { status: 500 });
    }

    // Update the booking with the conversation_id
    const { error: updateError } = await adminSupabase
      .from("bookings")
      .update({ conversation_id: newConversation.id })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
      // Don't fail - conversation was created
    }

    // Send a system message
    await adminSupabase
      .from("messages")
      .insert({
        conversation_id: newConversation.id,
        sender_id: null,
        body: "🎉 Session booked! You can now chat to coordinate details.",
        kind: "system"
      });

    return NextResponse.json({
      conversation_id: newConversation.id,
      created: true
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
