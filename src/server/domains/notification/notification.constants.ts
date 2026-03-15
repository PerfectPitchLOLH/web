import type { NotificationType } from './notification.types'

export const NOTIFICATION_TYPES: Record<string, NotificationType> = {
  SECURITY: 'security',
  ACTIVITY: 'activity',
  UPDATE: 'update',
  MARKETING: 'marketing',
  SYSTEM: 'system',
  CUSTOM: 'custom',
} as const

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  security: 'Shield',
  activity: 'Activity',
  update: 'Sparkles',
  marketing: 'Mail',
  system: 'Bell',
  custom: 'Info',
} as const

export const NOTIFICATION_DEFAULTS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_ICON: 'Bell',
} as const
