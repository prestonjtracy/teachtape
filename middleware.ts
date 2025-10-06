import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname

  // Protected routes that require authentication
  const isProtectedRoute =
    path.startsWith('/dashboard') ||
    path.startsWith('/admin') ||
    path.startsWith('/my-profile') ||
    path.startsWith('/my-listings') ||
    path.startsWith('/main-dashboard') ||
    path.startsWith('/coach-dashboard') ||
    path.startsWith('/athlete-dashboard')

  // If not a protected route, allow through
  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookie
  const cookies = request.cookies.getAll()
  const hasAuthCookie = cookies.some(cookie =>
    cookie.name.includes('auth-token') && cookie.value
  )

  // If no auth cookie on protected route, redirect to login
  if (!hasAuthCookie) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  // Has auth cookie, allow through
  return NextResponse.next()
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
