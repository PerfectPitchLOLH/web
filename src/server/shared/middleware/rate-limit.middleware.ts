import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

import { auditLogger } from '../utils'

let adminRateLimit: Ratelimit | null = null
let authRateLimit: Ratelimit | null = null

function getAdminRateLimit(): Ratelimit {
  if (!adminRateLimit) {
    adminRateLimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(100, '60 s'),
      analytics: true,
      prefix: 'ratelimit:admin',
    })
  }
  return adminRateLimit
}

function getAuthRateLimit(): Ratelimit {
  if (!authRateLimit) {
    authRateLimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  }
  return authRateLimit
}

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  return 'anonymous'
}

export async function checkAdminRateLimit(
  request: NextRequest,
): Promise<NextResponse | null> {
  try {
    const ratelimit = getAdminRateLimit()
    const identifier = getClientIdentifier(request)

    const { success, limit, reset, remaining } =
      await ratelimit.limit(identifier)

    if (!success) {
      const { pathname } = request.nextUrl

      auditLogger.logRateLimitExceeded(identifier, pathname, identifier)

      return NextResponse.json(
        createErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'Too many requests. Please try again later.',
          {
            limit,
            reset: new Date(reset).toISOString(),
            remaining,
          },
          HTTP_STATUS.TOO_MANY_REQUESTS,
        ),
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        },
      )
    }

    return null
  } catch (error) {
    console.error('[Rate Limit Error]', error)
    return null
  }
}

export async function checkAuthRateLimit(
  request: NextRequest,
): Promise<NextResponse | null> {
  try {
    const ratelimit = getAuthRateLimit()
    const identifier = getClientIdentifier(request)

    const { success, limit, reset, remaining } =
      await ratelimit.limit(identifier)

    if (!success) {
      const { pathname } = request.nextUrl

      auditLogger.logRateLimitExceeded(identifier, pathname, identifier)

      return NextResponse.json(
        createErrorResponse(
          'RATE_LIMIT_EXCEEDED',
          'Too many authentication attempts. Please try again later.',
          {
            limit,
            reset: new Date(reset).toISOString(),
            remaining,
          },
          HTTP_STATUS.TOO_MANY_REQUESTS,
        ),
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        },
      )
    }

    return null
  } catch (error) {
    console.error('[Rate Limit Error]', error)
    return null
  }
}

export async function withAdminRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
): Promise<NextResponse> {
  const rateLimitResponse = await checkAdminRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  return handler(request)
}

export async function withAuthRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
): Promise<NextResponse> {
  const rateLimitResponse = await checkAuthRateLimit(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  return handler(request)
}
