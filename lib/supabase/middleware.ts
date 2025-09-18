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
  try {
    const {
      data: { user: userData },
      error
    } = await supabase.auth.getUser()
    
    if (error) {
      console.error('❌ [Middleware] Auth error:', error);
      // Be more forgiving with auth errors - don't immediately fail
      if (error.message && error.message.includes('session_missing')) {
        // Allow request to continue, let client-side handle auth
        return supabaseResponse;
      }
    } else {
      user = userData;
    }
  } catch (error) {
    console.error('❌ [Middleware] Network error getting user:', error);
    // On network error, don't redirect - allow the request to continue
    // This prevents users from being logged out due to temporary network issues
    return supabaseResponse;
  }

  // Only redirect to login for very specific protected routes and only if we're confident there's no user
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/') && // Allow home page
    !request.nextUrl.pathname.startsWith('/coaches') && // Allow coaches page
    !request.nextUrl.pathname.startsWith('/api') && // Allow API routes
    (request.nextUrl.pathname.startsWith('/admin/users') || // Only protect very sensitive admin pages
     request.nextUrl.pathname.startsWith('/admin/settings'))
  ) {
    // Only redirect for highly sensitive pages
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