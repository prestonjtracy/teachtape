# TeachTape Starter (Next.js + Supabase + Stripe Connect + Zoom)

MVP-ready scaffold to kickstart TeachTape:
- Next.js App Router (marketing page + minimal dashboard shell)
- Supabase schema (profiles, listings, availability, bookings, reviews, messages)
- Stripe Connect webhook + stubs for Checkout and coach onboarding
- Zoom webhook endpoint stub
- Email utility (SMTP or Resend-compatible)
- `.env.example` listing all keys to plug in

> This is a starter kit: you will need to finish TODOs, wire auth, and enforce permissions/RLS before production.

## Quick Start

```bash
# 1) Clone & setup
unzip teachtape-starter.zip -d ./
cd teachtape-starter
cp .env.example .env.local

# 2) Install deps
npm install

# 3) Dev
npm run dev
```

## Supabase
- Paste `supabase/schema.sql` into the SQL editor (or run as a migration).
- Turn on RLS and craft policies for each table.
- Run `npm run seed:coaches` locally to insert demo coach profiles. The script reads
  `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from your environment
  and must never run in the browser.

## Stripe
- Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Add your keys to `.env.local` and replace TODOs in the API routes.

## Zoom
- Configure an Event Subscription to `http://localhost:3000/api/zoom/webhook`.
- Set `ZOOM_VERIFICATION_TOKEN` in `.env.local`.

## Email
- Fill SMTP or Resend credentials. See `lib/email.ts` and `/api/email/send`.

## Environment Variables

Set the following variables in Vercel. "Preview" refers to Preview Deployments; "Production" covers the Production Deployment.

| Variable | Purpose | Preview | Production |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key for browser requests | Yes | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for server tasks | Yes | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key for server-side API calls | Yes | Yes |
| `STRIPE_WEBHOOK_SECRET` | Validates Stripe webhooks | Yes | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for client-side UI | Optional | Yes |
| `STRIPE_CONNECT_CLIENT_ID` | Connect onboarding client ID | Optional | Yes |
| `APP_URL` | Base URL used for redirects and links | Yes | Yes |
| `ZOOM_VERIFICATION_TOKEN` | Zoom webhook verification | Optional | Yes |
| `ZOOM_CLIENT_ID` | Zoom OAuth client ID | Optional | Optional |
| `ZOOM_CLIENT_SECRET` | Zoom OAuth client secret | Optional | Optional |
| `RESEND_API_KEY` | Resend email API key | Optional | Optional |
| `SMTP_HOST` | SMTP server host | Optional | Optional |
| `SMTP_PORT` | SMTP port | Optional | Optional |
| `SMTP_USER` | SMTP username | Optional | Optional |
| `SMTP_PASS` | SMTP password | Optional | Optional |
