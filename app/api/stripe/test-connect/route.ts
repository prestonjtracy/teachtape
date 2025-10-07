import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const appUrl =
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'https://teachtapesports.com'

  return NextResponse.json({
    status: 'ok',
    deployment: 'latest',
    environment: {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      appUrl: appUrl,
      vercelUrl: process.env.VERCEL_URL || 'not set',
      nodeEnv: process.env.NODE_ENV,
    },
    message: 'Stripe Connect endpoint is deployed and URL detection is working'
  })
}
