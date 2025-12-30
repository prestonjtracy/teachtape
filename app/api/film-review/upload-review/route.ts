import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendEmailResend } from "@/lib/email";
import { generateFilmReviewCompletedAthleteEmail, FilmReviewEmailData } from "@/lib/emailTemplates";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

// Validate review document URL - allow common document sharing platforms
const isValidReviewUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const allowedHosts = [
      'docs.google.com', 'drive.google.com',
      'dropbox.com', 'www.dropbox.com', 'dl.dropboxusercontent.com',
      'notion.so', 'www.notion.so',
      'loom.com', 'www.loom.com',
      'youtube.com', 'www.youtube.com', 'youtu.be', // For video reviews
      'vimeo.com', 'www.vimeo.com'
    ];

    // Also allow any HTTPS PDF links
    if (urlObj.pathname.endsWith('.pdf') && urlObj.protocol === 'https:') {
      return true;
    }

    return allowedHosts.some(host => urlObj.hostname === host || urlObj.hostname.endsWith('.' + host));
  } catch {
    return false;
  }
};

const UploadReviewSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  reviewDocumentUrl: z.string().url("Invalid URL").refine(isValidReviewUrl, {
    message: "Review document must be from Google Docs, Dropbox, Notion, Loom, or be a PDF link"
  })
});

export async function POST(req: NextRequest) {
  console.log(`🎬 [POST /api/film-review/upload-review] Request received`);

  try {
    const body = await req.json();
    const { bookingId, reviewDocumentUrl } = UploadReviewSchema.parse(body);

    const supabase = createClient();

    // Verify the current user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error(`❌ [POST /api/film-review/upload-review] Authentication failed`);
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
      console.error(`❌ [POST /api/film-review/upload-review] Not a coach`);
      return new Response(
        JSON.stringify({ error: "Only coaches can upload film reviews" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch the booking
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select(`
        *,
        listing:listings(title, turnaround_hours)
      `)
      .eq("id", bookingId)
      .eq("coach_id", profile.id)
      .eq("review_status", "accepted")
      .single();

    if (fetchError || !booking) {
      console.error(`❌ [POST /api/film-review/upload-review] Booking not found:`, fetchError);
      return new Response(
        JSON.stringify({ error: "Booking not found or not in accepted status" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if the review is being uploaded past the deadline
    const turnaroundHours = booking.listing?.turnaround_hours || 48;
    const acceptedAt = new Date(booking.review_accepted_at || booking.created_at);
    const deadline = new Date(acceptedAt.getTime() + turnaroundHours * 60 * 60 * 1000);
    const now = new Date();
    const isLate = now > deadline;

    if (isLate) {
      const hoursLate = Math.round((now.getTime() - deadline.getTime()) / (1000 * 60 * 60));
      console.warn(`⚠️ [POST /api/film-review/upload-review] Late submission: ${hoursLate} hours past deadline`);
      // Allow submission but flag it - could be used for future refund policies
      // For now, just log it. Business decision needed on whether to block late submissions.
    }

    console.log(`✅ [POST /api/film-review/upload-review] Uploading review:`, {
      bookingId,
      reviewDocumentUrl: '[HIDDEN]',
      athleteEmail: booking.athlete_email || booking.customer_email
    });

    // Update booking with review document
    const updateData: Record<string, any> = {
      review_document_url: reviewDocumentUrl,
      review_status: "completed",
      review_completed_at: new Date().toISOString()
    };

    // Track if submission was late for potential refund policies
    if (isLate) {
      updateData.review_submitted_late = true;
      updateData.review_hours_late = Math.round((now.getTime() - deadline.getTime()) / (1000 * 60 * 60));
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId)
      .eq("review_status", "accepted");

    if (updateError) {
      console.error(`❌ [POST /api/film-review/upload-review] Failed to update booking:`, updateError);
      return new Response(
        JSON.stringify({ error: "Failed to upload review" }),
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
          turnaroundHours: booking.listing?.turnaround_hours || 48,
          priceCents: booking.amount_paid_cents,
          reviewDocumentUrl: reviewDocumentUrl,
          appUrl: appUrl
        };

        const emailContent = generateFilmReviewCompletedAthleteEmail(emailData);

        await sendEmailResend({
          to: athleteEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });

        console.log(`✅ [POST /api/film-review/upload-review] Completion email sent to athlete: ${athleteEmail}`);
      }
    } catch (emailError) {
      // Log but don't fail the request
      console.error(`⚠️ [POST /api/film-review/upload-review] Failed to send email:`, emailError);
    }

    console.log(`✅ [POST /api/film-review/upload-review] Successfully completed review for booking ${bookingId}`);

    // Record the payout event for tracking
    // Note: Actual payment was already captured at checkout via Stripe Connect
    // This records when the review was completed so we can track coach fulfillment
    try {
      await supabase.from('payout_events').insert({
        booking_id: bookingId,
        coach_id: profile.id,
        event_type: 'film_review_completed',
        amount_cents: booking.amount_paid_cents,
        status: 'pending_payout', // Stripe handles actual payout on their schedule
        metadata: {
          review_completed_at: new Date().toISOString(),
          was_late: isLate,
          hours_late: isLate ? Math.round((now.getTime() - deadline.getTime()) / (1000 * 60 * 60)) : 0
        }
      });
      console.log(`✅ [POST /api/film-review/upload-review] Payout event recorded for booking ${bookingId}`);
    } catch (payoutError) {
      // Log but don't fail - the review is still complete
      console.warn(`⚠️ [POST /api/film-review/upload-review] Failed to record payout event:`, payoutError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Review uploaded successfully. Payment will be released to your account.",
        completedAt: new Date().toISOString()
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ [POST /api/film-review/upload-review] Validation error:`, error.errors);
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: error.errors.map(e => e.message)
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error(`❌ [POST /api/film-review/upload-review] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
