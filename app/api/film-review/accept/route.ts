import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendEmailResend } from "@/lib/email";
import { generateFilmReviewAcceptedAthleteEmail, FilmReviewEmailData } from "@/lib/emailTemplates";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

const AcceptSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID")
});

export async function POST(req: NextRequest) {
  console.log(`🎬 [POST /api/film-review/accept] Request received`);

  try {
    const body = await req.json();
    const { bookingId } = AcceptSchema.parse(body);

    const supabase = createClient();

    // Verify the current user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error(`❌ [POST /api/film-review/accept] Authentication failed`);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'coach') {
      console.error(`❌ [POST /api/film-review/accept] Not a coach`);
      return new Response(
        JSON.stringify({ error: "Only coaches can accept film review requests" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the booking with listing details
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        listing:listings(title, turnaround_hours)
      `)
      .eq("id", bookingId)
      .eq("coach_id", profile.id)
      .eq("review_status", "pending_acceptance")
      .single();

    if (fetchError || !booking) {
      console.error(`❌ [POST /api/film-review/accept] Booking not found or unauthorized:`, fetchError);
      return new Response(
        JSON.stringify({ error: "Booking not found or already processed" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get turnaround hours from the listing
    const turnaroundHours = booking.listing?.turnaround_hours || 48;

    // Calculate deadline
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + turnaroundHours);

    console.log(`✅ [POST /api/film-review/accept] Accepting booking:`, {
      bookingId,
      turnaroundHours,
      deadline: deadline.toISOString()
    });

    // Update booking status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        review_status: "accepted",
        coach_accepted_at: new Date().toISOString(),
        deadline_at: deadline.toISOString()
      })
      .eq("id", bookingId)
      .eq("review_status", "pending_acceptance");

    if (updateError) {
      console.error(`❌ [POST /api/film-review/accept] Failed to update booking:`, updateError);
      return new Response(
        JSON.stringify({ error: "Failed to accept booking" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Send email notification to athlete
    try {
      const athleteEmail = booking.athlete_email || booking.customer_email;
      if (athleteEmail) {
        const appUrl = process.env.APP_URL || 'https://teachtapesports.com';

        const emailData: FilmReviewEmailData = {
          bookingId: booking.id,
          athleteEmail: athleteEmail,
          athleteName: booking.athlete_name || undefined,
          coachName: profile.full_name || 'Coach',
          listingTitle: booking.listing?.title || 'Film Review',
          turnaroundHours: turnaroundHours,
          priceCents: booking.amount_paid_cents,
          deadline: deadline,
          appUrl: appUrl
        };

        const emailContent = generateFilmReviewAcceptedAthleteEmail(emailData);

        await sendEmailResend({
          to: athleteEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });

        console.log(`✅ [POST /api/film-review/accept] Email sent to athlete: ${athleteEmail}`);
      }
    } catch (emailError) {
      // Log but don't fail the request - the acceptance was successful
      console.error(`⚠️ [POST /api/film-review/accept] Failed to send email:`, emailError);
    }

    console.log(`✅ [POST /api/film-review/accept] Successfully accepted booking ${bookingId}`);

    return new Response(
      JSON.stringify({
        success: true,
        deadline: deadline.toISOString(),
        turnaroundHours
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ [POST /api/film-review/accept] Validation error:`, error.errors);
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: error.errors.map(e => e.message)
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error(`❌ [POST /api/film-review/accept] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
