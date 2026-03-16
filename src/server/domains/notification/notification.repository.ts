import { db } from '@/server/lib/database'

import { NOTIFICATION_DEFAULTS } from './notification.constants'
import type {
  CreateNotificationDTO,
  NotificationEntity,
  NotificationFilters,
  UpdateNotificationDTO,
} from './notification.types'

export class NotificationRepository {
  async findById(id: string): Promise<NotificationEntity | null> {
    const notification = await db.notification.findUnique({
      where: { id },
    })

    return notification as NotificationEntity | null
  }

  async findByUserId(
    filters: NotificationFilters,
  ): Promise<NotificationEntity[]> {
    const limit = Math.min(
      filters.limit ?? NOTIFICATION_DEFAULTS.DEFAULT_LIMIT,
      NOTIFICATION_DEFAULTS.MAX_LIMIT,
    )
    const skip = filters.offset ?? 0

    const where = {
      userId: filters.userId,
      ...(filters.read !== undefined && { read: filters.read }),
      ...(filters.type && { type: filters.type }),
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    return notifications as NotificationEntity[]
  }

  async count(filters: NotificationFilters): Promise<number> {
    const where = {
      userId: filters.userId,
      ...(filters.read !== undefined && { read: filters.read }),
      ...(filters.type && { type: filters.type }),
    }

    return await db.notification.count({ where })
  }

  async countUnread(userId: string): Promise<number> {
    return await db.notification.count({
      where: {
        userId,
        read: false,
      },
    })
  }

  async create(data: CreateNotificationDTO): Promise<NotificationEntity> {
    const notification = await db.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        icon: data.icon,
        read: data.read ?? false,
      },
    })

    return notification as NotificationEntity
  }

  async update(
    id: string,
    data: UpdateNotificationDTO,
  ): Promise<NotificationEntity | null> {
    try {
      const notification = await db.notification.update({
        where: { id },
        data,
      })

      return notification as NotificationEntity
    } catch {
      return null
    }
  }

  async markAsRead(id: string): Promise<NotificationEntity | null> {
    try {
      const notification = await db.notification.update({
        where: { id },
        data: { read: true },
      })

      return notification as NotificationEntity
    } catch {
      return null
    }
  }

  async markMultipleAsRead(
    notificationIds: string[],
  ): Promise<{ count: number }> {
    const result = await db.notification.updateMany({
      where: {
        id: {
          in: notificationIds,
        },
      },
      data: {
        read: true,
      },
    })

    return { count: result.count }
  }

  async markAllAsReadForUser(userId: string): Promise<{ count: number }> {
    const result = await db.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    })

    return { count: result.count }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await db.notification.delete({
        where: { id },
      })
      return true
    } catch {
      return false
    }
  }

  async deleteMultiple(notificationIds: string[]): Promise<{ count: number }> {
    const result = await db.notification.deleteMany({
      where: {
        id: {
          in: notificationIds,
        },
      },
    })

    return { count: result.count }
  }

  async deleteAllForUser(userId: string): Promise<{ count: number }> {
    const result = await db.notification.deleteMany({
      where: { userId },
    })

    return { count: result.count }
  }

  async bulkCreate(
    notifications: CreateNotificationDTO[],
  ): Promise<NotificationEntity[]> {
    const created = await db.$transaction(
      notifications.map((notif) =>
        db.notification.create({
          data: {
            userId: notif.userId,
            type: notif.type,
            title: notif.title,
            description: notif.description,
            icon: notif.icon,
            read: notif.read ?? false,
          },
        }),
      ),
    )

    return created as NotificationEntity[]
  }

  async findAllAdmin(filters: {
    type?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
    offset?: number
  }): Promise<NotificationEntity[]> {
    const limit = Math.min(
      filters.limit ?? NOTIFICATION_DEFAULTS.DEFAULT_LIMIT,
      NOTIFICATION_DEFAULTS.MAX_LIMIT,
    )
    const skip = filters.offset ?? 0

    const where = {
      ...(filters.type && { type: filters.type }),
      ...(filters.dateFrom &&
        filters.dateTo && {
          createdAt: {
            gte: filters.dateFrom,
            lte: filters.dateTo,
          },
        }),
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })

    return notifications as NotificationEntity[]
  }

  async countAdmin(filters: {
    type?: string
    dateFrom?: Date
    dateTo?: Date
  }): Promise<number> {
    const where = {
      ...(filters.type && { type: filters.type }),
      ...(filters.dateFrom &&
        filters.dateTo && {
          createdAt: {
            gte: filters.dateFrom,
            lte: filters.dateTo,
          },
        }),
    }

    return await db.notification.count({ where })
  }

  async getStats(): Promise<{
    totalSent: number
    totalRead: number
    totalUnread: number
    byType: Record<string, number>
  }> {
    const [total, read, unread, byTypeRaw] = await Promise.all([
      db.notification.count(),
      db.notification.count({ where: { read: true } }),
      db.notification.count({ where: { read: false } }),
      db.notification.groupBy({
        by: ['type'],
        _count: { type: true },
      }),
    ])

    const byType: Record<string, number> = {}
    byTypeRaw.forEach((item) => {
      byType[item.type] = item._count.type
    })

    return {
      totalSent: total,
      totalRead: read,
      totalUnread: unread,
      byType,
    }
  }
}
