import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import {
  NOTIFICATION_DEFAULTS,
  NOTIFICATION_ICONS,
} from './notification.constants'
import type { NotificationRepository } from './notification.repository'
import type {
  CreateNotificationDTO,
  NotificationEntity,
  NotificationFilters,
  NotificationListResponse,
  UpdateNotificationDTO,
} from './notification.types'

export class NotificationService {
  constructor(private repository: NotificationRepository) {}

  async getNotifications(
    filters: NotificationFilters,
  ): Promise<NotificationListResponse> {
    const [notifications, total, unreadCount] = await Promise.all([
      this.repository.findByUserId(filters),
      this.repository.count(filters),
      this.repository.countUnread(filters.userId),
    ])

    return {
      notifications,
      total,
      unreadCount,
    }
  }

  async getNotificationById(
    id: string,
    userId: string,
  ): Promise<NotificationEntity> {
    const notification = await this.repository.findById(id)

    if (!notification) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Notification non trouvée',
      )
    }

    if (notification.userId !== userId) {
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.FORBIDDEN,
        'Accès non autorisé à cette notification',
      )
    }

    return notification
  }

  async createNotification(
    data: CreateNotificationDTO,
  ): Promise<NotificationEntity> {
    const icon =
      data.icon ||
      NOTIFICATION_ICONS[data.type] ||
      NOTIFICATION_DEFAULTS.DEFAULT_ICON

    const notification = await this.repository.create({
      ...data,
      icon,
      read: data.read ?? false,
    })

    return notification
  }

  async updateNotification(
    id: string,
    userId: string,
    data: UpdateNotificationDTO,
  ): Promise<NotificationEntity> {
    const notification = await this.getNotificationById(id, userId)

    const updated = await this.repository.update(String(notification.id), data)

    if (!updated) {
      throw new ApiError(
        'INTERNAL_ERROR',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Échec de la mise à jour de la notification',
      )
    }

    return updated
  }

  async markAsRead(id: string, userId: string): Promise<NotificationEntity> {
    const notification = await this.getNotificationById(id, userId)

    const updated = await this.repository.markAsRead(String(notification.id))

    if (!updated) {
      throw new ApiError(
        'INTERNAL_ERROR',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Échec de la mise à jour de la notification',
      )
    }

    return updated
  }

  async markMultipleAsRead(
    notificationIds: string[],
    userId: string,
  ): Promise<{ count: number }> {
    const notifications = await Promise.all(
      notificationIds.map((id) => this.repository.findById(id)),
    )

    const validNotifications = notifications.filter(
      (n) => n && n.userId === userId,
    )

    if (validNotifications.length === 0) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'Aucune notification valide trouvée',
      )
    }

    const validIds = validNotifications.map((n) => String(n!.id))
    return await this.repository.markMultipleAsRead(validIds)
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    return await this.repository.markAllAsReadForUser(userId)
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await this.getNotificationById(id, userId)

    const deleted = await this.repository.delete(id)

    if (!deleted) {
      throw new ApiError(
        'INTERNAL_ERROR',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Échec de la suppression de la notification',
      )
    }
  }

  async deleteNotificationAdmin(id: string): Promise<void> {
    const notification = await this.repository.findById(id)

    if (!notification) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Notification introuvable',
      )
    }

    const deleted = await this.repository.delete(id)

    if (!deleted) {
      throw new ApiError(
        'INTERNAL_ERROR',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'Échec de la suppression de la notification',
      )
    }
  }

  async deleteMultiple(
    notificationIds: string[],
    userId: string,
  ): Promise<{ count: number }> {
    const notifications = await Promise.all(
      notificationIds.map((id) => this.repository.findById(id)),
    )

    const validNotifications = notifications.filter(
      (n) => n && n.userId === userId,
    )

    if (validNotifications.length === 0) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'Aucune notification valide trouvée',
      )
    }

    const validIds = validNotifications.map((n) => String(n!.id))
    return await this.repository.deleteMultiple(validIds)
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.repository.countUnread(userId)
  }

  async sendBulkNotification(
    data: import('./notification.types').BulkNotificationDTO,
  ): Promise<{ count: number; notifications: NotificationEntity[] }> {
    const { db } = await import('@/server/lib/database')

    let userIds: string[] = []

    if (data.targeting.sendToAll) {
      const allUsers = await db.user.findMany({
        where: { status: 'active', deletedAt: null },
        select: { id: true },
      })
      userIds = allUsers.map((u) => u.id)
    } else if (data.targeting.filters) {
      const filters = data.targeting.filters

      const where: any = {
        status: 'active',
        deletedAt: null,
      }

      if (filters.userIds && filters.userIds.length > 0) {
        userIds = filters.userIds
      } else {
        if (
          filters.subscriptionStatus &&
          filters.subscriptionStatus !== 'all'
        ) {
          where.subscriptions = {
            some: {
              status: filters.subscriptionStatus,
            },
          }
        }

        if (filters.subscriptionPlanName) {
          where.subscriptions = {
            some: {
              ...(where.subscriptions?.some || {}),
              plan: {
                name: filters.subscriptionPlanName,
              },
            },
          }
        }

        const targetedUsers = await db.user.findMany({
          where,
          select: { id: true },
        })

        userIds = targetedUsers.map((u) => u.id)
      }
    }

    if (userIds.length === 0) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'Aucun utilisateur correspondant aux filtres',
      )
    }

    const icon =
      data.icon ||
      NOTIFICATION_ICONS[data.type] ||
      NOTIFICATION_DEFAULTS.DEFAULT_ICON

    const notifications = userIds.map((userId) => ({
      userId,
      type: data.type,
      title: data.title,
      description: data.description,
      icon,
      read: false,
    }))

    const created = await this.repository.bulkCreate(notifications)

    return {
      count: created.length,
      notifications: created,
    }
  }

  async getTargetedUserCount(
    filters: import('./notification.types').UserTargetingFilters,
  ): Promise<number> {
    const { db } = await import('@/server/lib/database')

    const where: any = {
      status: 'active',
      deletedAt: null,
    }

    if (filters.userIds && filters.userIds.length > 0) {
      return filters.userIds.length
    }

    if (filters.subscriptionStatus && filters.subscriptionStatus !== 'all') {
      where.subscriptions = {
        some: {
          status: filters.subscriptionStatus,
        },
      }
    }

    if (filters.subscriptionPlanName) {
      where.subscriptions = {
        some: {
          ...(where.subscriptions?.some || {}),
          plan: {
            name: filters.subscriptionPlanName,
          },
        },
      }
    }

    return await db.user.count({ where })
  }

  async getAdminNotifications(
    filters: import('./notification.types').AdminNotificationFilters,
  ): Promise<{ notifications: NotificationEntity[]; total: number }> {
    const [notifications, total] = await Promise.all([
      this.repository.findAllAdmin(filters),
      this.repository.countAdmin(filters),
    ])

    return { notifications, total }
  }

  async getStats(): Promise<import('./notification.types').NotificationStats> {
    const stats = await this.repository.getStats()

    const readRate =
      stats.totalSent > 0 ? (stats.totalRead / stats.totalSent) * 100 : 0

    return {
      ...stats,
      readRate: Math.round(readRate * 100) / 100,
      byType: stats.byType as Record<
        import('./notification.types').NotificationType,
        number
      >,
    }
  }
}
