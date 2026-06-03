import { NextRequest } from 'next/server'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

import type { NotificationService } from './notification.service'
import type {
  CreateNotificationDTO,
  MarkAsReadDTO,
  NotificationFilters,
  UpdateNotificationDTO,
} from './notification.types'

export class NotificationController {
  constructor(private service: NotificationService) {}

  async getNotifications(userId: string, request: NextRequest) {
    try {
      const searchParams = request.nextUrl.searchParams
      const read = searchParams.get('read')
      const type = searchParams.get('type')
      const limit = searchParams.get('limit')
      const offset = searchParams.get('offset')

      const filters: NotificationFilters = {
        userId,
        ...(read !== null && { read: read === 'true' }),
        ...(type && {
          type: type as NotificationFilters['type'],
        }),
        ...(limit && { limit: parseInt(limit, 10) }),
        ...(offset && { offset: parseInt(offset, 10) }),
      }

      const result = await this.service.getNotifications(filters)
      return createSuccessResponse(result)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getNotificationById(id: string, userId: string) {
    try {
      const notification = await this.service.getNotificationById(id, userId)
      return createSuccessResponse(notification)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async createNotification(request: NextRequest) {
    try {
      const body = (await request.json()) as CreateNotificationDTO

      if (!body.userId || !body.type || !body.title || !body.description) {
        return createSuccessResponse(
          { error: 'Champs requis manquants' },
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      const notification = await this.service.createNotification(body)
      return createSuccessResponse(notification, HTTP_STATUS.CREATED)
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(
          'INVALID_JSON',
          'Invalid JSON in request body',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async updateNotification(id: string, userId: string, request: NextRequest) {
    try {
      const body = (await request.json()) as UpdateNotificationDTO
      const notification = await this.service.updateNotification(
        id,
        userId,
        body,
      )
      return createSuccessResponse(notification)
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(
          'INVALID_JSON',
          'Invalid JSON in request body',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async markAsRead(id: string, userId: string) {
    try {
      const notification = await this.service.markAsRead(id, userId)
      return createSuccessResponse(notification)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async markMultipleAsRead(userId: string, request: NextRequest) {
    try {
      const body = (await request.json()) as MarkAsReadDTO

      if (!body.notificationIds || !Array.isArray(body.notificationIds)) {
        return createSuccessResponse(
          { error: 'notificationIds doit être un tableau' },
          HTTP_STATUS.BAD_REQUEST,
        )
      }

      const result = await this.service.markMultipleAsRead(
        body.notificationIds,
        userId,
      )
      return createSuccessResponse(result)
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(
          'INVALID_JSON',
          'Invalid JSON in request body',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        )
      }
      return handleApiError(error)
    }
  }

  async markAllAsRead(userId: string) {
    try {
      const result = await this.service.markAllAsRead(userId)
      return createSuccessResponse(result)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async deleteNotification(id: string, userId: string) {
    try {
      await this.service.deleteNotification(id, userId)
      return createSuccessResponse(
        { message: 'Notification supprimée avec succès' },
        HTTP_STATUS.OK,
      )
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getUnreadCount(userId: string) {
    try {
      const count = await this.service.getUnreadCount(userId)
      return createSuccessResponse({ count })
    } catch (error) {
      return handleApiError(error)
    }
  }
}
