/**
 * Rate limiting helper functions for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier, RateLimitPresets } from './rateLimit';

/**
 * Apply rate limiting to a request
 * Returns NextResponse if rate limited, null if allowed
 */
export function applyRateLimit(
  req: NextRequest,
  preset: keyof typeof RateLimitPresets = 'MODERATE',
  identifier?: string
): NextResponse | null {
  const clientId = identifier || getClientIdentifier(req.headers);
  const result = rateLimit(clientId, RateLimitPresets[preset]);

  if (!result.success) {
    const resetDate = new Date(result.reset);
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': resetDate.toISOString(),
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  req: NextRequest,
  preset: keyof typeof RateLimitPresets = 'MODERATE',
  identifier?: string
): NextResponse {
  const clientId = identifier || getClientIdentifier(req.headers);
  const result = rateLimit(clientId, RateLimitPresets[preset]);

  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());

  return response;
}
