import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your application
  // vulnerable to security issues.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Allow auth callback through regardless of auth state
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return supabaseResponse
  }

  // Allow account-blocked page through regardless of auth state
  if (request.nextUrl.pathname.startsWith('/auth/account-blocked')) {
    return supabaseResponse
  }

  // Check user account status - block disabled/deleted users
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('auth_user_id', user.id)
      .single()

    if (profile && profile.status !== 'active') {
      // Sign out non-active users
      await supabase.auth.signOut()

      const url = request.nextUrl.clone()
      url.pathname = '/auth/account-blocked'
      url.searchParams.set('reason', profile.status)
      return NextResponse.redirect(url)
    }
  }

  // Protected routes that require authentication
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/my-profile') ||
    request.nextUrl.pathname.startsWith('/my-listings') ||
    request.nextUrl.pathname.startsWith('/main-dashboard') ||
    request.nextUrl.pathname.startsWith('/coach-dashboard') ||
    request.nextUrl.pathname.startsWith('/athlete-dashboard')

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // IMPORTANT: Always return supabaseResponse, not a new NextResponse.
  // The supabaseResponse contains the updated cookies from the auth refresh.
  return supabaseResponse
}
