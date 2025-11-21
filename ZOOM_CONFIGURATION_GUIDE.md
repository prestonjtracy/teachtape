# Zoom Configuration Guide for TeachTape

This guide provides step-by-step instructions for configuring Zoom to work with TeachTape's meeting and webhook features.

---

## Prerequisites

- A Zoom account (Pro, Business, or Enterprise plan recommended)
- Admin access to the Zoom App Marketplace
- Your TeachTape production URL (e.g., `https://yourdomain.com`)

---

## Part 1: Create Server-to-Server OAuth App

This app allows TeachTape to create Zoom meetings on behalf of your account.

### Step 1: Access Zoom App Marketplace

1. Go to [https://marketplace.zoom.us/](https://marketplace.zoom.us/)
2. Click **"Develop"** in the top navigation
3. Click **"Build App"**

### Step 2: Create the App

1. Select **"Server-to-Server OAuth"** as the app type
2. Click **"Create"**
3. Fill in the basic information:
   - **App Name:** `TeachTape`
   - **Short Description:** `Coaching session management platform`
   - **Company Name:** Your company/organization name
   - **Developer Name:** Your name
   - **Developer Email:** Your email address

### Step 3: Configure App Information

1. On the **"App Credentials"** tab, you'll see:
   - **Account ID** - Copy this (you'll need it later)
   - **Client ID** - Copy this (you'll need it later)
   - **Client Secret** - Copy this (you'll need it later)

2. ⚠️ **IMPORTANT:** Keep these credentials secure! Never commit them to git.

### Step 4: Add Scopes

1. Go to the **"Scopes"** tab
2. Click **"Add Scopes"**
3. Add the following scopes:
   - ✅ `meeting:write:admin` - Create meetings
   - ✅ `meeting:read:admin` - Read meeting details

### Step 5: Activate the App

1. Click **"Continue"** to move through any remaining setup screens
2. On the **"Activation"** tab, toggle the app to **"Activated"**
3. ✅ Your Server-to-Server OAuth app is now ready!

---

## Part 2: Configure Webhook Event Subscriptions

This allows Zoom to send real-time events (meeting started, ended, participants joined/left) to TeachTape.

### Step 1: Enable Event Subscriptions

1. In your Zoom app (from Part 1), go to the **"Feature"** tab
2. Find **"Event Subscriptions"** section
3. Toggle **"Enable Event Subscriptions"** to ON

### Step 2: Add Subscription URL

1. In the **"Event notification endpoint URL"** field, enter:
   ```
   https://yourdomain.com/api/zoom/webhook
   ```
   Replace `yourdomain.com` with your actual production domain.

2. Click **"Add"** or **"Validate"**

3. Zoom will send a validation request to your endpoint. If TeachTape is deployed and running, you should see:
   - ✅ **"Validation Successful"** or similar confirmation

4. If validation fails:
   - Make sure your TeachTape app is deployed and accessible
   - Check that the URL is correct (no trailing slash)
   - Check your server logs for errors

### Step 3: Subscribe to Events

Scroll down to **"Event types"** and subscribe to these events:

#### Meeting Events
- ✅ **Start Meeting** (`meeting.started`)
  - Description: "Meeting has started"

- ✅ **End Meeting** (`meeting.ended`)
  - Description: "Meeting has ended"

#### Participant Events
- ✅ **Participant/Host joined meeting** (`meeting.participant_joined`)
  - Description: "Participant or host joined a meeting"

- ✅ **Participant/Host left meeting** (`meeting.participant_left`)
  - Description: "Participant or host left a meeting"

### Step 4: Get the Secret Token

1. After adding event subscriptions, Zoom will display a **"Secret Token"**
2. **Copy this token** - this is your `ZOOM_WEBHOOK_SECRET`
3. ⚠️ **IMPORTANT:** This token is used to verify webhook authenticity. Keep it secure!

### Step 5: Save

1. Click **"Save"** at the bottom of the page
2. ✅ Your webhook configuration is complete!

---

## Part 3: Configure Environment Variables

Now add the credentials to your TeachTape environment variables.

### For Local Development (.env.local)

```bash
# Zoom API Credentials
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here

# Zoom Webhook Security
ZOOM_WEBHOOK_SECRET=your_secret_token_here
```

### For Production (Vercel/Your Hosting Platform)

1. Go to your hosting dashboard (e.g., Vercel)
2. Navigate to **Settings → Environment Variables**
3. Add these variables for **Production** environment:

| Variable Name | Value | Source |
|--------------|-------|--------|
| `ZOOM_ACCOUNT_ID` | Account ID from Step 1 | Zoom App Credentials tab |
| `ZOOM_CLIENT_ID` | Client ID from Step 1 | Zoom App Credentials tab |
| `ZOOM_CLIENT_SECRET` | Client Secret from Step 1 | Zoom App Credentials tab |
| `ZOOM_WEBHOOK_SECRET` | Secret Token from Step 2 | Zoom Event Subscriptions |

4. **Redeploy** your application after adding the variables

---

## Part 4: Run Database Migration

Apply the migration to add Zoom webhook support:

### Using Supabase Dashboard

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Open and run the migration file:
   ```
   supabase/migrations/031_add_zoom_meeting_id_and_webhook_events.sql
   ```
4. Click **"Run"**
5. ✅ Verify that:
   - `bookings` table now has `zoom_meeting_id` column
   - New `zoom_webhook_events` table exists

### Using Supabase CLI (Local)

```bash
# Apply migrations
supabase db push

# Or apply specific migration
supabase migration up
```

---

## Part 5: Test the Integration

### Test 1: Meeting Creation

1. Create a test booking in TeachTape
2. Accept the booking request as a coach
3. Check that:
   - ✅ Zoom meeting was created
   - ✅ Join URL is displayed for athlete
   - ✅ Start URL is displayed for coach
   - ✅ `zoom_meeting_id` is stored in database

### Test 2: Webhook Events

1. Start a test meeting using the Start URL
2. Join the meeting as another participant
3. End the meeting
4. Check your Supabase `zoom_webhook_events` table:
   - ✅ Should have `meeting.started` event
   - ✅ Should have `meeting.participant_joined` events
   - ✅ Should have `meeting.participant_left` events
   - ✅ Should have `meeting.ended` event
5. Check that booking status changed to `completed`

### Test 3: Webhook Delivery (Zoom Dashboard)

1. Go to your Zoom app in the Marketplace
2. Navigate to **Feature → Event Subscriptions**
3. Click **"View Subscription"** next to your endpoint
4. You should see recent webhook deliveries with:
   - ✅ Status: 200 OK
   - ✅ Recent timestamps

---

## Troubleshooting

### Issue: "Endpoint URL validation failed"

**Cause:** Zoom cannot reach your webhook endpoint

**Solutions:**
1. Verify your TeachTape app is deployed and running
2. Check the URL is correct: `https://yourdomain.com/api/zoom/webhook`
3. Ensure no firewall is blocking Zoom's IP ranges
4. Check server logs for incoming validation requests
5. Make sure `ZOOM_WEBHOOK_SECRET` is set (even during validation)

### Issue: "Zoom meetings not being created"

**Cause:** OAuth credentials are incorrect or app is not activated

**Solutions:**
1. Verify all three credentials are set correctly:
   - `ZOOM_ACCOUNT_ID`
   - `ZOOM_CLIENT_ID`
   - `ZOOM_CLIENT_SECRET`
2. Check that the app is **Activated** in Zoom Marketplace
3. Verify the app has `meeting:write:admin` scope
4. Check server logs for Zoom API errors

### Issue: "Webhook events not being logged"

**Cause:** Webhook secret mismatch or database schema issue

**Solutions:**
1. Verify `ZOOM_WEBHOOK_SECRET` matches the token in Zoom dashboard
2. Check that migration 031 was applied successfully
3. Check `zoom_webhook_events` table exists in database
4. Review server logs for webhook processing errors
5. Test webhook delivery in Zoom dashboard

### Issue: "Invalid HMAC signature"

**Cause:** `ZOOM_WEBHOOK_SECRET` doesn't match Zoom's token

**Solutions:**
1. Go to Zoom app → Feature → Event Subscriptions
2. Copy the **Secret Token** again
3. Update `ZOOM_WEBHOOK_SECRET` environment variable
4. Redeploy your application

### Issue: "Booking status not changing to completed"

**Cause:** `zoom_meeting_id` not stored or not matching

**Solutions:**
1. Check that `zoom_meeting_id` column exists in `bookings` table
2. Create a new test booking (old bookings won't have meeting ID)
3. Verify meeting ID is being stored when booking is created
4. Check webhook logs to see if meeting ID matches

---

## Security Best Practices

1. ✅ **Never commit credentials to git**
   - Use environment variables only
   - Add `.env.local` to `.gitignore`

2. ✅ **Use different credentials for development and production**
   - Create separate Zoom apps for dev/staging/prod

3. ✅ **Regularly rotate secrets**
   - Generate new Client Secret periodically
   - Update environment variables after rotation

4. ✅ **Monitor webhook deliveries**
   - Check Zoom dashboard for failed deliveries
   - Review server logs for webhook errors
   - Set up alerts for webhook failures

5. ✅ **Validate webhook signatures**
   - Already implemented in TeachTape
   - Never disable signature verification

---

## Additional Resources

- [Zoom Server-to-Server OAuth Documentation](https://developers.zoom.us/docs/internal-apps/s2s-oauth/)
- [Zoom Webhooks Documentation](https://developers.zoom.us/docs/api/rest/webhook-reference/)
- [Zoom Meeting API Documentation](https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#tag/Meetings)

---

## Summary Checklist

Before going live, ensure:

- [ ] Server-to-Server OAuth app created and activated
- [ ] All 3 OAuth credentials copied and set as environment variables
- [ ] Event subscriptions enabled with correct endpoint URL
- [ ] All 4 event types subscribed (started, ended, participant joined/left)
- [ ] Webhook secret token copied and set as `ZOOM_WEBHOOK_SECRET`
- [ ] Database migration 031 applied successfully
- [ ] Test booking creates Zoom meeting successfully
- [ ] Test meeting triggers webhook events
- [ ] Webhook events logged to `zoom_webhook_events` table
- [ ] Booking status updates to completed when meeting ends

---

**🎉 Zoom Integration Complete!**

Your TeachTape platform is now fully integrated with Zoom for meeting creation and event tracking.
