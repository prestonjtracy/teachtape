import { createClient } from '@/lib/supabase/server'
import { User } from '@supabase/supabase-js'

/**
 * Server-side authentication helpers for API routes
 *
 * Use these to protect your API endpoints and ensure proper auth checks
 */

export interface AuthUser extends User {
  profile?: {
    id: string
    role?: string
    full_name?: string
  }
}

export interface AuthResult {
  user: AuthUser
  error: null
}

export interface AuthError {
  user: null
  error: {
    message: string
    status: number
  }
}

/**
 * Require authentication for API route
 * Returns authenticated user or returns error response data
 *
 * @example
 * const { user, error } = await requireAuth()
 * if (error) return NextResponse.json({ error: error.message }, { status: error.status })
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      error: {
        message: 'Unauthorized - Please sign in',
        status: 401
      }
    }
  }

  return {
    user: user as AuthUser,
    error: null
  }
}

/**
 * Require admin authentication for API route
 * Returns authenticated admin user or returns error response data
 *
 * @example
 * const { user, error } = await requireAdmin()
 * if (error) return NextResponse.json({ error: error.message }, { status: error.status })
 */
export async function requireAdmin(): Promise<AuthResult | AuthError> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      user: null,
      error: {
        message: 'Unauthorized - Please sign in',
        status: 401
      }
    }
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError || !profile) {
    return {
      user: null,
      error: {
        message: 'Failed to verify user profile',
        status: 500
      }
    }
  }

  if (profile.role !== 'admin') {
    return {
      user: null,
      error: {
        message: 'Forbidden - Admin access required',
        status: 403
      }
    }
  }

  const authUser = user as AuthUser
  authUser.profile = profile

  return {
    user: authUser,
    error: null
  }
}

/**
 * Get optional authentication for API route
 * Returns user if authenticated, null otherwise (no error)
 *
 * @example
 * const user = await getOptionalAuth()
 * if (user) {
 *   // User is authenticated
 * } else {
 *   // User is not authenticated
 * }
 */
export async function getOptionalAuth(): Promise<AuthUser | null> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user as AuthUser
}

/**
 * Get user's profile with auth check
 * Returns profile or null if not found
 */
export async function getUserProfile(userId: string) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .single()

  return profile
}
