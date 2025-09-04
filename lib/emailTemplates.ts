/**
 * Email templates for TeachTape booking confirmations
 */

export interface BookingEmailData {
  // Booking details
  sessionId: string;
  bookingId: string;
  
  // Athlete details
  athleteEmail: string;
  athleteName?: string;
  
  // Coach details
  coachName: string;
  coachEmail?: string;
  
  // Service details
  listingTitle: string;
  listingDescription?: string;
  duration: number; // in minutes
  
  // Payment details
  amountPaid: number; // in cents
  currency: string;
  platformFee?: number; // in cents
  
  // Booking date
  bookedAt: Date;
  
  // Next steps
  nextSteps?: string;
}

export interface BookingRequestEmailData {
  // Request details
  requestId: string;
  
  // Athlete details
  athleteEmail: string;
  athleteName?: string;
  
  // Coach details
  coachName: string;
  coachEmail: string;
  
  // Service details
  listingTitle: string;
  listingDescription?: string;
  duration?: number; // in minutes
  priceCents: number;
  
  // Proposed timing
  proposedStart: Date;
  proposedEnd: Date;
  timezone: string;
  
  // Request date
  requestedAt: Date;
  
  // Chat link
  chatUrl?: string;
}

/**
 * Email template for athlete receipt
 */
