import { NextRequest, NextResponse } from 'next/server'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { requireAdminAuth } from '@/server/shared/middleware/auth.middleware'
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'
import { auditLogger } from '@/server/shared/utils/audit.logger'

import type { ImpersonationService } from './impersonation.service'

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

export class ImpersonationController {
  constructor(private service: ImpersonationService) {}

  async startImpersonation(request: NextRequest) {
    try {
      const session = await requireAdminAuth()
      const body = (await request.json()) as { targetUserId: string }
      const ip = getClientIP(request)
      const userAgent = request.headers.get('user-agent')

      if (!body.targetUserId) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'targetUserId is required',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      if (!isValidCuid(body.targetUserId)) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid user ID format',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      const impersonationSession = await this.service.startImpersonation(
        session.user.id,
        body.targetUserId,
        ip,
        userAgent,
      )

      const targetUser = await this.service.getActiveImpersonation(
        session.user.id,
      )

      if (targetUser) {
        auditLogger.logImpersonationStart(
          session.user.id,
          session.user.email,
          targetUser.targetUserId,
          targetUser.targetUserEmail,
          ip,
          userAgent,
        )
      }

      const responseData = createSuccessResponse(
        {
          sessionId: impersonationSession.id,
          targetUser: targetUser
            ? {
                id: targetUser.targetUserId,
                name: targetUser.targetUserName,
                email: targetUser.targetUserEmail,
                role: targetUser.targetUserRole,
              }
            : null,
        },
        HTTP_STATUS.CREATED,
      )

      const response = NextResponse.json(responseData, {
        status: HTTP_STATUS.CREATED,
      })

      response.cookies.set(
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

      return response
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getActiveImpersonation(request: NextRequest) {
    try {
      const session = await requireAdminAuth()

      const activeImpersonation = await this.service.getActiveImpersonation(
        session.user.id,
      )

      if (!activeImpersonation) {
        return createSuccessResponse({ impersonation: null }, HTTP_STATUS.OK)
      }

      return createSuccessResponse(
        {
          impersonation: {
            sessionId: activeImpersonation.sessionId,
            targetUser: {
              id: activeImpersonation.targetUserId,
              name: activeImpersonation.targetUserName,
              email: activeImpersonation.targetUserEmail,
              role: activeImpersonation.targetUserRole,
            },
            startedAt: activeImpersonation.startedAt,
          },
        },
        HTTP_STATUS.OK,
      )
    } catch (error) {
      return handleApiError(error)
    }
  }

  async endImpersonation(request: NextRequest) {
    try {
      const session = await requireAdminAuth()
      const body = (await request.json()) as { sessionId: string }
      const ip = getClientIP(request)

      if (!body.sessionId) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'sessionId is required',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      if (!isValidCuid(body.sessionId)) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid session ID format',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      const activeImpersonation = await this.service.getActiveImpersonation(
        session.user.id,
      )

      if (
        !activeImpersonation ||
        activeImpersonation.sessionId !== body.sessionId
      ) {
        return createErrorResponse(
          'FORBIDDEN',
          'Invalid session or unauthorized access',
          undefined,
          HTTP_STATUS.FORBIDDEN,
        )
      }

      await this.service.endImpersonation(body.sessionId, ip)

      if (activeImpersonation) {
        auditLogger.logImpersonationEnd(
          session.user.id,
          session.user.email,
          activeImpersonation.targetUserId,
          activeImpersonation.targetUserEmail,
          ip,
        )
      }

      const responseData = createSuccessResponse(
        { message: 'Impersonation ended successfully' },
        HTTP_STATUS.OK,
      )

      const response = NextResponse.json(responseData, {
        status: HTTP_STATUS.OK,
      })

      response.cookies.delete('impersonation_session_id')

      return response
    } catch (error) {
      return handleApiError(error)
    }
  }
}
