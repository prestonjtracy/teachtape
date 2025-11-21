/**
 * Simple in-memory rate limiter for API routes
 *
 * IMPORTANT: This is a basic implementation using Map.
 * For production with multiple server instances, use a distributed solution like:
 * - @upstash/ratelimit with Redis
 * - Vercel Edge Config
 * - External rate limiting service
 */

interface RateLimitConfig {
  windowMs: number  // Time window in milliseconds
  maxRequests: number  // Max requests per window
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// Store rate limit data in memory
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  const entries = Array.from(rateLimitStore.entries())
  for (const [key, entry] of entries) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

/**
 * Rate limit result
 */
export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check if request is rate limited
 *
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 60 }
): RateLimitResult {
  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  // No existing entry or window has expired
  if (!entry || entry.resetTime < now) {
    const resetTime = now + config.windowMs
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime
    })

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: resetTime
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(identifier, entry)

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: entry.resetTime
    }
  }

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: entry.resetTime
  }
}

/**
 * Get client identifier from request headers
 * Prefers real IP, falls back to forwarded IP, then session ID
 */
export function getClientIdentifier(headers: Headers, fallback?: string): string {
  // Try to get real IP
  const forwardedFor = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnectingIp = headers.get('cf-connecting-ip')  // Cloudflare

  if (cfConnectingIp) return cfConnectingIp
  if (realIp) return realIp
  if (forwardedFor) {
    const ips = forwardedFor.split(',')
    return ips[0].trim()
  }

  return fallback || 'unknown'
}

/**
 * Preset rate limit configurations
 */
export const RateLimitPresets = {
  // Very strict for sensitive operations (login, signup, password reset)
  STRICT: { windowMs: 60000, maxRequests: 5 },  // 5 requests per minute

  // Moderate for API routes
  MODERATE: { windowMs: 60000, maxRequests: 30 },  // 30 requests per minute

  // Lenient for general API usage
  LENIENT: { windowMs: 60000, maxRequests: 100 },  // 100 requests per minute

  // For authenticated users (higher limits)
  AUTHENTICATED: { windowMs: 60000, maxRequests: 120 },  // 120 requests per minute

  // For webhooks (very lenient)
  WEBHOOK: { windowMs: 60000, maxRequests: 200 },  // 200 requests per minute
} as const
