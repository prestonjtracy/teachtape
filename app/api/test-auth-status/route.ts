import { createClientForApiRoute } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientForApiRoute(request)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // Get all cookies for debugging
    const cookies = request.cookies.getAll()
    
    return NextResponse.json({
      success: true,
      user: user ? { id: user.id, email: user.email } : null,
      error: error?.message || null,
      cookieCount: cookies.length,
      cookieNames: cookies.map(c => c.name),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}