export function generateAthleteReceiptEmail(data: BookingEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const subject = `Booking Confirmed: ${data.listingTitle} with ${data.coachName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Booking Confirmation - TeachTape</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #007bff;
    }
    .success-badge {
      background: #d4edda;
      color: #155724;
      padding: 12px 20px;
      border-radius: 6px;
      margin-bottom: 24px;
      text-align: center;
      font-weight: bold;
    }
    .booking-details {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 20px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .detail-label {
      font-weight: bold;
      color: #666;
    }
    .amount {
      font-size: 18px;
      font-weight: bold;
      color: #28a745;
    }
    .next-steps {
      background: #e7f3ff;
      border-left: 4px solid #007bff;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background: #007bff;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TeachTape</h1>
    </div>
    
    <div class="success-badge">
      🎉 Booking Confirmed!
    </div>
    
    <p>Hi${data.athleteName ? ` ${data.athleteName}` : ''},</p>
    
    <p>Great news! Your coaching session has been successfully booked. Here are your booking details:</p>
    
    <div class="booking-details">
      <h3 style="margin-top: 0;">Session Details</h3>
      <div class="detail-row">
        <span class="detail-label">Service:</span>
        <span>${data.listingTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Coach:</span>
        <span>${data.coachName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Duration:</span>
        <span>${data.duration} minutes</span>
      </div>
      ${data.listingDescription ? `
      <div style="margin-top: 12px;">
        <div class="detail-label">Description:</div>
        <p style="margin: 4px 0 0 0; color: #666;">${data.listingDescription}</p>
      </div>
      ` : ''}
    </div>
    
    <div class="booking-details">
      <h3 style="margin-top: 0;">Payment Details</h3>
      <div class="detail-row">
        <span class="detail-label">Amount Paid:</span>
        <span class="amount">${formatCurrency(data.amountPaid)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment Date:</span>
        <span>${formatDate(data.bookedAt)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Session ID:</span>
        <span style="font-family: monospace; font-size: 12px;">${data.sessionId}</span>
      </div>
    </div>
    
    <div class="next-steps">
      <h3 style="margin-top: 0; color: #007bff;">What's Next?</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>${data.coachName} will contact you shortly to schedule your session</li>
        <li>Check your email for any follow-up messages</li>
        <li>Come prepared with any specific questions or areas you'd like to focus on</li>
        ${data.nextSteps ? `<li>${data.nextSteps}</li>` : ''}
      </ul>
    </div>
    
    <p>If you have any questions about your booking, please reply to this email or contact ${data.coachName} directly.</p>
    
    <div class="footer">
      <p>Thank you for choosing TeachTape!</p>
      <p style="font-size: 12px; color: #999;">
        This is an automated confirmation email. Please keep it for your records.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `
BOOKING CONFIRMED - TeachTape

Hi${data.athleteName ? ` ${data.athleteName}` : ''},

Great news! Your coaching session has been successfully booked.

SESSION DETAILS:
- Service: ${data.listingTitle}
- Coach: ${data.coachName}
- Duration: ${data.duration} minutes
${data.listingDescription ? `- Description: ${data.listingDescription}\n` : ''}

PAYMENT DETAILS:
- Amount Paid: ${formatCurrency(data.amountPaid)}
- Payment Date: ${formatDate(data.bookedAt)}
- Session ID: ${data.sessionId}

WHAT'S NEXT:
- ${data.coachName} will contact you shortly to schedule your session
- Check your email for any follow-up messages  
- Come prepared with specific questions or focus areas
${data.nextSteps ? `- ${data.nextSteps}\n` : ''}

If you have questions about your booking, please reply to this email or contact ${data.coachName} directly.

Thank you for choosing TeachTape!

---
This is an automated confirmation email. Please keep it for your records.
`;

  return { subject, html, text };
}

/**
 * Email template for coach notification  
 */
export function generateCoachNotificationEmail(data: BookingEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const coachReceives = data.platformFee ? data.amountPaid - data.platformFee : data.amountPaid;
  
  const subject = `New Booking: ${data.listingTitle} from ${data.athleteName || data.athleteEmail}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>New Booking - TeachTape</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #28a745;
    }
    .new-booking-badge {
      background: #d4edda;
      color: #155724;
      padding: 12px 20px;
      border-radius: 6px;
      margin-bottom: 24px;
      text-align: center;
      font-weight: bold;
    }
    .booking-details {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 20px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .detail-label {
      font-weight: bold;
      color: #666;
    }
    .amount {
      font-size: 18px;
      font-weight: bold;
      color: #28a745;
    }
    .action-items {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TeachTape</h1>
    </div>
    
    <div class="new-booking-badge">
      💰 New Booking Received!
    </div>
    
    <p>Hi ${data.coachName},</p>
    
    <p>Great news! You've received a new booking for your coaching services. Here are the details:</p>
    
    <div class="booking-details">
      <h3 style="margin-top: 0;">Booking Details</h3>
      <div class="detail-row">
        <span class="detail-label">Service:</span>
        <span>${data.listingTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Athlete:</span>
        <span>${data.athleteName || 'Not provided'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Athlete Email:</span>
        <span>${data.athleteEmail}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Duration:</span>
        <span>${data.duration} minutes</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Booked:</span>
        <span>${formatDate(data.bookedAt)}</span>
      </div>
    </div>
    
    <div class="booking-details">
      <h3 style="margin-top: 0;">Payment Information</h3>
      <div class="detail-row">
        <span class="detail-label">Total Paid:</span>
        <span>${formatCurrency(data.amountPaid)}</span>
      </div>
      ${data.platformFee ? `
      <div class="detail-row">
        <span class="detail-label">Platform Fee:</span>
        <span>${formatCurrency(data.platformFee)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">You Receive:</span>
        <span class="amount">${formatCurrency(coachReceives)}</span>
      </div>
      ` : `
      <div class="detail-row">
        <span class="detail-label">You Receive:</span>
        <span class="amount">${formatCurrency(data.amountPaid)}</span>
      </div>
      `}
      <div class="detail-row">
        <span class="detail-label">Session ID:</span>
        <span style="font-family: monospace; font-size: 12px;">${data.sessionId}</span>
      </div>
    </div>
    
    <div class="action-items">
      <h3 style="margin-top: 0; color: #856404;">Action Required</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li><strong>Contact the athlete:</strong> Reach out to ${data.athleteEmail} to schedule your session</li>
        <li><strong>Prepare your session:</strong> Review the service details and prepare materials</li>
        <li><strong>Set up meeting:</strong> Share video call link or meeting details</li>
        <li><strong>Confirm timing:</strong> Agree on a time that works for both of you</li>
      </ul>
    </div>
    
    <p>The athlete has received a confirmation email and is expecting to hear from you soon. Please reach out within 24 hours to provide excellent service.</p>
    
    <div class="footer">
      <p>Payment will be transferred to your connected Stripe account according to your payout schedule.</p>
      <p style="font-size: 12px; color: #999;">
        This is an automated notification email.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `
NEW BOOKING RECEIVED - TeachTape

Hi ${data.coachName},

Great news! You've received a new booking for your coaching services.

BOOKING DETAILS:
- Service: ${data.listingTitle}
- Athlete: ${data.athleteName || 'Not provided'}
- Athlete Email: ${data.athleteEmail}
- Duration: ${data.duration} minutes
- Booked: ${formatDate(data.bookedAt)}

PAYMENT INFORMATION:
- Total Paid: ${formatCurrency(data.amountPaid)}
${data.platformFee ? `- Platform Fee: ${formatCurrency(data.platformFee)}\n- You Receive: ${formatCurrency(coachReceives)}` : `- You Receive: ${formatCurrency(data.amountPaid)}`}
- Session ID: ${data.sessionId}

ACTION REQUIRED:
- Contact the athlete: Reach out to ${data.athleteEmail} to schedule your session
- Prepare your session: Review the service details and prepare materials  
- Set up meeting: Share video call link or meeting details
- Confirm timing: Agree on a time that works for both of you

The athlete has received a confirmation email and is expecting to hear from you soon. Please reach out within 24 hours to provide excellent service.

Payment will be transferred to your connected Stripe account according to your payout schedule.

---
This is an automated notification email.
`;

  return { subject, html, text };
}

/**
 * Email template for coach when receiving new booking request
 */
export function generateNewRequestCoachEmail(data: BookingRequestEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDateTime = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const subject = `New Coaching Request: ${data.listingTitle} from ${data.athleteName || data.athleteEmail}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>New Coaching Request - TeachTape</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #ffc107;
    }
    .new-request-badge {
      background: #fff3cd;
      color: #856404;
      padding: 12px 20px;
      border-radius: 6px;
      margin-bottom: 24px;
      text-align: center;
      font-weight: bold;
    }
    .request-details {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 20px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .detail-label {
      font-weight: bold;
      color: #666;
    }
    .price {
      font-size: 18px;
      font-weight: bold;
      color: #28a745;
    }
    .action-buttons {
      background: #e7f3ff;
      border-left: 4px solid #007bff;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .button {
      display: inline-block;
      background: #007bff;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin: 8px 8px 8px 0;
    }
    .button-secondary {
      background: #6c757d;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TeachTape</h1>
    </div>
    
    <div class="new-request-badge">
      📋 New Coaching Request!
    </div>
    
    <p>Hi ${data.coachName},</p>
    
    <p>You've received a new coaching request! An athlete would like to book a session with you.</p>
    
    <div class="request-details">
      <h3 style="margin-top: 0;">Request Details</h3>
      <div class="detail-row">
        <span class="detail-label">Service:</span>
        <span>${data.listingTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Athlete:</span>
        <span>${data.athleteName || 'Not provided'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Email:</span>
        <span>${data.athleteEmail}</span>
      </div>
      ${data.duration ? `
      <div class="detail-row">
        <span class="detail-label">Duration:</span>
        <span>${data.duration} minutes</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="detail-label">Price:</span>
        <span class="price">${formatCurrency(data.priceCents)}</span>
      </div>
    </div>
    
    <div class="request-details">
      <h3 style="margin-top: 0;">Proposed Schedule</h3>
      <div class="detail-row">
        <span class="detail-label">Date & Time:</span>
        <span>${formatDateTime(data.proposedStart)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">End Time:</span>
        <span>${formatDateTime(data.proposedEnd)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Timezone:</span>
        <span>${data.timezone}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Requested:</span>
        <span>${formatDateTime(data.requestedAt)}</span>
      </div>
    </div>
    
    <div class="action-buttons">
      <h3 style="margin-top: 0; color: #007bff;">Next Steps</h3>
      <p>Review this request and decide whether to accept or decline:</p>
      <p style="margin: 16px 0;">
        ${data.chatUrl ? `<a href="${data.chatUrl}" class="button">View Request & Chat</a>` : ''}
        <a href="https://teachtape.local/dashboard" class="button button-secondary">Go to Dashboard</a>
      </p>
      <p style="margin: 0; font-size: 14px; color: #666;">
        💡 Tip: You can chat with the athlete to confirm details before accepting the request.
      </p>
    </div>
    
    <p>The athlete is waiting for your response. Please review the request within 24 hours to provide the best experience.</p>
    
    <div class="footer">
      <p>Happy coaching!</p>
      <p style="font-size: 12px; color: #999;">
        This is an automated notification email.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `
NEW COACHING REQUEST - TeachTape

Hi ${data.coachName},

You've received a new coaching request! An athlete would like to book a session with you.

REQUEST DETAILS:
- Service: ${data.listingTitle}
- Athlete: ${data.athleteName || 'Not provided'}
- Email: ${data.athleteEmail}
${data.duration ? `- Duration: ${data.duration} minutes\n` : ''}- Price: ${formatCurrency(data.priceCents)}

PROPOSED SCHEDULE:
- Date & Time: ${formatDateTime(data.proposedStart)}
- End Time: ${formatDateTime(data.proposedEnd)}
- Timezone: ${data.timezone}
- Requested: ${formatDateTime(data.requestedAt)}

NEXT STEPS:
Review this request and decide whether to accept or decline.

${data.chatUrl ? `View Request & Chat: ${data.chatUrl}\n` : ''}Dashboard: https://teachtape.local/dashboard

💡 Tip: You can chat with the athlete to confirm details before accepting the request.

The athlete is waiting for your response. Please review the request within 24 hours to provide the best experience.

Happy coaching!

---
This is an automated notification email.
`;

  return { subject, html, text };
}

/**
 * Email template for athlete when request is accepted
 */
export function generateRequestAcceptedAthleteEmail(data: BookingRequestEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDateTime = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const subject = `Coaching Request Accepted: ${data.listingTitle} with ${data.coachName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Request Accepted - TeachTape</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #28a745;
    }
    .success-badge {
      background: #d4edda;
      color: #155724;
      padding: 12px 20px;
      border-radius: 6px;
      margin-bottom: 24px;
      text-align: center;
      font-weight: bold;
    }
    .request-details {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 20px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .detail-label {
      font-weight: bold;
      color: #666;
    }
    .price {
      font-size: 18px;
      font-weight: bold;
      color: #28a745;
    }
    .next-steps {
      background: #e7f3ff;
      border-left: 4px solid #007bff;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .button {
      display: inline-block;
      background: #007bff;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin: 16px 0;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TeachTape</h1>
    </div>
    
    <div class="success-badge">
      🎉 Request Accepted!
    </div>
    
    <p>Hi${data.athleteName ? ` ${data.athleteName}` : ''},</p>
    
    <p>Great news! ${data.coachName} has accepted your coaching request.</p>
    
    <div class="request-details">
      <h3 style="margin-top: 0;">Session Details</h3>
      <div class="detail-row">
        <span class="detail-label">Service:</span>
        <span>${data.listingTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Coach:</span>
        <span>${data.coachName}</span>
      </div>
      ${data.duration ? `
      <div class="detail-row">
        <span class="detail-label">Duration:</span>
        <span>${data.duration} minutes</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="detail-label">Price:</span>
        <span class="price">${formatCurrency(data.priceCents)}</span>
      </div>
    </div>
    
    <div class="request-details">
      <h3 style="margin-top: 0;">Scheduled Time</h3>
      <div class="detail-row">
        <span class="detail-label">Date & Time:</span>
        <span>${formatDateTime(data.proposedStart)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">End Time:</span>
        <span>${formatDateTime(data.proposedEnd)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Timezone:</span>
        <span>${data.timezone}</span>
      </div>
    </div>
    
    <div class="next-steps">
      <h3 style="margin-top: 0; color: #007bff;">What's Next?</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Your payment has been processed successfully</li>
        <li>${data.coachName} will contact you with session details</li>
        <li>Check your email for any follow-up messages</li>
        <li>Come prepared with specific questions or focus areas</li>
      </ul>
      ${data.chatUrl ? `<a href="${data.chatUrl}" class="button">Continue Chat with Coach</a>` : ''}
    </div>
    
    <p>Your session is confirmed! We're excited for you to work with ${data.coachName}.</p>
    
    <div class="footer">
      <p>Thank you for choosing TeachTape!</p>
      <p style="font-size: 12px; color: #999;">
        This is an automated confirmation email.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `
REQUEST ACCEPTED - TeachTape

Hi${data.athleteName ? ` ${data.athleteName}` : ''},

Great news! ${data.coachName} has accepted your coaching request.

SESSION DETAILS:
- Service: ${data.listingTitle}
- Coach: ${data.coachName}
${data.duration ? `- Duration: ${data.duration} minutes\n` : ''}- Price: ${formatCurrency(data.priceCents)}

SCHEDULED TIME:
- Date & Time: ${formatDateTime(data.proposedStart)}
- End Time: ${formatDateTime(data.proposedEnd)}
- Timezone: ${data.timezone}

WHAT'S NEXT:
- Your payment has been processed successfully
- ${data.coachName} will contact you with session details
- Check your email for any follow-up messages
- Come prepared with specific questions or focus areas

${data.chatUrl ? `Continue Chat with Coach: ${data.chatUrl}\n\n` : ''}Your session is confirmed! We're excited for you to work with ${data.coachName}.

Thank you for choosing TeachTape!

---
This is an automated confirmation email.
`;

  return { subject, html, text };
}

/**
 * Email template for athlete when request is declined
 */
export function generateRequestDeclinedAthleteEmail(data: BookingRequestEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDateTime = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const subject = `Coaching Request Update: ${data.listingTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Request Update - TeachTape</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #6c757d;
    }
    .declined-badge {
      background: #f8d7da;
      color: #721c24;
      padding: 12px 20px;
      border-radius: 6px;
      margin-bottom: 24px;
      text-align: center;
      font-weight: bold;
    }
    .request-details {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 20px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .detail-label {
      font-weight: bold;
      color: #666;
    }
    .suggestions {
      background: #e7f3ff;
      border-left: 4px solid #007bff;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .button {
      display: inline-block;
      background: #007bff;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin: 16px 0;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TeachTape</h1>
    </div>
    
    <div class="declined-badge">
      📋 Request Update
    </div>
    
    <p>Hi${data.athleteName ? ` ${data.athleteName}` : ''},</p>
    
    <p>Unfortunately, ${data.coachName} is unable to accept your coaching request at this time.</p>
    
    <div class="request-details">
      <h3 style="margin-top: 0;">Request Details</h3>
      <div class="detail-row">
        <span class="detail-label">Service:</span>
        <span>${data.listingTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Coach:</span>
        <span>${data.coachName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Requested Time:</span>
        <span>${formatDateTime(data.proposedStart)}</span>
      </div>
    </div>
    
    <div class="suggestions">
      <h3 style="margin-top: 0; color: #007bff;">What's Next?</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Try requesting a different time slot with ${data.coachName}</li>
        <li>Browse other qualified coaches for this sport</li>
        <li>Check ${data.coachName}'s availability calendar for open slots</li>
        ${data.chatUrl ? `<li>Chat with ${data.coachName} to discuss alternative options</li>` : ''}
      </ul>
      <div style="margin-top: 16px;">
        <a href="https://teachtape.local/coaches" class="button">Browse Other Coaches</a>
        ${data.chatUrl ? `<a href="${data.chatUrl}" class="button" style="background: #6c757d;">Chat with Coach</a>` : ''}
      </div>
    </div>
    
    <p>Don't worry - there are many great coaches on TeachTape who would love to help you improve your skills!</p>
    
    <div class="footer">
      <p>Keep training!</p>
      <p style="font-size: 12px; color: #999;">
        This is an automated notification email.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `
REQUEST UPDATE - TeachTape

Hi${data.athleteName ? ` ${data.athleteName}` : ''},

Unfortunately, ${data.coachName} is unable to accept your coaching request at this time.

REQUEST DETAILS:
- Service: ${data.listingTitle}
- Coach: ${data.coachName}
- Requested Time: ${formatDateTime(data.proposedStart)}

WHAT'S NEXT:
- Try requesting a different time slot with ${data.coachName}
- Browse other qualified coaches for this sport
- Check ${data.coachName}'s availability calendar for open slots
${data.chatUrl ? `- Chat with ${data.coachName} to discuss alternative options` : ''}

Browse Other Coaches: https://teachtape.local/coaches
${data.chatUrl ? `Chat with Coach: ${data.chatUrl}\n` : ''}
Don't worry - there are many great coaches on TeachTape who would love to help you improve your skills!

Keep training!

---
This is an automated notification email.
`;

  return { subject, html, text };
}

/**
 * Email template for athlete when request expires
 */
export function generateRequestExpiredAthleteEmail(data: BookingRequestEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDateTime = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const subject = `Coaching Request Expired: ${data.listingTitle}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Request Expired - TeachTape</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 32px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 2px solid #6c757d;
    }
    .expired-badge {
      background: #fff3cd;
      color: #856404;
      padding: 12px 20px;
      border-radius: 6px;
      margin-bottom: 24px;
      text-align: center;
      font-weight: bold;
    }
    .request-details {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 20px;
      margin: 24px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .detail-label {
      font-weight: bold;
      color: #666;
    }
    .suggestions {
      background: #e7f3ff;
      border-left: 4px solid #007bff;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .button {
      display: inline-block;
      background: #007bff;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin: 16px 0;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TeachTape</h1>
    </div>
    
    <div class="expired-badge">
      ⏰ Request Expired
    </div>
    
    <p>Hi${data.athleteName ? ` ${data.athleteName}` : ''},</p>
    
    <p>Your coaching request has expired after 72 hours without a response from the coach.</p>
    
    <div class="request-details">
      <h3 style="margin-top: 0;">Request Details</h3>
      <div class="detail-row">
        <span class="detail-label">Service:</span>
        <span>${data.listingTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Coach:</span>
        <span>${data.coachName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Requested Time:</span>
        <span>${formatDateTime(data.proposedStart)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Requested:</span>
        <span>${formatDateTime(data.requestedAt)}</span>
      </div>
    </div>
    
    <div class="suggestions">
      <h3 style="margin-top: 0; color: #007bff;">What's Next?</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Try sending a new request to ${data.coachName} with different timing</li>
        <li>Browse other qualified coaches for this sport</li>
        <li>Check coach availability before sending your next request</li>
        ${data.chatUrl ? `<li>You can still chat with ${data.coachName} to discuss options</li>` : ''}
      </ul>
      <div style="margin-top: 16px;">
        <a href="https://teachtape.local/coaches" class="button">Browse Other Coaches</a>
        ${data.chatUrl ? `<a href="${data.chatUrl}" class="button" style="background: #6c757d;">Continue Chat</a>` : ''}
      </div>
    </div>
    
    <p>Don't give up! There are many great coaches on TeachTape who are ready to help you improve your skills.</p>
    
    <div class="footer">
      <p>Keep training!</p>
      <p style="font-size: 12px; color: #999;">
        This is an automated notification email.
      </p>
    </div>
  </div>
</body>
</html>`;

  const text = `
REQUEST EXPIRED - TeachTape

Hi${data.athleteName ? ` ${data.athleteName}` : ''},

Your coaching request has expired after 72 hours without a response from the coach.

REQUEST DETAILS:
- Service: ${data.listingTitle}
- Coach: ${data.coachName}
- Requested Time: ${formatDateTime(data.proposedStart)}
- Requested: ${formatDateTime(data.requestedAt)}

WHAT'S NEXT:
- Try sending a new request to ${data.coachName} with different timing
- Browse other qualified coaches for this sport
- Check coach availability before sending your next request
${data.chatUrl ? `- You can still chat with ${data.coachName} to discuss options` : ''}

Browse Other Coaches: https://teachtape.local/coaches
${data.chatUrl ? `Continue Chat: ${data.chatUrl}\n` : ''}
Don't give up! There are many great coaches on TeachTape who are ready to help you improve your skills.

Keep training!

---
This is an automated notification email.
`;

  return { subject, html, text };
}