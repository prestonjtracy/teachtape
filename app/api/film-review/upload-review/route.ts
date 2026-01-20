import { NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendEmailResend } from "@/lib/email";
import { generateFilmReviewCompletedAthleteEmail, FilmReviewEmailData } from "@/lib/emailTemplates";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

// Validate supplemental document URL - allow common document sharing platforms
const isValidSupplementalUrl = (url: string): boolean => {
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

// Schema for structured review content
const ReviewContentSchema = z.object({
  overallAssessment: z.string().min(200, "Overall assessment must be at least 200 characters"),
  strengths: z.string().min(100, "Strengths must be at least 100 characters"),
  areasForImprovement: z.string().min(100, "Areas for improvement must be at least 100 characters"),
  recommendedDrills: z.string().min(100, "Recommended drills must be at least 100 characters"),
  keyTimestamps: z.string().nullable().optional(),
  supplementalDocUrl: z.string().url().nullable().optional(),
});

const UploadReviewSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID"),
  reviewContent: ReviewContentSchema,
});

export async function POST(req: NextRequest) {
  console.log(`🎬 [POST /api/film-review/upload-review] Request received`);

  try {
    const body = await req.json();
    const { bookingId, reviewContent } = UploadReviewSchema.parse(body);

    // Validate supplemental URL if provided
    if (reviewContent.supplementalDocUrl && !isValidSupplementalUrl(reviewContent.supplementalDocUrl)) {
      return new Response(
        JSON.stringify({
          error: "Supplemental document must be from Google Docs, Dropbox, Notion, Loom, YouTube, Vimeo, or be a PDF link"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = await createClient();

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
    const acceptedAt = new Date(booking.coach_accepted_at || booking.created_at);
    const deadline = new Date(acceptedAt.getTime() + turnaroundHours * 60 * 60 * 1000);
    const now = new Date();
    const isLate = now > deadline;

    if (isLate) {
      const hoursLate = Math.round((now.getTime() - deadline.getTime()) / (1000 * 60 * 60));
      console.warn(`⚠️ [POST /api/film-review/upload-review] Late submission: ${hoursLate} hours past deadline`);
    }

    console.log(`✅ [POST /api/film-review/upload-review] Uploading structured review:`, {
      bookingId,
      athleteEmail: booking.athlete_email || booking.customer_email,
      hasSupplementalDoc: !!reviewContent.supplementalDocUrl,
      hasTimestamps: !!reviewContent.keyTimestamps
    });

    // Update booking with structured review content
    // Use admin client to bypass RLS since we've already verified the coach owns this booking
    const adminSupabase = createAdminClient();
    const { data: updatedBooking, error: updateError } = await adminSupabase
      .from("bookings")
      .update({
        review_content: reviewContent,
        review_document_url: reviewContent.supplementalDocUrl || null, // Keep for backward compatibility
        review_status: "completed",
        review_completed_at: new Date().toISOString()
      })
      .eq("id", bookingId)
      .eq("coach_id", profile.id) // Extra safety check
      .select()
      .single();

    if (updateError) {
      console.error(`❌ [POST /api/film-review/upload-review] Failed to update booking:`, updateError);
      return new Response(
        JSON.stringify({ error: `Failed to upload review: ${updateError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!updatedBooking) {
      console.error(`❌ [POST /api/film-review/upload-review] No booking was updated - may already be completed or status mismatch`);
      return new Response(
        JSON.stringify({ error: "Failed to update booking - it may have already been completed" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ [POST /api/film-review/upload-review] Booking updated:`, {
      id: updatedBooking.id,
      review_status: updatedBooking.review_status,
      review_completed_at: updatedBooking.review_completed_at
    });

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
          reviewDocumentUrl: reviewContent.supplementalDocUrl || undefined,
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

    // Record payout event for tracking
    try {
      const { error: payoutError } = await adminSupabase.from('payout_events').insert({
        booking_id: bookingId,
        coach_id: profile.id,
        event_type: 'film_review_completed',
        amount_cents: booking.amount_paid_cents,
        status: 'pending'
      });

      if (payoutError) {
        // Log but don't fail - payout tracking is secondary to review completion
        console.warn(`⚠️ [POST /api/film-review/upload-review] Failed to record payout event:`, payoutError.message);
      } else {
        console.log(`✅ [POST /api/film-review/upload-review] Payout event recorded`);
      }
    } catch (payoutErr) {
      console.warn(`⚠️ [POST /api/film-review/upload-review] Payout event error:`, payoutErr);
    }

    console.log(`✅ [POST /api/film-review/upload-review] Successfully completed review for booking ${bookingId}`);

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
