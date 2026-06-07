import type { User } from '@prisma/client'

export type UserStats = {
  totalUsers: number
  activeUsers: number
  newUsersToday: number
  newUsersThisWeek: number
  newUsersThisMonth: number
  usersByRole: Record<string, number>
}

export type SystemStats = {
  totalApiCalls: number
  failedApiCalls: number
  averageResponseTime: number
  uptime: number
  errorRate: number
}

export type MrrStats = {
  mrr: number
  arr: number
  revenueThisMonth: number
  newSubscribersThisMonth: number
  churnedThisMonth: number
  activeSubscriptions: number
}

export type AdminDashboardStats = {
  users: UserStats
  system: SystemStats
  mrr: MrrStats
}

export type UserManagementFilters = {
  role?: string
  search?: string
  emailVerified?: boolean
  page?: number
  limit?: number
}

export type UserManagementResult = {
  users: User[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type UpdateUserRoleDTO = {
  userId: string
  role: string
}

export type SuspendUserDTO = {
  userId: string
}

export type DeleteUserDTO = {
  userId: string
}

export type AuditLogEntry = {
  id: string
  timestamp: Date
  userId: string
  userName: string
  action: string
  resource: string
  details: string | null
  ipAddress: string | null
  userAgent: string | null
}

export type AuditLogFilters = {
  userId?: string
  action?: string
  startDate?: Date
  endDate?: Date
  page?: number
  limit?: number
}

export type AuditLogResult = {
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}

import type { IMPERSONATION_ACTIONS } from '../impersonation/impersonation.constants'

export type AdminAction =
  | 'user_role_updated'
  | 'user_suspended'
  | 'user_activated'
  | 'user_deleted'
  | 'settings_updated'
  | 'system_config_changed'
  | (typeof IMPERSONATION_ACTIONS)[keyof typeof IMPERSONATION_ACTIONS]
