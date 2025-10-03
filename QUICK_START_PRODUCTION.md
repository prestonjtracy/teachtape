# Quick Start: Deploy to Production

**⏱️ Estimated time:** 30-60 minutes (first time)

This is a condensed guide for deploying TeachTape to production. For detailed instructions, see `PRODUCTION_DEPLOYMENT_GUIDE.md`.

---

## Prerequisites

- [ ] Domain name purchased
- [ ] GitHub account
- [ ] Vercel account (free tier works)
- [ ] Supabase account (free tier works)
- [ ] Stripe account (must be verified for live mode)
- [ ] Zoom account (optional - app works without it)
- [ ] Resend account OR SMTP credentials (for emails)

---

## Step 1: Supabase (15 mins)

1. Create project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. In SQL Editor, run all migration files from `supabase/migrations/` (001 through 009)
3. Create storage buckets:
   - `avatars` (public)
   - `coach-gallery` (public)
   - `listing-images` (public)
4. Copy from Settings → API:
   - Project URL
   - `anon` public key
   - `service_role` secret key

---

## Step 2: Stripe (10 mins)

1. Switch to Live Mode in [Stripe Dashboard](https://dashboard.stripe.com)
2. Copy from Developers → API Keys:
   - Publishable key (pk_live_...)
   - Secret key (sk_live_...)
3. Create webhook:
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy signing secret (whsec_...)
4. Get Connect Client ID from Settings → Connect

---

## Step 3: Zoom (10 mins - OPTIONAL)

Skip this if you don't want video meetings. App will work fine without Zoom.

1. Create Server-to-Server OAuth app at [marketplace.zoom.us/develop/create](https://marketplace.zoom.us/develop/create)
2. Add scope: `meeting:write:admin`
3. Activate the app
4. Copy: Account ID, Client ID, Client Secret

---

## Step 4: Email (5 mins)

### Option A: Resend (recommended)
1. Sign up at [resend.com](https://resend.com)
2. Get API key

### Option B: SMTP
Use your existing email provider's SMTP settings

---

## Step 5: Deploy to Vercel (15 mins)

### Connect Repository
```bash
# Install Vercel CLI
npm i -g vercel

# Login and link project
vercel login
vercel link
```

### Set Environment Variables
In Vercel Dashboard → Settings → Environment Variables, add:

```bash
# Supabase (from Step 1)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe (from Step 2)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Zoom (from Step 3 - optional)
ZOOM_ACCOUNT_ID=xxx
ZOOM_CLIENT_ID=xxx
ZOOM_CLIENT_SECRET=xxx

# Email (from Step 4)
RESEND_API_KEY=re_...

# App
APP_URL=https://yourdomain.com
NODE_ENV=production
```

### Deploy
```bash
# Deploy to production
vercel --prod
```

---

## Step 6: Configure Domain (5 mins)

1. In Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

---

## Step 7: Post-Deployment (10 mins)

### Update Webhooks
1. **Stripe:** Update webhook URL to `https://yourdomain.com/api/stripe/webhook`
2. **Zoom** (if used): Update event subscription URL to `https://yourdomain.com/api/zoom/webhook`

### Create Admin User
1. Sign up through your app
2. In Supabase SQL Editor:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```

### Test Critical Flows
- [ ] Sign up works
- [ ] Coach can create listing
- [ ] Booking flow works end-to-end
- [ ] Payment processes
- [ ] Email confirmation sent
- [ ] Admin dashboard accessible

---

## Troubleshooting

### Build fails
```bash
# Run locally first
npm run typecheck
npm run build
```

### Environment variables not working
1. Make sure they're set in Vercel for "Production"
2. Redeploy with force: `vercel --prod --force`

### Webhooks not working
- Check webhook URLs match your domain
- Verify signing secrets are correct
- Check Stripe/Zoom dashboard for delivery attempts

### Zoom meetings not created
- Verify all 3 Zoom env vars are set
- Check Zoom app is activated
- If not using Zoom, this is fine - app works without it

---

## Quick Commands

```bash
# Check if ready to deploy
npm run deploy:check

# Type check
npm run typecheck

# Build locally
npm run build

# Deploy to production
vercel --prod
```

---

## Get Help

- **Full guide:** See `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Check logs:** Vercel Dashboard → Your Project → Functions
- **Database issues:** Supabase Dashboard → Logs
- **Stripe issues:** Stripe Dashboard → Developers → Webhooks

---

**Next:** After deployment is successful, consider:
1. Set up error monitoring (Sentry)
2. Add analytics (Vercel Analytics)
3. Configure uptime monitoring
4. Test all features thoroughly
5. Invite beta users

Good luck! 🚀
