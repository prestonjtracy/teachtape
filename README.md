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

## Stripe
- Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Add your keys to `.env.local` and replace TODOs in the API routes.

## Zoom
- Configure an Event Subscription to `http://localhost:3000/api/zoom/webhook`.
- Set `ZOOM_VERIFICATION_TOKEN` in `.env.local`.

## Email
- Fill SMTP or Resend credentials. See `lib/email.ts` and `/api/email/send`.
