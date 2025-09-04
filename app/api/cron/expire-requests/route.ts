import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmailResend } from "@/lib/email";
import { generateRequestExpiredAthleteEmail } from "@/lib/emailTemplates";

export async function POST(req: NextRequest) {
  console.log('🔄 [POST /api/cron/expire-requests] Starting request expiration job');
  
  try {
    // Verify cron secret for security (optional but recommended)
    const cronSecret = req.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
      console.error('❌ [POST /api/cron/expire-requests] Unauthorized cron request');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createClient();
    
    // Find requests that are pending and older than 72 hours
    const seventyTwoHoursAgo = new Date();
    seventyTwoHoursAgo.setHours(seventyTwoHoursAgo.getHours() - 72);

    console.log('🔍 [POST /api/cron/expire-requests] Looking for requests older than:', seventyTwoHoursAgo.toISOString());

    const { data: expiredRequests, error: findError } = await supabase
      .from('booking_requests')
      .select(`
        id,
        created_at,
        proposed_start,
        proposed_end,
        timezone,
        conversation_id,
        athlete:profiles!booking_requests_athlete_id_fkey(id, full_name, auth_user_id),
        coach:profiles!booking_requests_coach_id_fkey(id, full_name, auth_user_id),
        listing:listings!inner(id, title, price_cents)
      `)
      .eq('status', 'pending')
      .lt('created_at', seventyTwoHoursAgo.toISOString());

    if (findError) {
      console.error('❌ [POST /api/cron/expire-requests] Error finding expired requests:', findError);
      return NextResponse.json(
        { error: "Database query failed" },
        { status: 500 }
      );
    }

    if (!expiredRequests || expiredRequests.length === 0) {
      console.log('✅ [POST /api/cron/expire-requests] No expired requests found');
      return NextResponse.json({
        success: true,
        expired_count: 0,
        message: 'No requests to expire'
      });
    }

    console.log(`📋 [POST /api/cron/expire-requests] Found ${expiredRequests.length} requests to expire`);

    let successCount = 0;
    let errorCount = 0;

    // Process each expired request
    for (const request of expiredRequests) {
      try {
        console.log(`⏰ [POST /api/cron/expire-requests] Expiring request ${request.id}`);

        // Update request status to expired
        const { error: updateError } = await supabase
          .from('booking_requests')
          .update({ status: 'expired' })
          .eq('id', request.id);

        if (updateError) {
          console.error(`❌ [POST /api/cron/expire-requests] Failed to update request ${request.id}:`, updateError);
          errorCount++;
          continue;
        }

        // Send system message to conversation
        const systemMessage = "⏰ Request expired after 72 hours.";
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: request.conversation_id,
            sender_id: null, // System message
            body: systemMessage,
            kind: 'system'
          });

        if (messageError) {
          console.warn(`⚠️ [POST /api/cron/expire-requests] Failed to send system message for request ${request.id}:`, messageError);
        }

        // Send email notification to athlete
        try {
          const { data: athleteAuth } = await supabase.auth.admin.getUserById(request.athlete.auth_user_id);
          const { data: coachAuth } = await supabase.auth.admin.getUserById(request.coach.auth_user_id);
          
          const athleteEmail = athleteAuth.user?.email;
          const coachEmail = coachAuth.user?.email;

          if (athleteEmail && coachEmail) {
            const emailData = {
              requestId: request.id,
              athleteEmail: athleteEmail,
              athleteName: request.athlete.full_name || undefined,
              coachName: request.coach.full_name || 'Coach',
              coachEmail: coachEmail,
              listingTitle: request.listing.title,
              listingDescription: undefined,
              duration: undefined,
              priceCents: request.listing.price_cents,
              proposedStart: new Date(request.proposed_start),
              proposedEnd: new Date(request.proposed_end),
              timezone: request.timezone,
              requestedAt: new Date(request.created_at),
              chatUrl: `${process.env.APP_URL || 'https://teachtape.local'}/messages/${request.conversation_id}`
            };

            // Send expiration email
            const expiredEmail = generateRequestExpiredAthleteEmail(emailData);
            await sendEmailResend({
              to: athleteEmail,
              subject: expiredEmail.subject,
              html: expiredEmail.html,
              text: expiredEmail.text
            });
            console.log(`📧 [POST /api/cron/expire-requests] Email notification queued for request ${request.id}`);
          }
        } catch (emailError) {
          console.warn(`⚠️ [POST /api/cron/expire-requests] Failed to send email for request ${request.id}:`, emailError);
        }

        successCount++;
        
      } catch (requestError) {
        console.error(`❌ [POST /api/cron/expire-requests] Error processing request ${request.id}:`, requestError);
        errorCount++;
      }
    }

    const totalProcessed = successCount + errorCount;
    
    console.log(`✅ [POST /api/cron/expire-requests] Job completed: ${successCount} expired successfully, ${errorCount} failed`);

    return NextResponse.json({
      success: true,
      expired_count: successCount,
      error_count: errorCount,
      total_processed: totalProcessed,
      message: `Expired ${successCount} requests successfully${errorCount > 0 ? ` (${errorCount} errors)` : ''}`
    });

  } catch (error) {
    console.error('❌ [POST /api/cron/expire-requests] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}