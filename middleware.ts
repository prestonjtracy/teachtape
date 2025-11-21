import { NextResponse, type NextRequest } from 'next/server'
import { rateLimit, getClientIdentifier, RateLimitPresets } from '@/lib/rateLimit'

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking attacks
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy (restrict powerful features)
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  )

  // XSS Protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' https://*.supabase.co https://api.stripe.com; " +
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none'; " +
    "upgrade-insecure-requests;"
  )

  return response
}

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname

  // CORS Configuration for API routes
  if (path.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL

    // Webhooks don't need CORS (server-to-server)
    const isWebhook = path.includes('/webhook')

    if (!isWebhook && origin) {
      // Allow same-origin requests
      const allowedOrigins = [
        appUrl,
        'http://localhost:3000',
        'http://127.0.0.1:3000'
      ].filter(Boolean)

      // Check if origin is allowed
      if (!allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed!))) {
        return new NextResponse(
          JSON.stringify({ error: 'CORS policy: Origin not allowed' }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        )
      }
    }
  }

  // Apply rate limiting to API routes
  if (path.startsWith('/api/')) {
    // Skip rate limiting for webhooks (they have their own auth)
    const isWebhook = path.includes('/webhook')

    if (!isWebhook) {
      const identifier = getClientIdentifier(request.headers)

      // Use stricter limits for auth endpoints
      const isAuthEndpoint = path.startsWith('/api/auth/')
      const config = isAuthEndpoint ? RateLimitPresets.STRICT : RateLimitPresets.MODERATE

      const rateLimitResult = rateLimit(identifier, config)

      if (!rateLimitResult.success) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000)),
              'X-RateLimit-Limit': String(rateLimitResult.limit),
              'X-RateLimit-Remaining': String(rateLimitResult.remaining),
              'X-RateLimit-Reset': String(rateLimitResult.reset)
            }
          }
        )
      }

      // Add rate limit headers to successful responses
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit))
      response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
      response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset))

      // Continue to auth check if needed
      if (!path.startsWith('/api/')) {
        return response
      }
    }
  }

  // Protected routes that require authentication
  const isProtectedRoute =
    path.startsWith('/dashboard') ||
    path.startsWith('/admin') ||
    path.startsWith('/my-profile') ||
    path.startsWith('/my-listings') ||
    path.startsWith('/main-dashboard') ||
    path.startsWith('/coach-dashboard') ||
    path.startsWith('/athlete-dashboard')

  // If not a protected route, allow through with security headers
  if (!isProtectedRoute) {
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  // Check for Supabase auth cookie (format: sb-<project-ref>-auth-token)
  const cookies = request.cookies.getAll()
  const hasAuthCookie = cookies.some(cookie =>
    (cookie.name.startsWith('sb-') && cookie.name.includes('auth-token')) && cookie.value
  )

  // If no auth cookie on protected route, redirect to login
  if (!hasAuthCookie) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  // Has auth cookie, allow through with security headers
  const response = NextResponse.next()
  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (images, etc)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$|api/).*)',
  ],
}
