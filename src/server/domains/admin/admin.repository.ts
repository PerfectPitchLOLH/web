import type { User } from '@prisma/client'

import { db } from '@/server/lib/database'

import type {
  AdminAction,
  AuditLogEntry,
  AuditLogFilters,
  AuditLogResult,
  MrrStats,
  SystemStats,
  UserManagementFilters,
  UserManagementResult,
  UserStats,
} from './admin.types'

export class AdminRepository {
  async getUserStats(): Promise<UserStats> {
    try {
      const now = new Date()
      const startOfToday = new Date(now.setHours(0, 0, 0, 0))
      const startOfWeek = new Date(now.setDate(now.getDate() - 7))
      const startOfMonth = new Date(now.setDate(now.getDate() - 30))

      const [
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        usersByRoleData,
      ] = await Promise.all([
        db.user.count(),
        db.user.count({
          where: {
            emailVerified: { not: null },
          },
        }),
        db.user.count({
          where: {
            createdAt: { gte: startOfToday },
          },
        }),
        db.user.count({
          where: {
            createdAt: { gte: startOfWeek },
          },
        }),
        db.user.count({
          where: {
            createdAt: { gte: startOfMonth },
          },
        }),
        db.user.groupBy({
          by: ['role'],
          _count: { _all: true },
        }),
      ])

      const usersByRole = usersByRoleData.reduce(
        (acc, item) => {
          acc[item.role] = item._count._all
          return acc
        },
        {} as Record<string, number>,
      )

      return {
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        newUsersThisMonth,
        usersByRole,
      }
    } catch (error) {
      if (error instanceof Error) {
        const sensitivePatterns = ['/var', '/home', '/usr', 'postgres', 'mysql']
        const hasSensitiveInfo = sensitivePatterns.some((pattern) =>
          error.message.includes(pattern),
        )

        if (hasSensitiveInfo) {
          throw new Error('Failed to fetch user statistics')
        }

        throw error
      }
      throw new Error('Failed to fetch user statistics')
    }
  }

  async getSystemStats(): Promise<SystemStats> {
    return {
      totalApiCalls: 0,
      failedApiCalls: 0,
      averageResponseTime: 0,
      uptime: process.uptime(),
      errorRate: 0,
    }
  }

  async getUsersWithFilters(
    filters: UserManagementFilters,
  ): Promise<UserManagementResult> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 10
    const skip = (page - 1) * limit

    const where: any = {}

    if (filters.role) {
      where.role = filters.role
    }

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    if (filters.emailVerified !== undefined) {
      where.emailVerified = filters.emailVerified ? { not: null } : null
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where }),
    ])

    return {
      users,
      total,
      page,
      limit,
      totalPages: limit === 0 ? Infinity : Math.ceil(total / limit),
    }
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    return db.user.update({
      where: { id: userId },
      data: { role },
    })
  }

  async suspendUser(userId: string): Promise<User> {
    return db.user.update({
      where: { id: userId },
      data: {
        status: 'suspended',
        suspendedAt: new Date(),
      },
    })
  }

  async unsuspendUser(userId: string): Promise<User> {
    return db.user.update({
      where: { id: userId },
      data: {
        status: 'active',
        suspendedAt: null,
      },
    })
  }

  async deleteUser(userId: string): Promise<User> {
    return db.user.update({
      where: { id: userId },
      data: {
        status: 'deleted',
        deletedAt: new Date(),
      },
    })
  }

  async getUserById(userId: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id: userId },
    })
  }

  async getRootAdmin(): Promise<User | null> {
    return db.user.findFirst({
      where: {
        isRootAdmin: true,
        role: 'admin',
      },
    })
  }

  async createAuditLog(
    userId: string,
    userName: string,
    action: AdminAction,
    resource: string,
    details: string | null,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<void> {
    await db.auditLog.create({
      data: {
        userId,
        userName,
        action,
        resource,
        details,
        ipAddress,
        userAgent,
      },
    })
  }

  async getAuditLogs(filters: AuditLogFilters): Promise<AuditLogResult> {
    const page = filters.page ?? 1
    const limit = filters.limit ?? 20
    const skip = (page - 1) * limit

    const where: any = {}

    if (filters.userId) {
      where.userId = filters.userId
    }

    if (filters.action) {
      where.action = filters.action
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {}
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate
      }
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      db.auditLog.count({ where }),
    ])

    return {
      logs: logs as AuditLogEntry[],
      total,
      page,
      limit,
      totalPages: limit === 0 ? Infinity : Math.ceil(total / limit),
    }
  }

  async getMrrStats(): Promise<MrrStats> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      activeSubscriptions,
      newThisMonth,
      churnedThisMonth,
      invoicesThisMonth,
    ] = await Promise.all([
      db.subscription.findMany({
        where: { status: { in: ['active', 'trialing'] } },
        include: {
          plan: { select: { monthlyPrice: true, yearlyPrice: true } },
        },
      }),
      db.subscription.count({
        where: {
          status: { in: ['active', 'trialing'] },
          createdAt: { gte: startOfMonth },
        },
      }),
      db.subscription.count({
        where: {
          status: 'canceled',
          canceledAt: { gte: startOfMonth },
        },
      }),
      db.invoice.findMany({
        where: {
          status: 'paid',
          createdAt: { gte: startOfMonth },
        },
        select: { amount: true },
      }),
    ])

    const mrr = activeSubscriptions.reduce((sum, sub) => {
      const periodMonths = Math.round(
        (new Date(sub.currentPeriodEnd).getTime() -
          new Date(sub.currentPeriodStart).getTime()) /
          (1000 * 60 * 60 * 24 * 30),
      )
      const isYearly = periodMonths > 1
      const monthly = isYearly
        ? (sub.plan.yearlyPrice ?? sub.plan.monthlyPrice * 12) / 12
        : sub.plan.monthlyPrice
      return sum + monthly
    }, 0)

    const revenueThisMonth = invoicesThisMonth.reduce(
      (sum, inv) => sum + inv.amount,
      0,
    )

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      newSubscribersThisMonth: newThisMonth,
      churnedThisMonth,
      activeSubscriptions: activeSubscriptions.length,
    }
  }
}
