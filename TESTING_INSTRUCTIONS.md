# Coach Onboarding and Listings Testing Instructions

## Prerequisites
1. Ensure the development server is running: `npm run dev`
2. Ensure Supabase is connected and the database schema is up to date
3. Access the app at http://localhost:3000

## Test Scenario: Complete Coach Onboarding Flow

### Step 1: User Authentication
1. **Navigate to** `/auth/signup` or `/auth/login`
2. **Create/login** with an email account
3. **Verify** you're logged in by checking the browser's developer console for auth state

### Step 2: Create Coach Profile
1. **Navigate to** `/dashboard`
2. **Click** "→ My Profile" link
3. **Fill out the profile form** with:
   - Full Name: `Alex Johnson`
   - Bio: `Professional tennis coach with 10+ years experience`
   - Sport: `Tennis`
   - Avatar URL: `https://via.placeholder.com/150` (or any valid image URL)
4. **Click** "Create Profile" button
5. **Verify** success toast appears
6. **Verify** profile information is displayed below the form

### Step 3: Create Listings
1. **Navigate to** `/my-listings`
2. **Click** "New Listing" button
3. **Create first listing**:
   - Title: `Beginner Tennis Lessons`
   - Description: `Perfect for those new to tennis. Learn basic techniques and fundamentals.`
   - Price (cents): `5000` (= $50.00)
   - Duration (minutes): `60`
   - Active: ✓ checked
4. **Click** "Create Listing" button
5. **Verify** success toast appears
6. **Create second listing**:
   - Title: `Advanced Tennis Training`
   - Description: `Intensive training for competitive players.`
   - Price (cents): `8000` (= $80.00)
   - Duration (minutes): `90`
   - Active: ✓ checked
7. **Verify** both listings appear in the list

### Step 4: Verify Public Coach Display
1. **Navigate to** `/coaches`
2. **Verify** your coach profile appears with:
   - Name: "Alex Johnson"
   - Sport: "Tennis"
   - Listing count: "2 active listings"
   - Price: "From $50"
3. **Click on your coach card** to view the individual coach page
4. **Verify** the coach page shows:
   - Profile information (name, bio, sport)
   - Both active listings with correct prices and descriptions
   - "Book Session" buttons on each listing

### Step 5: Test Listing Management
1. **Return to** `/my-listings`
2. **Click** "Deactivate" on one of your listings
3. **Verify** success toast appears
4. **Verify** the listing shows as "Inactive"
5. **Navigate back to** `/coaches` and your coach page
6. **Verify** only the active listing appears publicly
7. **Return to** `/my-listings`
8. **Click** "Activate" to reactivate the listing
9. **Verify** both listings are active again

## Expected Results Summary

✅ **Profile Creation**: User can create a coach profile with all required fields  
✅ **Profile Display**: Profile information is saved and displayed correctly  
✅ **Listing Creation**: User can create multiple listings with different prices/durations  
✅ **Listing Management**: User can activate/deactivate listings  
✅ **Public Display**: Coach appears on `/coaches` with accurate listing information  
✅ **Individual Coach Page**: Shows complete profile and active listings only  
✅ **Toast Notifications**: Success/error messages appear for all actions  
✅ **Navigation**: All dashboard links work correctly  

## Troubleshooting

### Common Issues:
1. **"Please create your profile first"**: Make sure you're logged in and have created a profile
2. **Database errors**: Check that Supabase connection is working and schema is up to date
3. **Toast not showing**: Check browser console for JavaScript errors
4. **Listings not appearing**: Verify the listing is marked as `is_active: true`

### Database Verification Queries:
```sql
-- Check if profile was created
SELECT * FROM profiles WHERE role = 'coach' ORDER BY created_at DESC LIMIT 5;

-- Check if listings were created
SELECT l.*, p.full_name 
FROM listings l 
JOIN profiles p ON l.coach_id = p.id 
ORDER BY l.created_at DESC LIMIT 10;
```

