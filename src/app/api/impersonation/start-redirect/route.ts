import { NextRequest, NextResponse } from 'next/server'

import { impersonationService } from '@/server/domains/impersonation'
import { auth } from '@/server/lib/auth'
import { withAdminRateLimit } from '@/server/shared/middleware/rate-limit.middleware'
import { auditLogger } from '@/server/shared/utils/audit.logger'

function getClientIP(request: NextRequest): string | null {
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

function isValidCuid(value: string): boolean {
  return /^c[a-z0-9]{24}$/.test(value)
}

async function handleImpersonationStart(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }

    if (session.user.role !== 'admin') {
      const { searchParams } = request.nextUrl
      const attemptedTargetUserId =
        searchParams.get('targetUserId') || 'unknown'
      const ip = getClientIP(request)

      auditLogger.logImpersonationUnauthorized(
        session.user.id,
        attemptedTargetUserId,
        'User is not an administrator',
        ip,
      )
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    const { searchParams } = request.nextUrl
    const targetUserId = searchParams.get('targetUserId')

    if (!targetUserId) {
      return NextResponse.redirect(new URL('/admin/users', request.url))
    }

    if (!isValidCuid(targetUserId)) {
      const ip = getClientIP(request)
      auditLogger.logImpersonationUnauthorized(
        session.user.id,
        targetUserId,
        'Invalid user ID format',
        ip,
      )
      return NextResponse.redirect(new URL('/admin/users', request.url))
    }

    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent')

    const impersonationSession = await impersonationService.startImpersonation(
      session.user.id,
      targetUserId,
      ip,
      userAgent,
    )

    const targetUser = await impersonationService.getActiveImpersonation(
      session.user.id,
    )

    if (targetUser) {
      auditLogger.logImpersonationStart(
        session.user.id,
        session.user.email ?? 'unknown',
        targetUser.targetUserId,
        targetUser.targetUserEmail,
        ip,
        userAgent,
      )
    }

    const redirectResponse = NextResponse.redirect(
      new URL('/dashboard', request.url),
      { status: 302 },
    )

    redirectResponse.cookies.set(
      'impersonation_session_id',
      impersonationSession.id,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 30 * 60,
        path: '/',
      },
    )

    return redirectResponse
  } catch {
    return NextResponse.redirect(new URL('/admin/users', request.url))
  }
}

export async function GET(request: NextRequest) {
  return withAdminRateLimit(request, handleImpersonationStart)
}
