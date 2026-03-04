import { NextRequest } from 'next/server'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { requireAdminAuth } from '@/server/shared/middleware/auth.middleware'
import {
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

import type { ImpersonationLogService } from './impersonation-log.service'

export class ImpersonationLogController {
  constructor(private logService: ImpersonationLogService) {}

  async getSessionLogs(request: NextRequest) {
    try {
      await requireAdminAuth()

      const { searchParams } = request.nextUrl
      const sessionId = searchParams.get('sessionId')
      const page = parseInt(searchParams.get('page') || '1', 10)
      const limit = parseInt(searchParams.get('limit') || '50', 10)

      if (!sessionId) {
        return createSuccessResponse(
          {
            error: 'sessionId query parameter is required',
          },
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      const result = await this.logService.getSessionLogs(
        sessionId,
        page,
        limit,
      )

      return createSuccessResponse(result, HTTP_STATUS.OK)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getSessionStats(request: NextRequest) {
    try {
      await requireAdminAuth()

      const { searchParams } = request.nextUrl
      const sessionId = searchParams.get('sessionId')

      if (!sessionId) {
        return createSuccessResponse(
          {
            error: 'sessionId query parameter is required',
          },
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      const stats = await this.logService.getSessionStats(sessionId)

      return createSuccessResponse(stats, HTTP_STATUS.OK)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
