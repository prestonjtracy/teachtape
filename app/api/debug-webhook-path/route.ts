import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Debug endpoint to test if API routes work without the "webhook" keyword in path.
 * Compare this with /api/zoom/webhook to see if the webhook path is causing issues.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    path: req.nextUrl.pathname,
    timestamp: new Date().toISOString(),
    message: 'This endpoint works! Compare with /api/zoom/webhook',
    headers: {
      host: req.headers.get('host'),
      'x-forwarded-proto': req.headers.get('x-forwarded-proto'),
      'x-forwarded-host': req.headers.get('x-forwarded-host'),
    }
  })
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  return NextResponse.json({
    status: 'ok',
    method: 'POST',
    path: req.nextUrl.pathname,
    bodyLength: body.length,
    timestamp: new Date().toISOString(),
  })
}
