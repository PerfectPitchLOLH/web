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
