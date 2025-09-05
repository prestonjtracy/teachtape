import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const recovery = searchParams.get('recovery')
  const next = searchParams.get('next') ?? '/dashboard'

  // Debug logging
  console.log('🔍 [AUTH CALLBACK] Full URL:', request.url)
  console.log('🔍 [AUTH CALLBACK] Parameters:', { code: code?.substring(0, 8) + '...', type, recovery, next })

  if (code) {
    const supabase = createClient()
    
    // Exchange code for session first
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      // Check if this is a password recovery session
      if (recovery === 'true' || type === 'recovery') {
        console.log('🔄 [AUTH CALLBACK] Detected recovery flow, redirecting to reset password')
        return NextResponse.redirect(new URL(`/auth/reset-password?session=active`, request.url))
      }
      
      console.log('✅ [AUTH CALLBACK] Normal sign in flow, redirecting to:', next)
      // Normal sign in flow
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}