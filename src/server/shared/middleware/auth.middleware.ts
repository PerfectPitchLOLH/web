import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'

import { auth } from '@/server/lib/auth'
import { db } from '@/server/lib/database'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { auditLogger } from '@/server/shared/utils'
import { ApiError, createErrorResponse } from '@/server/shared/utils/api.utils'

export type AuthSession = Session & {
  user: {
    id: string
    email: string
    name?: string | null
    role: string
    emailVerified?: Date | null
  }
}

export type ValidateApiAuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; response: NextResponse }

export async function requireAuth(): Promise<AuthSession> {
  const session = await auth()

  if (!session?.user) {
    throw new ApiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  return session as AuthSession
}

export async function requireAdminAuth(): Promise<AuthSession> {
  const session = await auth()

  if (!session?.user) {
    throw new ApiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED)
  }

  const adminId = session.impersonation?.adminId ?? session.user.id

  const admin = await db.user.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
    },
  })

  if (!admin || admin.role !== 'admin') {
    throw new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }

  return {
    ...session,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      emailVerified: admin.emailVerified,
    },
  }
}

export async function validateApiAuth(
  request: NextRequest,
): Promise<ValidateApiAuthResult> {
  try {
    const session = await requireAuth()
    return { ok: true, session }
  } catch {
    const ip = getClientIP(request)
    const { pathname } = request.nextUrl

    auditLogger.logApiUnauthorizedAccess(pathname, request.method, ip)

    return {
      ok: false,
      response: createErrorResponse(
        'UNAUTHORIZED',
        'Authentication required. Please sign in to access this resource.',
        undefined,
        HTTP_STATUS.UNAUTHORIZED,
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
    throw new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
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
    throw new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN)
  }

  return session
}
