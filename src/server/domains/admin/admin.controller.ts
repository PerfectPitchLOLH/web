import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { requireAdminAuth } from '@/server/shared/middleware/auth.middleware'
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

import {
  auditLogFiltersSchema,
  deleteUserSchema,
  suspendUserSchema,
  updateUserRoleSchema,
  userManagementFiltersSchema,
} from './admin.schemas'
import type { AdminService } from './admin.service'

export class AdminController {
  constructor(private service: AdminService) {}

  async getDashboardStats(_request: NextRequest) {
    try {
      await requireAdminAuth()
      const stats = await this.service.getDashboardStats()
      return createSuccessResponse(stats)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getUsers(request: NextRequest) {
    try {
      await requireAdminAuth()

      const { searchParams } = request.nextUrl
      const filters = userManagementFiltersSchema.parse({
        role: searchParams.get('role'),
        search: searchParams.get('search'),
        emailVerified: searchParams.get('emailVerified'),
        page: searchParams.get('page') || '1',
        limit: searchParams.get('limit') || '10',
      })

      const result = await this.service.getUsers(filters)
      return createSuccessResponse(result)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async updateUserRole(request: NextRequest) {
    try {
      const session = await requireAdminAuth()

      const body = await request.json()
      const data = updateUserRoleSchema.parse(body)

      const ip = getClientIP(request)
      const userAgent = request.headers.get('user-agent')

      await this.service.updateUserRole(
        data,
        session.user.id,
        session.user.name || session.user.email,
        ip,
        userAgent,
      )

      return createSuccessResponse(
        { message: 'User role updated successfully' },
        HTTP_STATUS.OK,
      )
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(
          'INVALID_JSON',
          'Invalid JSON in request body',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid request data',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async suspendUser(request: NextRequest) {
    try {
      const session = await requireAdminAuth()

      const body = await request.json()
      const data = suspendUserSchema.parse(body)

      const ip = getClientIP(request)
      const userAgent = request.headers.get('user-agent')

      await this.service.suspendUser(
        data,
        session.user.id,
        session.user.name || session.user.email,
        ip,
        userAgent,
      )

      return createSuccessResponse(
        { message: 'User suspension status updated successfully' },
        HTTP_STATUS.OK,
      )
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(
          'INVALID_JSON',
          'Invalid JSON in request body',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid request data',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async deleteUser(request: NextRequest) {
    try {
      const session = await requireAdminAuth()

      const body = await request.json()
      const data = deleteUserSchema.parse(body)

      const ip = getClientIP(request)
      const userAgent = request.headers.get('user-agent')

      await this.service.deleteUser(
        data,
        session.user.id,
        session.user.name || session.user.email,
        ip,
        userAgent,
      )

      return createSuccessResponse(
        { message: 'User deleted successfully' },
        HTTP_STATUS.OK,
      )
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(
          'INVALID_JSON',
          'Invalid JSON in request body',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      if (error instanceof ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid request data',
          error.issues,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async getAuditLogs(request: NextRequest) {
    try {
      await requireAdminAuth()

      const { searchParams } = request.nextUrl
      const filters = auditLogFiltersSchema.parse({
        userId: searchParams.get('userId'),
        action: searchParams.get('action'),
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        page: searchParams.get('page') || '1',
        limit: searchParams.get('limit') || '20',
      })

      const result = await this.service.getAuditLogs(filters)
      return createSuccessResponse(result)
    } catch (error) {
      return handleApiError(error)
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
