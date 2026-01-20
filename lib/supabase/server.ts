import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Alternative client for API routes that handles request/response cookies
export function createClientForApiRoute(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = request.cookies.getAll()
          console.log('[createClientForApiRoute] Cookies found:', cookies.map(c => ({ name: c.name, hasValue: !!c.value })))
          return cookies
        },
        setAll(cookiesToSet) {
          console.log('[createClientForApiRoute] Setting cookies:', cookiesToSet.map(c => ({ name: c.name, hasValue: !!c.value })))
          // For API routes, we can't set cookies in the response easily
          // This is mainly used for reading existing cookies
        },
      },
    }
  )
}

/**
 * SECURITY WARNING: Admin client bypasses Row Level Security (RLS)
 *
 * This client uses the service role key which grants elevated privileges
 * and BYPASSES all Row Level Security policies in the database.
 *
 * ⚠️ ONLY use this client for:
 *   - Admin operations requiring elevated privileges
 *   - System operations that must bypass RLS
 *   - Operations explicitly validated for admin access
 *
 * ❌ NEVER use this client for:
 *   - User-facing API routes without admin role verification
 *   - Operations where user-level RLS should apply
 *   - Any code path that could be reached by non-admin users
 *
 * Always verify admin role BEFORE calling this function!
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // Admin client doesn't need cookies
        },
      },
    }
  )
}