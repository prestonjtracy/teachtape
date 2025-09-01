import nodemailer from "nodemailer";
import { Resend } from "resend";
import { BookingEmailData, generateAthleteReceiptEmail, generateCoachNotificationEmail } from "./emailTemplates";

const from = "TeachTape <no-reply@teachtape.local>";

export async function sendEmailSMTP(to: string, subject: string, html: string) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP credentials missing");
  const transporter = nodemailer.createTransporter({ host, port, auth: { user, pass } });
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
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  
  const resend = new Resend(key);
  
  // Handle legacy string parameters for backward compatibility
  if (typeof options === 'string') {
    await resend.emails.send({ 
      from, 
      to: options, 
      subject: subject!, 
      html: html! 
    });
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
  
  await resend.emails.send(emailData);
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