import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'

import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { auditLogger } from '@/server/shared/utils'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

export type AuthSession = Session & {
  user: {
    id: string
    email: string
    name?: string | null
    role: string
    emailVerified?: Date | null
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const session = await auth()
  return session as AuthSession | null
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('UNAUTHORIZED')
  }

  return session
}

export async function validateApiAuth(
  request: NextRequest,
): Promise<
  | { session: AuthSession; response?: never }
  | { session?: never; response: NextResponse }
> {
  try {
    const session = await requireAuth()
    return { session }
  } catch (error) {
    const ip = getClientIP(request)
    const { pathname } = request.nextUrl

    auditLogger.logApiUnauthorizedAccess(pathname, request.method, ip)

    return {
      response: NextResponse.json(
        createErrorResponse(
          'UNAUTHORIZED',
          'Authentication required. Please sign in to access this resource.',
          undefined,
          HTTP_STATUS.UNAUTHORIZED,
        ),
        { status: HTTP_STATUS.UNAUTHORIZED },
      ),
    }
  }
}

function getClientIP(request: Request): string | null {
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

export async function requireEmailVerified(): Promise<AuthSession> {
  const session = await requireAuth()

  if (!session.user.emailVerified) {
    throw new Error('EMAIL_NOT_VERIFIED')
  }

  return session
}

export function checkRole(
  session: AuthSession,
  allowedRoles: string[],
): boolean {
  return allowedRoles.includes(session.user.role)
}

export async function requireRole(
  allowedRoles: string[],
): Promise<AuthSession> {
  const session = await requireAuth()

  if (!checkRole(session, allowedRoles)) {
    throw new Error('FORBIDDEN')
  }

  return session
}
