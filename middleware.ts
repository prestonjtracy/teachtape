import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Temporarily simplified - just pass through
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all protected routes and auth callback for cookie management
     */
    '/dashboard/:path*',
    '/my-profile/:path*',
    '/my-listings/:path*',
    '/admin/:path*',
    '/auth/callback',
    '/api/test-auth-status',
  ],
}