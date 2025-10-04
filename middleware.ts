import { updateSession } from '@/lib/middleware-auth'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
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