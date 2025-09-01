#!/usr/bin/env tsx

import { BookingEmailData, generateAthleteReceiptEmail, generateCoachNotificationEmail } from "../lib/emailTemplates";
import { getFeeBreakdown } from "../lib/stripeFees";

// Sample booking data for testing
const testBookingData: BookingEmailData = {
  sessionId: "cs_test_1234567890",
  bookingId: "booking_test_123",
  
  athleteEmail: "athlete@test.com",
  athleteName: "John Athlete",
  
  coachName: "Sarah Coach",
  coachEmail: "coach@test.com",
  
  listingTitle: "Tennis Fundamentals - 1-on-1 Coaching",
  listingDescription: "Improve your tennis fundamentals with personalized coaching focused on technique, strategy, and mental game.",
  duration: 60,
  
  amountPaid: 7500, // $75.00 in cents
  currency: "usd",
  platformFee: 780, // From fee calculation
  
  bookedAt: new Date(),
  
  nextSteps: "The coach will contact you within 24 hours to schedule your session."
};

function testEmailTemplates() {
  console.log("🧪 Testing email template generation...\n");
  
  // Test fee breakdown calculation
  const feeBreakdown = getFeeBreakdown(testBookingData.amountPaid);
  console.log("💰 Fee Breakdown:", feeBreakdown);
  console.log();
  
  // Generate athlete receipt email
  const athleteEmail = generateAthleteReceiptEmail(testBookingData);
  console.log("📧 Athlete Email Generated:");
  console.log("Subject:", athleteEmail.subject);
  console.log("HTML Length:", athleteEmail.html.length, "characters");
  console.log("Text Length:", athleteEmail.text.length, "characters");
  console.log();
  
  // Generate coach notification email
  const coachEmail = generateCoachNotificationEmail(testBookingData);
  console.log("📧 Coach Email Generated:");
  console.log("Subject:", coachEmail.subject);
  console.log("HTML Length:", coachEmail.html.length, "characters");
  console.log("Text Length:", coachEmail.text.length, "characters");
  console.log();
  
  // Preview email content (first 200 chars of text versions)
  console.log("👀 Athlete Email Preview:");
  console.log(athleteEmail.text.substring(0, 200) + "...\n");
  
  console.log("👀 Coach Email Preview:");
  console.log(coachEmail.text.substring(0, 200) + "...\n");
  
  console.log("✅ Email template generation test completed successfully!");
}

if (require.main === module) {
  testEmailTemplates();
}