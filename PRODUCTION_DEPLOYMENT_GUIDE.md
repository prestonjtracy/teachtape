# TeachTape Production Deployment Guide

This guide will walk you through deploying TeachTape to production.

## ✅ Pre-Deployment Checklist

### Code Quality
- [x] All TypeScript errors fixed (0 errors in production code)
- [x] Zoom integration implemented with graceful fallback
- [ ] All tests passing (run `npm test`)
- [ ] Build successful (run `npm run build`)

### Required Services Setup
- [ ] Supabase project created
- [ ] Stripe account configured
- [ ] Zoom Server-to-Server OAuth app created (optional)
- [ ] Email service configured (Resend or SMTP)
- [ ] Domain name purchased and DNS configured

---

## 1. Supabase Setup

### Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and keys from Settings → API

### Run Database Migrations
Apply all migrations in order:
```bash
# In Supabase SQL Editor, run each migration file from supabase/migrations/ in order:
# 001_create_rls_policies.sql
# 002_updated_booking_schema.sql
# 003_rls_policies_booking_flow.sql
# 004_add_scheduling_chat_primitives.sql
# 005_add_coach_gallery.sql
# 006_add_zoom_session_logs.sql
# 007_secure_admin_role.sql
# 008_add_account_type_signup.sql
# 009_add_admin_settings_commission.sql
```

### Create Storage Buckets
1. Go to Storage in Supabase dashboard
2. Create these buckets (all public):
   - `avatars` - User profile pictures
   - `coach-gallery` - Coach portfolio images
   - `listing-images` - Service listing images

### Set Up RLS Policies
Verify Row Level Security is enabled on all tables:
- Run `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;` for each table if needed
- Test that users can only access their own data

---

## 2. Stripe Setup

### Production Mode
1. Switch your Stripe account to production mode
2. Get your production keys from [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)

### Configure Webhooks
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `account.updated` (for Stripe Connect)
4. Copy the **Signing Secret** (starts with `whsec_`)

### Stripe Connect Setup
1. Enable Stripe Connect in your Stripe account
2. Get your Connect Client ID from Settings → Connect
3. Configure your platform profile

---

## 3. Zoom Setup (Optional but Recommended)

### Create Server-to-Server OAuth App
1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/develop/create)
2. Choose "Server-to-Server OAuth"
3. Fill in app details:
   - App Name: TeachTape
   - Description: Coaching session management
   - Company Name: Your Company
4. Add scopes:
   - `meeting:write:admin`
   - `meeting:read:admin`
5. Activate the app
6. Note down:
   - **Account ID**
   - **Client ID**
   - **Client Secret**

### Configure Webhook (Optional)
1. In your Zoom app, go to Features → Event Subscriptions
2. Add event subscription URL: `https://yourdomain.com/api/zoom/webhook`
3. Select events:
   - Meeting Started
   - Meeting Ended
   - Participant Joined
   - Participant Left
4. Generate a **Verification Token** (any random string)

---

## 4. Email Configuration

