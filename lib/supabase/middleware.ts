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
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  let user = null;
  let authError = false;

  try {
    const {
      data: { user: userData },
      error
    } = await supabase.auth.getUser()

    if (error) {
      console.error('❌ [Middleware] Auth error:', error);
      authError = true;

      // For session_missing errors on auth callback, allow through
      if (error.message && error.message.includes('session_missing') &&
          request.nextUrl.pathname.startsWith('/auth/callback')) {
        return supabaseResponse;
      }
    } else {
      user = userData;
    }
  } catch (error) {
    console.error('❌ [Middleware] Network error getting user:', error);
    authError = true;
  }

  // SECURITY: Fail closed for protected routes
  // Redirect to login if no authenticated user for protected routes
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/my-profile') ||
    request.nextUrl.pathname.startsWith('/my-listings');

  if (!user && isProtectedRoute) {
    // If there was an auth error on protected routes, fail closed (deny access)
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}