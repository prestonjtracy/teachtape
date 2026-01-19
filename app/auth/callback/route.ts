import { createServerClient } from '@supabase/ssr'
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
    // We need to track cookies to set on the response
    const cookiesToSet: { name: string; value: string; options: any }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            // Collect cookies to set on the response
            cookies.forEach((cookie) => {
              cookiesToSet.push(cookie)
            })
          },
        },
      }
    )

    // Helper function to create redirect response with cookies
    const createRedirectWithCookies = (url: URL) => {
      const response = NextResponse.redirect(url)
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      console.log('🍪 [AUTH CALLBACK] Setting cookies:', cookiesToSet.map(c => c.name))
      return response
    }
    
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
          return createRedirectWithCookies(new URL(`/auth/reset-password?session=active`, request.url))
        }

        // Method 2: Check if user needs to update password (Supabase sets this for recovery sessions)
        if (data.user && data.user.user_metadata?.password_reset) {
          console.log('🔄 [AUTH CALLBACK] Detected recovery flow via user metadata, redirecting to reset password')
          return createRedirectWithCookies(new URL(`/auth/reset-password?session=active`, request.url))
        }

        // Method 3: Check if this is a recovery session by examining the session properties
        if (data.session.access_token && data.user?.recovery_sent_at) {
          console.log('🔄 [AUTH CALLBACK] Detected recovery flow via recovery timestamp, redirecting to reset password')
          return createRedirectWithCookies(new URL(`/auth/reset-password?session=active`, request.url))
        }

        // Handle new user profile creation
        if (data.user) {
          console.log('👤 [AUTH CALLBACK] User authenticated, checking for profile...', {
            userId: data.user.id,
            emailConfirmed: !!data.user.email_confirmed_at,
            hasSession: !!data.session
          })

          try {
            // Check if profile exists
            const { data: existingProfile, error: profileCheckError } = await supabase
              .from('profiles')
              .select('id, role')
              .eq('auth_user_id', data.user.id)
              .single()

            if (profileCheckError && profileCheckError.code === 'PGRST116') {
              // Profile doesn't exist, create it from user metadata
              console.log('📝 [AUTH CALLBACK] Creating profile from signup metadata...')

              const userMetadata = data.user.user_metadata || {}
              const accountType = userMetadata.account_type || 'athlete'
              const fullName = userMetadata.full_name || ''

              const { error: createError } = await supabase
                .from('profiles')
                .insert({
                  auth_user_id: data.user.id,
                  full_name: fullName,
                  role: accountType,
                  email: data.user.email
                })

              if (createError) {
                console.error('❌ [AUTH CALLBACK] Profile creation failed:', createError)
                // Continue anyway - profile can be created later
              } else {
                console.log('✅ [AUTH CALLBACK] Profile created successfully')
              }

              // Redirect based on account type
              const redirectUrl = accountType === 'coach' ? '/dashboard' : '/coaches'
              console.log('🔄 [AUTH CALLBACK] New user redirect to:', redirectUrl)
              return createRedirectWithCookies(new URL(`${redirectUrl}?signup=success`, request.url))
            } else if (existingProfile) {
              console.log('✅ [AUTH CALLBACK] Existing user with profile, role:', existingProfile.role)

              // Redirect based on existing role
              const redirectUrl = existingProfile.role === 'coach' ? '/dashboard' : '/coaches'
              return createRedirectWithCookies(new URL(redirectUrl, request.url))
            }
          } catch (profileError) {
            console.error('❌ [AUTH CALLBACK] Profile handling error:', profileError)
            // Continue with default redirect
          }
        }

        console.log('✅ [AUTH CALLBACK] Normal sign in flow, redirecting to:', next)
        // Normal sign in flow
        return createRedirectWithCookies(new URL(next, request.url))
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