### Option A: Resend (Recommended)
1. Sign up at [resend.com](https://resend.com)
2. Get your API key from Settings → API Keys
3. Verify your domain

### Option B: SMTP
1. Get SMTP credentials from your email provider
2. Note: host, port, username, password

---

## 5. Deploy to Vercel (Recommended)

### Initial Setup
1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Link project: `vercel link`

### Configure Environment Variables
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables for **Production**:

#### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

#### Stripe
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
```

#### Zoom (Optional)
```
ZOOM_ACCOUNT_ID=your-account-id
ZOOM_CLIENT_ID=your-client-id
ZOOM_CLIENT_SECRET=your-client-secret
ZOOM_VERIFICATION_TOKEN=your-verification-token
```

#### Email
```
RESEND_API_KEY=re_...
# OR for SMTP:
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

#### App Configuration
```
APP_URL=https://yourdomain.com
NODE_ENV=production
```

### Deploy
```bash
# Deploy to production
vercel --prod

# Or push to main branch (if auto-deploy is enabled)
git push origin main
```

---

## 6. Post-Deployment Configuration

### Update External Service URLs

#### Stripe Webhooks
1. Update webhook URL to: `https://yourdomain.com/api/stripe/webhook`
2. Test webhook delivery in Stripe Dashboard

#### Zoom Webhooks (if configured)
1. Update event subscription URL to: `https://yourdomain.com/api/zoom/webhook`
2. Save and activate

### DNS Configuration
1. Add A or CNAME record pointing to Vercel
2. Configure SSL/TLS (automatic with Vercel)
3. Wait for DNS propagation (can take up to 48 hours)

### Create First Admin User
1. Sign up through your app
2. Manually update the user in Supabase:
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE email = 'youremail@example.com';
   ```

---

## 7. Testing in Production

### Test Critical Flows

#### 1. User Registration
- [ ] Sign up as athlete works
- [ ] Sign up as coach works
- [ ] Email verification works (if enabled)

#### 2. Coach Setup
- [ ] Coach can create listings
- [ ] Coach can upload avatar/gallery images
- [ ] Coach can connect Stripe account

#### 3. Booking Flow
- [ ] Browse coaches page loads
- [ ] Book a session
- [ ] Payment processes successfully
- [ ] Booking confirmation email sent
- [ ] Zoom meeting created (if configured)

#### 4. Admin Dashboard
- [ ] Admin can access admin panel
- [ ] Can view all bookings
- [ ] Can view payments
- [ ] Audit logs working

### Monitor Logs
1. Vercel Dashboard → Your Project → Deployments → Latest → Functions
2. Check for errors in server logs
3. Monitor Supabase logs
4. Check Stripe webhook delivery logs

---

## 8. Performance & Security

### Performance Optimization
- [ ] Enable compression in Vercel (automatic)
- [ ] Optimize images with next/image
- [ ] Review bundle size: `npm run build` and check output
- [ ] Set up CDN for static assets (automatic with Vercel)

### Security Checklist
- [ ] All RLS policies enabled in Supabase
- [ ] Admin routes protected (role='admin' check)
- [ ] Stripe webhook signature verification enabled
- [ ] Zoom webhook verification token set
- [ ] Environment variables not committed to git
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] CORS configured properly

### Monitoring & Alerts
Consider adding:
- Error tracking: [Sentry](https://sentry.io)
- Analytics: [Vercel Analytics](https://vercel.com/analytics) or [Plausible](https://plausible.io)
- Uptime monitoring: [UptimeRobot](https://uptimerobot.com)
- Performance monitoring: [Vercel Speed Insights](https://vercel.com/docs/speed-insights)

---

## 9. Maintenance

### Regular Tasks
- Monitor error logs weekly
- Review Stripe payouts to coaches
- Check database performance
- Update dependencies monthly: `npm update`
- Backup database regularly (Supabase auto-backups)

### Updating Code
```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin main

# Vercel will auto-deploy if connected
# Or manually: vercel --prod
```

### Rollback Procedure
If something breaks:
1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

---

## 10. Common Issues & Solutions

### Issue: TypeScript errors during build
**Solution:** Run `npm run typecheck` locally first. All production code should have 0 errors.

### Issue: Supabase RLS blocking queries
**Solution:** Check RLS policies. Use service role key for admin operations.

### Issue: Stripe webhook not receiving events
**Solution:**
1. Check webhook URL is correct
2. Verify signing secret matches
3. Check Stripe dashboard for delivery attempts

### Issue: Zoom meetings not created
**Solution:**
1. Check ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET are set
2. Verify Zoom app is activated
3. Check server logs for Zoom API errors
4. If not using Zoom, the app will work with `join_url: null`

### Issue: Environment variables not updating
**Solution:**
1. Update in Vercel dashboard
2. Redeploy: `vercel --prod --force`

---

## Support & Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Supabase Documentation:** https://supabase.com/docs
- **Stripe Documentation:** https://stripe.com/docs
- **Zoom API Documentation:** https://developers.zoom.us/docs/api/
- **Next.js Documentation:** https://nextjs.org/docs

---

## Production Environment Variables Reference

Copy this template and fill in your production values:

```bash
# --- Supabase ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# --- Stripe ---
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=

# --- Zoom (Optional) ---
ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
ZOOM_VERIFICATION_TOKEN=

# --- Email ---
RESEND_API_KEY=
# OR
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# --- App ---
APP_URL=https://yourdomain.com
NODE_ENV=production
```

---

**🚀 Ready to Launch!**

Once you've completed all the steps above, your TeachTape platform will be live and ready for users!

Need help? Check the troubleshooting section or review server logs for specific error messages.