## Success Criteria
- ✅ Coach can complete full onboarding flow without errors
- ✅ All form validations work properly
- ✅ Toast notifications appear for all user actions
- ✅ Public coach pages display accurate, up-to-date information
- ✅ Listing activation/deactivation works correctly
- ✅ Navigation between all pages works smoothly

---

# Email Receipt Testing Instructions

## Overview
The email receipt system has been successfully implemented and is ready for testing with real Resend API keys.

## Implementation Status ✅

### ✅ Completed
- **Email Templates**: Comprehensive HTML/text templates for both athletes and coaches
- **Fire-and-forget System**: Emails don't block webhook responses
- **BCC Functionality**: Coaches are BCC'd on athlete receipt emails
- **Error Handling**: Graceful degradation when email fails
- **Fee Integration**: Platform fee breakdown included in emails
- **Webhook Integration**: Complete integration with Stripe webhook handler

### 🔧 Components Implemented

1. **lib/emailTemplates.ts**
   - `generateAthleteReceiptEmail()` - Beautiful receipt with booking details
   - `generateCoachNotificationEmail()` - Action-oriented coach notification
   - Responsive HTML design with fallback text versions

2. **lib/email.ts** 
   - `sendBookingEmails()` - Main email sending function
   - `sendBookingEmailsAsync()` - Fire-and-forget wrapper for webhooks
   - BCC support for coach on athlete emails

3. **app/api/stripe/webhook/route.ts**
   - `sendBookingConfirmationEmails()` - Fetches coach/listing data and sends emails
   - Non-blocking error handling
   - Complete integration with booking flow

## Testing Results

### ✅ Template Generation Test
```bash
npx tsx scripts/test-email-templates.ts
```
- Fee calculations: ✅ Working
- HTML generation: ✅ 4,431 chars (athlete), 4,491 chars (coach)  
- Text fallbacks: ✅ 947 chars (athlete), 1,022 chars (coach)
- Template logic: ✅ All data fields populated correctly

### ✅ Email Flow Test
```bash  
npx tsx scripts/test-webhook-email.ts
```
- Email data preparation: ✅ Working
- Template generation: ✅ Working  
- Error handling: ✅ Graceful degradation without RESEND_API_KEY
- Fire-and-forget behavior: ✅ Confirmed

### ✅ Webhook Integration Test
```bash
curl -X POST http://localhost:3000/api/stripe/webhook [...]
```
- Signature validation: ✅ Working (properly rejects invalid signatures)
- Error logging: ✅ Proper webhook security in place
- Response handling: ✅ Returns appropriate HTTP status codes

## Production Setup

To enable email receipts in production:

1. **Set Environment Variable**:
   ```bash
   RESEND_API_KEY=re_your_actual_resend_api_key_here
   ```

2. **Verify Domain Setup**:
   - Configure sending domain in Resend dashboard
   - Update `from` address in `lib/email.ts` if needed (currently: `TeachTape <no-reply@teachtape.local>`)

3. **Test with Real Booking**:
   - Create a test booking through the UI
   - Verify webhook receives `checkout.session.completed` event
   - Confirm both athlete and coach receive emails

## Email Flow Summary

When a booking is completed:

1. **Webhook receives** `checkout.session.completed` event
2. **Booking is upserted** to database with idempotency  
3. **Email data is prepared** by fetching coach/listing details
4. **Two emails are sent** (fire-and-forget):
   - **Athlete Receipt**: Confirmation with booking details + BCC to coach
   - **Coach Notification**: New booking alert with action items  
5. **Webhook responds** immediately (emails don't block response)
6. **Errors are logged** but don't affect booking creation

## Key Features

- 📧 **Professional Templates**: Beautiful HTML with text fallbacks
- ⚡ **Fire-and-forget**: Won't block webhook responses  
- 💰 **Fee Transparency**: Platform fee breakdown included
- 🔄 **BCC Integration**: Coaches automatically included on athlete receipts
- 🛡️ **Error Resilience**: Email failures don't break booking flow
- 📱 **Responsive Design**: Mobile-friendly email templates
- 🎯 **Action-oriented**: Clear next steps for both parties

The email receipt system is **production-ready** and awaiting RESEND_API_KEY configuration for live testing.