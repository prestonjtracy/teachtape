import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const recovery = searchParams.get('recovery')
  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/dashboard'

  // Debug logging
  console.log('🔍 [AUTH CALLBACK] Full URL:', request.url)
  console.log('🔍 [AUTH CALLBACK] Parameters:', { 
    code: code?.substring(0, 8) + '...', 
    type, 
    recovery, 
    error, 
    errorCode,
    errorDescription,
    next 
  })

  // Handle Supabase auth errors directly
  if (error) {
    console.error('❌ [AUTH CALLBACK] Supabase auth error:', { error, errorCode, errorDescription })
    
    // Special handling for password reset links
    if (errorCode === 'otp_expired' && errorDescription?.includes('Email link')) {
      console.log('🔄 [AUTH CALLBACK] Password reset link expired, redirecting to request new one')
      return NextResponse.redirect(new URL('/auth/login?error=reset_expired&message=Password reset link has expired. Please request a new one.', request.url))
    }
    
    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
  }

  if (code) {
    const supabase = createClient()
    
    try {
      // Exchange code for session
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('❌ [AUTH CALLBACK] Session exchange failed:', sessionError)
        
        // Handle specific session errors
        if (sessionError.message?.includes('expired') || sessionError.message?.includes('invalid')) {
          return NextResponse.redirect(new URL('/auth/login?error=expired_link&message=Authentication link has expired. Please try signing in again.', request.url))
        }
        
        return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
      }

      if (data.session) {
        // Check if this is a password recovery session
        // Method 1: Explicit recovery parameter
        if (recovery === 'true' || type === 'recovery') {
          console.log('🔄 [AUTH CALLBACK] Detected recovery flow via parameter, redirecting to reset password')
          return NextResponse.redirect(new URL(`/auth/reset-password?session=active`, request.url))
        }
        
        // Method 2: Check if user needs to update password (Supabase sets this for recovery sessions)
        if (data.user && data.user.user_metadata?.password_reset) {
          console.log('🔄 [AUTH CALLBACK] Detected recovery flow via user metadata, redirecting to reset password')
          return NextResponse.redirect(new URL(`/auth/reset-password?session=active`, request.url))
        }
        
        // Method 3: Check if this is a recovery session by examining the session properties
        if (data.session.access_token && data.user?.recovery_sent_at) {
          console.log('🔄 [AUTH CALLBACK] Detected recovery flow via recovery timestamp, redirecting to reset password')
          return NextResponse.redirect(new URL(`/auth/reset-password?session=active`, request.url))
        }
        
        console.log('✅ [AUTH CALLBACK] Normal sign in flow, redirecting to:', next)
        // Normal sign in flow
        return NextResponse.redirect(new URL(next, request.url))
      }
    } catch (unexpectedError) {
      console.error('❌ [AUTH CALLBACK] Unexpected error:', unexpectedError)
      return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
    }
  }

  // Return the user to an error page with instructions
  console.log('❌ [AUTH CALLBACK] No valid code or session, redirecting to error page')
  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}