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

/**
 * Get CORS headers for a given origin
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL

  // Define allowed origins
  const allowedOrigins = [
    appUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://teachtapesports.com',
    'https://www.teachtapesports.com'
  ].filter(Boolean) as string[]

  // Check if origin is allowed
  const isAllowed = origin && allowedOrigins.some(allowed =>
    origin === allowed || origin.startsWith(allowed)
  )

  // Return appropriate headers
  if (isAllowed && origin) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400' // 24 hours
    }
  }

  return {}
}

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname
  const origin = request.headers.get('origin')

  // CORS Configuration for API routes
  if (path.startsWith('/api/')) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL

    // Webhooks don't need CORS (server-to-server)
    const isWebhook = path.includes('/webhook')

    // Handle preflight OPTIONS requests
    if (request.method === 'OPTIONS' && !isWebhook) {
      const corsHeaders = getCorsHeaders(origin)

      if (Object.keys(corsHeaders).length > 0) {
        return new NextResponse(null, {
          status: 204,
          headers: corsHeaders
        })
      }

      // Origin not allowed
      return new NextResponse(null, { status: 403 })
    }

    if (!isWebhook && origin) {
      // Define allowed origins
      const allowedOrigins = [
        appUrl,
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://teachtapesports.com',
        'https://www.teachtapesports.com'
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

    if (isWebhook) {
      // Webhooks handle their own rate limiting, let them through
      return NextResponse.next()
    }

    // Apply rate limiting to non-webhook API routes
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

    // Add rate limit headers and CORS headers to successful responses for API routes
    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit))
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset))

    // Add CORS headers for browser requests
    if (origin) {
      const corsHeaders = getCorsHeaders(origin)
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
    }

    return response
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
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
