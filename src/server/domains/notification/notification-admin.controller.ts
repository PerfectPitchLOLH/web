import { NextRequest } from 'next/server'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

import type { NotificationService } from './notification.service'
import type {
  AdminNotificationFilters,
  BulkNotificationDTO,
  UserTargetingFilters,
} from './notification.types'

export class NotificationAdminController {
  constructor(private service: NotificationService) {}

  async sendBulkNotification(request: NextRequest) {
    try {
      const body = (await request.json()) as BulkNotificationDTO
      const result = await this.service.sendBulkNotification(body)
      return createSuccessResponse(result, HTTP_STATUS.CREATED)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getTargetedUserCount(request: NextRequest) {
    try {
      const body = (await request.json()) as { filters: UserTargetingFilters }
      const count = await this.service.getTargetedUserCount(body.filters)
      return createSuccessResponse({ count })
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getAdminNotifications(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url)

      const filters: AdminNotificationFilters = {
        type: (searchParams.get('type') as any) || undefined,
        dateFrom: searchParams.get('dateFrom')
          ? new Date(searchParams.get('dateFrom')!)
          : undefined,
        dateTo: searchParams.get('dateTo')
          ? new Date(searchParams.get('dateTo')!)
          : undefined,
        limit: searchParams.get('limit')
          ? parseInt(searchParams.get('limit')!)
          : undefined,
        offset: searchParams.get('offset')
          ? parseInt(searchParams.get('offset')!)
          : undefined,
      }

      const result = await this.service.getAdminNotifications(filters)
      return createSuccessResponse(result)
    } catch (error) {
      return handleApiError(error)
    }
  }

  async getStats(request: NextRequest) {
    try {
      const stats = await this.service.getStats()
      return createSuccessResponse(stats)
    } catch (error) {
      return handleApiError(error)
    }
  }
}
