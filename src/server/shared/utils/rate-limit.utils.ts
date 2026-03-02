import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

export const rateLimiters = {
  signIn: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: '@upstash/ratelimit:signin',
  }),

  signUp: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: '@upstash/ratelimit:signup',
  }),

  passwordReset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: '@upstash/ratelimit:password-reset',
  }),

  verificationEmail: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '10 m'),
    analytics: true,
    prefix: '@upstash/ratelimit:verification-email',
  }),

  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: '@upstash/ratelimit:api',
  }),
}

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string,
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)

  return {
    success,
    limit,
    remaining,
    reset,
  }
}

export function getRateLimitIdentifier(
  ip: string | null,
  email?: string,
): string {
  if (email) {
    return `email:${email}`
  }
  return `ip:${ip || 'unknown'}`
}

export function getClientIP(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  return null
}
