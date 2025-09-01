#!/usr/bin/env tsx

import { sendBookingEmails, BookingEmailData } from "../lib/email";
import { getFeeBreakdown } from "../lib/stripeFees";

// Test webhook email functionality
async function testWebhookEmails() {
  console.log("🧪 Testing webhook email functionality...\n");
  
  // Sample booking data that would come from webhook
  const emailData: BookingEmailData = {
    sessionId: "cs_test_webhook_123",
    bookingId: "booking_webhook_456",
    
    athleteEmail: "test.athlete@example.com",
    athleteName: "Test Athlete",
    
    coachName: "Test Coach",
    coachEmail: "test.coach@example.com",
    
    listingTitle: "Basketball Skills Development",
    listingDescription: "Individual training focused on shooting, dribbling, and defensive fundamentals.",
    duration: 90,
    
    amountPaid: 12000, // $120.00 in cents
    currency: "usd",
    platformFee: getFeeBreakdown(12000).platformFee,
    
    bookedAt: new Date(),
    
    nextSteps: "The coach will contact you within 24 hours to schedule your session."
  };
  
  console.log("📋 Test Email Data:", {
    athleteEmail: emailData.athleteEmail,
    coachEmail: emailData.coachEmail,
    amountPaid: `$${(emailData.amountPaid / 100).toFixed(2)}`,
    platformFee: `$${(emailData.platformFee! / 100).toFixed(2)}`,
    sessionId: emailData.sessionId
  });
  console.log();
  
  // Check if RESEND_API_KEY is available
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log("⚠️  RESEND_API_KEY not found in environment");
    console.log("📧 Email sending will fail, but testing template generation...\n");
  } else {
    console.log("✅ RESEND_API_KEY found - testing actual email sending\n");
  }
  
  try {
    // This will test the complete email sending flow
    await sendBookingEmails(emailData);
    console.log("✅ Email sending test completed successfully!");
  } catch (error) {
    console.log("❌ Email sending test failed:", error instanceof Error ? error.message : error);
    console.log("📝 This is expected if RESEND_API_KEY is not configured");
  }
}

if (require.main === module) {
  testWebhookEmails().catch(console.error);
}