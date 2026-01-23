import nodemailer from "nodemailer";
import { Resend } from "resend";
import {
  BookingEmailData,
  BookingRequestEmailData,
  generateAthleteReceiptEmail,
  generateCoachNotificationEmail,
  generateNewRequestCoachEmail,
  generateRequestAcceptedAthleteEmail,
  generateRequestAcceptedCoachEmail,
  generateRequestDeclinedAthleteEmail
} from "./emailTemplates";

// Using verified domain teachtapesports.com
const from = "TeachTape <no-reply@teachtapesports.com>";

export async function sendEmailSMTP(to: string, subject: string, html: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP credentials missing");
  const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
  await transporter.sendMail({ from, to, subject, html });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  bcc?: string;
}

export async function sendEmailResend(options: SendEmailOptions | string, subject?: string, html?: string) {
  try {
    const key = process.env.RESEND_API_KEY;
    console.log('📧 [sendEmailResend] RESEND_API_KEY:', key ? 'FOUND' : 'MISSING');

    if (!key) {
      console.error('❌ [sendEmailResend] RESEND_API_KEY is missing from environment variables');
      throw new Error("RESEND_API_KEY missing");
    }

    const resend = new Resend(key);

    // Handle legacy string parameters for backward compatibility
    if (typeof options === 'string') {
      console.log('📧 [sendEmailResend] Sending email (legacy mode):', {
        from,
        to: options,
        subject: subject
      });

      const result = await resend.emails.send({
        from,
        to: options,
        subject: subject!,
        html: html!
      });

      console.log('✅ [sendEmailResend] Email sent successfully (legacy mode):', result);
      return;
    }

    // New options-based API
    const emailData: any = {
      from,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    if (options.text) {
      emailData.text = options.text;
    }

    if (options.bcc) {
      emailData.bcc = options.bcc;
    }

    console.log('📧 [sendEmailResend] Attempting to send email:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      hasBcc: !!emailData.bcc
    });

    const result = await resend.emails.send(emailData);

    console.log('✅ [sendEmailResend] Email sent successfully:', result);

  } catch (error) {
    console.error('❌ [sendEmailResend] Failed to send email:', {
      error: error instanceof Error ? error.message : error,
      errorObject: error,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

/**
 * Send booking confirmation emails to both athlete and coach
 * This is designed to be called fire-and-forget style from webhooks
 */
export async function sendBookingEmails(data: BookingEmailData): Promise<void> {
  try {
    // Generate email templates
    const athleteEmail = generateAthleteReceiptEmail(data);
    const coachEmail = generateCoachNotificationEmail(data);
    
    console.log(`📧 [sendBookingEmails] Sending booking emails:`, {
      athleteEmail: data.athleteEmail,
      coachEmail: data.coachEmail,
      sessionId: data.sessionId
    });

    // Send athlete receipt email (primary)
    await sendEmailResend({
      to: data.athleteEmail,
      subject: athleteEmail.subject,
      html: athleteEmail.html,
      text: athleteEmail.text,
      bcc: data.coachEmail // BCC the coach on athlete receipt
    });

    console.log(`✅ [sendBookingEmails] Athlete receipt sent to ${data.athleteEmail}${data.coachEmail ? ` (BCC: ${data.coachEmail})` : ''}`);

    // Also send a separate coach notification email if coach email is available
    if (data.coachEmail) {
      await sendEmailResend({
        to: data.coachEmail,
        subject: coachEmail.subject,
        html: coachEmail.html,
        text: coachEmail.text
      });
      
      console.log(`✅ [sendBookingEmails] Coach notification sent to ${data.coachEmail}`);
    }

  } catch (error) {
    // Log error but don't throw - this is fire-and-forget
    console.error(`❌ [sendBookingEmails] Failed to send booking emails:`, {
      error: error instanceof Error ? error.message : error,
      sessionId: data.sessionId,
      athleteEmail: data.athleteEmail,
      coachEmail: data.coachEmail
    });
  }
}

/**
 * Fire-and-forget email sending for webhooks
 * Sends emails asynchronously without blocking the response
 */
export function sendBookingEmailsAsync(data: BookingEmailData): void {
  // Send emails in the background without awaiting
  setImmediate(async () => {
    await sendBookingEmails(data);
  });
}

/**
 * Send booking request emails
 */
export async function sendBookingRequestEmails(data: BookingRequestEmailData, type: 'new_request' | 'accepted' | 'declined'): Promise<void> {
  try {
    console.log(`📧 [sendBookingRequestEmails] Sending ${type} emails:`, {
      athleteEmail: data.athleteEmail,
      coachEmail: data.coachEmail,
      requestId: data.requestId
    });

    let athleteEmailContent: { subject: string; html: string; text: string } | null = null;
    let coachEmailContent: { subject: string; html: string; text: string } | null = null;

    switch (type) {
      case 'new_request':
        coachEmailContent = generateNewRequestCoachEmail(data);
        break;
      case 'accepted':
        athleteEmailContent = generateRequestAcceptedAthleteEmail(data);
        coachEmailContent = generateRequestAcceptedCoachEmail(data);
        break;
      case 'declined':
        athleteEmailContent = generateRequestDeclinedAthleteEmail(data);
        break;
    }

    // Send athlete email if needed
    if (athleteEmailContent) {
      await sendEmailResend({
        to: data.athleteEmail,
        subject: athleteEmailContent.subject,
        html: athleteEmailContent.html,
        text: athleteEmailContent.text
      });
      console.log(`✅ [sendBookingRequestEmails] ${type} email sent to athlete: ${data.athleteEmail}`);
    }

    // Send coach email if needed
    if (coachEmailContent) {
      await sendEmailResend({
        to: data.coachEmail,
        subject: coachEmailContent.subject,
        html: coachEmailContent.html,
        text: coachEmailContent.text
      });
      console.log(`✅ [sendBookingRequestEmails] ${type} email sent to coach: ${data.coachEmail}`);
    }

  } catch (error) {
    // Log error but don't throw - this is fire-and-forget
    console.error(`❌ [sendBookingRequestEmails] Failed to send ${type} emails:`, {
      error: error instanceof Error ? error.message : error,
      requestId: data.requestId,
      athleteEmail: data.athleteEmail,
      coachEmail: data.coachEmail
    });
  }
}

/**
 * Fire-and-forget email sending for booking requests
 * Updated to work better in Vercel serverless environment
 */
export function sendBookingRequestEmailsAsync(data: BookingRequestEmailData, type: 'new_request' | 'accepted' | 'declined'): void {
  // Send emails in the background without awaiting
  // Don't use setImmediate as it doesn't work well in serverless environments
  sendBookingRequestEmails(data, type).catch((error) => {
    console.error('❌ [sendBookingRequestEmailsAsync] Unhandled error:', error);
  });
}