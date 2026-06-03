import type { CreateDTO, Entity, UpdateDTO } from '@/server/shared/types'

export type NotificationType =
  | 'security'
  | 'activity'
  | 'update'
  | 'marketing'
  | 'system'
  | 'custom'

export type Notification = {
  userId: string
  type: NotificationType
  title: string
  description: string
  icon: string
  read: boolean
}

export type NotificationEntity = Entity<Notification>
export type CreateNotificationDTO = CreateDTO<Notification>
export type UpdateNotificationDTO = UpdateDTO<Notification>

export type MarkAsReadDTO = {
  notificationIds: string[]
}

export type NotificationFilters = {
  userId: string
  read?: boolean
  type?: NotificationType
  limit?: number
  offset?: number
}

export type NotificationListResponse = {
  notifications: NotificationEntity[]
  total: number
  unreadCount: number
}

export type UserTargetingFilters = {
  subscriptionStatus?: 'active' | 'canceled' | 'trial' | 'all'
  subscriptionPlanName?: string
  userIds?: string[]
}

export type BulkNotificationDTO = {
  type: NotificationType
  title: string
  description: string
  icon?: string
  targeting: {
    sendToAll?: boolean
    filters?: UserTargetingFilters
  }
}

export type AdminNotificationFilters = {
  type?: NotificationType
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  offset?: number
}

export type NotificationStats = {
  totalSent: number
  totalRead: number
  totalUnread: number
  readRate: number
  byType: Record<NotificationType, number>
}
