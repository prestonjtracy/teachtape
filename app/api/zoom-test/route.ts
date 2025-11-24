import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  console.log('✅ Zoom test endpoint received POST request')

  return NextResponse.json({
    success: true,
    message: 'POST endpoint is working',
    timestamp: new Date().toISOString()
  })
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'GET endpoint is working',
    timestamp: new Date().toISOString()
  })
}
