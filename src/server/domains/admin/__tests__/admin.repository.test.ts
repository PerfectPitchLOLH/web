import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import { AdminRepository } from '../admin.repository'
import { createMockUser } from './test-utils'

vi.mock('@/server/lib/database', () => ({
  db: {
    user: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('AdminRepository', () => {
  let repository: AdminRepository

  beforeEach(() => {
    repository = new AdminRepository()
    vi.clearAllMocks()
  })

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      vi.mocked(db.user.count)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(25)

      vi.mocked(db.user.groupBy).mockResolvedValue([
        { role: 'admin', _count: { _all: 10 } },
        { role: 'user', _count: { _all: 90 } },
      ] as any)

      const result = await repository.getUserStats()

      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 80,
        newUsersToday: 5,
        newUsersThisWeek: 15,
        newUsersThisMonth: 25,
        usersByRole: {
          admin: 10,
          user: 90,
        },
      })
      expect(db.user.count).toHaveBeenCalledTimes(5)
      expect(db.user.groupBy).toHaveBeenCalledWith({
        by: ['role'],
        _count: true,
      })
    })
  })

  describe('getSystemStats', () => {
    it('should return system statistics', async () => {
      const result = await repository.getSystemStats()

      expect(result).toEqual({
        totalApiCalls: 0,
        failedApiCalls: 0,
        averageResponseTime: 0,
        uptime: expect.any(Number),
        errorRate: 0,
      })
      expect(result.uptime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getUsersWithFilters', () => {
    const mockUsers = [
      createMockUser({
        id: '1',
        email: 'user1@test.com',
        name: 'User 1',
        role: 'user',
      }),
      createMockUser({
        id: '2',
        email: 'user2@test.com',
        name: 'User 2',
        role: 'admin',
      }),
    ]

    it('should return users with pagination', async () => {
      vi.mocked(db.user.findMany).mockResolvedValue(mockUsers)
      vi.mocked(db.user.count).mockResolvedValue(2)

      const result = await repository.getUsersWithFilters({
        page: 1,
        limit: 10,
      })

      expect(result).toEqual({
        users: mockUsers,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
      expect(db.user.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should filter users by role', async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([mockUsers[1]])
      vi.mocked(db.user.count).mockResolvedValue(1)

      const result = await repository.getUsersWithFilters({
        role: 'admin',
        page: 1,
        limit: 10,
      })

      expect(result.users).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { role: 'admin' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should filter users by search term', async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([mockUsers[0]])
      vi.mocked(db.user.count).mockResolvedValue(1)

      await repository.getUsersWithFilters({
        search: 'user1',
        page: 1,
        limit: 10,
      })

      expect(db.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { contains: 'user1', mode: 'insensitive' } },
            { name: { contains: 'user1', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should filter users by email verified status', async () => {
      vi.mocked(db.user.findMany).mockResolvedValue(mockUsers)
      vi.mocked(db.user.count).mockResolvedValue(2)

      await repository.getUsersWithFilters({
        emailVerified: true,
        page: 1,
        limit: 10,
      })

      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { emailVerified: { not: null } },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = createMockUser({
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
      })

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)

      const result = await repository.getUserById('1')

      expect(result).toEqual(mockUser)
      expect(result?.isRootAdmin).toBe(false)
      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      })
    })

    it('should return null if user not found', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const result = await repository.getUserById('nonexistent')

      expect(result).toBeNull()
    })

    it('should return user with isRootAdmin field', async () => {
      const mockRootAdmin = createMockUser({
        id: 'root123',
        email: 'root@test.com',
        name: 'Root Admin',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findUnique).mockResolvedValue(mockRootAdmin)

      const result = await repository.getUserById('root123')

      expect(result).toEqual(mockRootAdmin)
      expect(result?.isRootAdmin).toBe(true)
    })
  })

  describe('getRootAdmin', () => {
    it('should return root admin user', async () => {
      const mockRootAdmin = createMockUser({
        id: 'root123',
        email: 'root@test.com',
        name: 'Root Admin',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findFirst).mockResolvedValue(mockRootAdmin)

      const result = await repository.getRootAdmin()

      expect(result).toEqual(mockRootAdmin)
      expect(result?.isRootAdmin).toBe(true)
      expect(db.user.findFirst).toHaveBeenCalledWith({
        where: {
          isRootAdmin: true,
          role: 'admin',
        },
      })
    })

    it('should return null if no root admin exists', async () => {
      vi.mocked(db.user.findFirst).mockResolvedValue(null)

      const result = await repository.getRootAdmin()

      expect(result).toBeNull()
      expect(db.user.findFirst).toHaveBeenCalledWith({
        where: {
          isRootAdmin: true,
          role: 'admin',
        },
      })
    })

    it('should query with both isRootAdmin and role filters', async () => {
      vi.mocked(db.user.findFirst).mockResolvedValue(null)

      await repository.getRootAdmin()

      expect(db.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isRootAdmin: true,
            role: 'admin',
          }),
        }),
      )
    })
  })

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      const mockUpdatedUser = createMockUser({
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'admin',
      })

      vi.mocked(db.user.update).mockResolvedValue(mockUpdatedUser)

      const result = await repository.updateUserRole('1', 'admin')

      expect(result).toEqual(mockUpdatedUser)
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { role: 'admin' },
      })
    })
  })

  describe('createAuditLog', () => {
    it('should create audit log entry', async () => {
      const logData = {
        userId: '1',
        userName: 'Admin User',
        action: 'user_role_updated' as const,
        resource: 'user:2',
        details: 'Role changed from user to admin',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      }

      vi.mocked(db.auditLog.create).mockResolvedValue({
        id: 'log1',
        timestamp: new Date(),
        ...logData,
      })

      await repository.createAuditLog(
        logData.userId,
        logData.userName,
        logData.action,
        logData.resource,
        logData.details,
        logData.ipAddress,
        logData.userAgent,
      )

      expect(db.auditLog.create).toHaveBeenCalledWith({
        data: logData,
      })
    })
  })

  describe('getAuditLogs', () => {
    const mockLogs = [
      {
        id: '1',
        userId: '1',
        userName: 'Admin',
        action: 'user_role_updated',
        resource: 'user:2',
        details: 'Role updated',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        timestamp: new Date(),
      },
    ]

    it('should return audit logs with pagination', async () => {
      vi.mocked(db.auditLog.findMany).mockResolvedValue(mockLogs)
      vi.mocked(db.auditLog.count).mockResolvedValue(1)

      const result = await repository.getAuditLogs({
        page: 1,
        limit: 20,
      })

      expect(result).toEqual({
        logs: mockLogs,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      })
      expect(db.auditLog.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { timestamp: 'desc' },
      })
    })

    it('should filter audit logs by userId', async () => {
      vi.mocked(db.auditLog.findMany).mockResolvedValue(mockLogs)
      vi.mocked(db.auditLog.count).mockResolvedValue(1)

      await repository.getAuditLogs({
        userId: '1',
        page: 1,
        limit: 20,
      })

      expect(db.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: '1' },
        skip: 0,
        take: 20,
        orderBy: { timestamp: 'desc' },
      })
    })

    it('should filter audit logs by action', async () => {
      vi.mocked(db.auditLog.findMany).mockResolvedValue(mockLogs)
      vi.mocked(db.auditLog.count).mockResolvedValue(1)

      await repository.getAuditLogs({
        action: 'user_role_updated',
        page: 1,
        limit: 20,
      })

      expect(db.auditLog.findMany).toHaveBeenCalledWith({
        where: { action: 'user_role_updated' },
        skip: 0,
        take: 20,
        orderBy: { timestamp: 'desc' },
      })
    })

    it('should filter audit logs by date range', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')

      vi.mocked(db.auditLog.findMany).mockResolvedValue(mockLogs)
      vi.mocked(db.auditLog.count).mockResolvedValue(1)

      await repository.getAuditLogs({
        startDate,
        endDate,
        page: 1,
        limit: 20,
      })

      expect(db.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
        skip: 0,
        take: 20,
        orderBy: { timestamp: 'desc' },
      })
    })
  })
})
