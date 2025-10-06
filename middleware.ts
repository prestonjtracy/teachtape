import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Simple pass-through response
  const response = NextResponse.next({
    request,
  })

  // Get all cookies to find the Supabase auth token
  const allCookies = request.cookies.getAll()
  const authCookie = allCookies.find(cookie => cookie.name.includes('-auth-token'))

  let hasValidAuth = false

  if (authCookie?.value) {
    try {
      // Parse the auth cookie to check if there's an access token
      const parsed = JSON.parse(decodeURIComponent(authCookie.value))
      const accessToken = parsed.access_token || parsed[0]?.access_token

      if (accessToken) {
        // Basic JWT structure check (not full validation)
        const parts = accessToken.split('.')
        if (parts.length === 3) {
          // Decode payload to check expiration - use Buffer for base64 decode in Edge Runtime
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
          const now = Math.floor(Date.now() / 1000)

          // Check if token is not expired
          if (payload.exp && payload.exp > now) {
            hasValidAuth = true
          }
        }
      }
    } catch (error) {
      // Invalid token format, treat as unauthenticated
      // Silently fail in production
    }
  }

  // Allow auth callback through regardless of auth state
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return response
  }

  // SECURITY: Fail closed for protected routes
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/my-profile') ||
    request.nextUrl.pathname.startsWith('/my-listings')

  if (!hasValidAuth && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}