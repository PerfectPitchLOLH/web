import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { AdminRepository } from '../admin.repository'
import { AdminService } from '../admin.service'
import { createMockUser } from './test-utils'

describe('AdminService', () => {
  let adminService: AdminService
  let mockRepository: AdminRepository

  beforeEach(() => {
    mockRepository = {
      getUserStats: vi.fn(),
      getSystemStats: vi.fn(),
      getMrrStats: vi.fn(),
      getUsersWithFilters: vi.fn(),
      getUserById: vi.fn(),
      getRootAdmin: vi.fn(),
      updateUserRole: vi.fn(),
      createAuditLog: vi.fn(),
      getAuditLogs: vi.fn(),
    } as any

    adminService = new AdminService(mockRepository)
    vi.clearAllMocks()
  })

  describe('getDashboardStats', () => {
    it('should return dashboard stats with users and system data', async () => {
      const mockUserStats = {
        totalUsers: 100,
        activeUsers: 80,
        newUsersToday: 5,
        newUsersThisWeek: 15,
        newUsersThisMonth: 25,
        usersByRole: {
          admin: 10,
          user: 90,
        },
      }

      const mockSystemStats = {
        totalApiCalls: 1000,
        failedApiCalls: 10,
        averageResponseTime: 150,
        uptime: 3600,
        errorRate: 1.0,
      }

      const mockMrrStats = {
        mrr: 1000,
        arr: 12000,
        revenueThisMonth: 1000,
        newSubscribersThisMonth: 10,
        churnedThisMonth: 2,
        activeSubscriptions: 50,
      }

      vi.mocked(mockRepository.getUserStats).mockResolvedValue(mockUserStats)
      vi.mocked(mockRepository.getSystemStats).mockResolvedValue(
        mockSystemStats,
      )
      vi.mocked(mockRepository.getMrrStats).mockResolvedValue(mockMrrStats)

      const result = await adminService.getDashboardStats()

      expect(result).toEqual({
        users: mockUserStats,
        system: mockSystemStats,
        mrr: mockMrrStats,
      })
      expect(mockRepository.getUserStats).toHaveBeenCalledTimes(1)
      expect(mockRepository.getSystemStats).toHaveBeenCalledTimes(1)
      expect(mockRepository.getMrrStats).toHaveBeenCalledTimes(1)
    })

    it('should call both getUserStats and getSystemStats in parallel', async () => {
      const mockUserStats = {
        totalUsers: 50,
        activeUsers: 40,
        newUsersToday: 2,
        newUsersThisWeek: 8,
        newUsersThisMonth: 12,
        usersByRole: { admin: 5, user: 45 },
      }

      const mockSystemStats = {
        totalApiCalls: 500,
        failedApiCalls: 5,
        averageResponseTime: 100,
        uptime: 1800,
        errorRate: 1.0,
      }

      const mockMrrStats = {
        mrr: 500,
        arr: 6000,
        revenueThisMonth: 500,
        newSubscribersThisMonth: 5,
        churnedThisMonth: 1,
        activeSubscriptions: 25,
      }

      vi.mocked(mockRepository.getUserStats).mockResolvedValue(mockUserStats)
      vi.mocked(mockRepository.getSystemStats).mockResolvedValue(
        mockSystemStats,
      )
      vi.mocked(mockRepository.getMrrStats).mockResolvedValue(mockMrrStats)

      await adminService.getDashboardStats()

      expect(mockRepository.getUserStats).toHaveBeenCalled()
      expect(mockRepository.getSystemStats).toHaveBeenCalled()
      expect(mockRepository.getMrrStats).toHaveBeenCalled()
    })
  })

  describe('getUsers', () => {
    it('should return users with filters applied', async () => {
      const mockResult = {
        users: [
          createMockUser({
            id: '1',
            email: 'user@test.com',
            name: 'Test User',
          }),
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      }

      vi.mocked(mockRepository.getUsersWithFilters).mockResolvedValue(
        mockResult,
      )

      const filters = { role: 'user', page: 1, limit: 10 }
      const result = await adminService.getUsers(filters)

      expect(result).toEqual(mockResult)
      expect(mockRepository.getUsersWithFilters).toHaveBeenCalledWith(filters)
    })
  })

  describe('updateUserRole', () => {
    const mockUser = createMockUser({
      id: 'user123',
      email: 'user@test.com',
      name: 'Test User',
    })

    it('should update user role successfully', async () => {
      const mockAdmin = createMockUser({
        id: 'admin123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.updateUserRole).mockResolvedValue({
        ...mockUser,
        role: 'admin',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      const data = { userId: 'user123', role: 'admin' }
      await adminService.updateUserRole(
        data,
        'admin123',
        'Admin User',
        '127.0.0.1',
        'Mozilla/5.0',
      )

      expect(mockRepository.getUserById).toHaveBeenCalledWith('user123')
      expect(mockRepository.getUserById).toHaveBeenCalledWith('admin123')
      expect(mockRepository.updateUserRole).toHaveBeenCalledWith(
        'user123',
        'admin',
      )
      expect(mockRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'user_role_updated',
        'user:user123',
        'Role changed from user to admin',
        '127.0.0.1',
        'Mozilla/5.0',
      )
    })

    it('should throw NOT_FOUND error if user does not exist', async () => {
      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      const data = { userId: 'nonexistent', role: 'admin' }

      await expect(
        adminService.updateUserRole(
          data,
          'admin123',
          'Admin User',
          '127.0.0.1',
          null,
        ),
      ).rejects.toThrow(ApiError)

      try {
        await adminService.updateUserRole(
          data,
          'admin123',
          'Admin User',
          '127.0.0.1',
          null,
        )
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('NOT_FOUND')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
        expect((error as ApiError).message).toBe('User not found')
      }
    })

    it('should throw FORBIDDEN error if admin tries to change own role', async () => {
      const mockAdminUser = createMockUser({
        id: 'user123',
        email: 'user@test.com',
        name: 'Test User',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById).mockResolvedValue(mockAdminUser)

      const data = { userId: 'user123', role: 'admin' }

      try {
        await adminService.updateUserRole(
          data,
          'user123',
          'Test User',
          '127.0.0.1',
          null,
        )
        throw new Error('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('FORBIDDEN')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.FORBIDDEN)
        expect((error as ApiError).message).toBe('Cannot change your own role')
      }
    })

    it('should create audit log after successful role update', async () => {
      const mockAdmin = createMockUser({
        id: 'admin123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.updateUserRole).mockResolvedValue({
        ...mockUser,
        role: 'admin',
        isRootAdmin: false,
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      const data = { userId: 'user123', role: 'admin' }
      await adminService.updateUserRole(
        data,
        'admin123',
        'Admin User',
        '192.168.1.1',
        'Chrome',
      )

      expect(mockRepository.createAuditLog).toHaveBeenCalledTimes(1)
      expect(mockRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'user_role_updated',
        'user:user123',
        expect.stringContaining('Role changed from user to admin'),
        '192.168.1.1',
        'Chrome',
      )
    })

    it('should prevent invited admin from changing root admin role', async () => {
      const mockRootAdmin = createMockUser({
        id: 'root123',
        email: 'root@test.com',
        name: 'Root Admin',
        role: 'admin',
        isRootAdmin: true,
      })

      const mockInvitedAdmin = createMockUser({
        id: 'invited123',
        email: 'invited@test.com',
        name: 'Invited Admin',
        role: 'admin',
        isRootAdmin: false,
      })

      vi.mocked(mockRepository.getUserById)
        .mockImplementationOnce((id: string) =>
          Promise.resolve(id === 'root123' ? mockRootAdmin : mockInvitedAdmin),
        )
        .mockImplementationOnce((id: string) =>
          Promise.resolve(
            id === 'invited123' ? mockInvitedAdmin : mockRootAdmin,
          ),
        )

      const data = { userId: 'root123', role: 'user' }

      try {
        await adminService.updateUserRole(
          data,
          'invited123',
          'Invited Admin',
          '127.0.0.1',
          null,
        )
        throw new Error('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('FORBIDDEN')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.FORBIDDEN)
        expect((error as ApiError).message).toBe(
          'Only root admin can change root admin role',
        )
      }
    })

    it('should allow root admin to change invited admin role', async () => {
      const mockInvitedAdmin = createMockUser({
        id: 'invited123',
        email: 'invited@test.com',
        name: 'Invited Admin',
        role: 'admin',
        isRootAdmin: false,
      })

      const mockRootAdmin = createMockUser({
        id: 'root123',
        email: 'root@test.com',
        name: 'Root Admin',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockInvitedAdmin)
        .mockResolvedValueOnce(mockRootAdmin)
      vi.mocked(mockRepository.updateUserRole).mockResolvedValue({
        ...mockInvitedAdmin,
        role: 'user',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      const data = { userId: 'invited123', role: 'user' }
      await adminService.updateUserRole(
        data,
        'root123',
        'Root Admin',
        '127.0.0.1',
        'Mozilla/5.0',
      )

      expect(mockRepository.updateUserRole).toHaveBeenCalledWith(
        'invited123',
        'user',
      )
      expect(mockRepository.createAuditLog).toHaveBeenCalledTimes(1)
    })

    it('should prevent invited admin from changing other admin roles', async () => {
      const mockTargetAdmin = createMockUser({
        id: 'target123',
        email: 'target@test.com',
        name: 'Target Admin',
        role: 'admin',
        isRootAdmin: false,
      })

      const mockInvitedAdmin = createMockUser({
        id: 'invited123',
        email: 'invited@test.com',
        name: 'Invited Admin',
        role: 'admin',
        isRootAdmin: false,
      })

      vi.mocked(mockRepository.getUserById)
        .mockImplementationOnce((id: string) =>
          Promise.resolve(
            id === 'target123' ? mockTargetAdmin : mockInvitedAdmin,
          ),
        )
        .mockImplementationOnce((id: string) =>
          Promise.resolve(
            id === 'invited123' ? mockInvitedAdmin : mockTargetAdmin,
          ),
        )

      const data = { userId: 'target123', role: 'user' }

      try {
        await adminService.updateUserRole(
          data,
          'invited123',
          'Invited Admin',
          '127.0.0.1',
          null,
        )
        throw new Error('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('FORBIDDEN')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.FORBIDDEN)
        expect((error as ApiError).message).toBe(
          'Only root admin can change admin roles',
        )
      }
    })

    it('should throw NOT_FOUND error if admin does not exist', async () => {
      vi.mocked(mockRepository.getUserById)
        .mockImplementationOnce((id: string) =>
          Promise.resolve(id === 'user123' ? mockUser : null),
        )
        .mockImplementationOnce((id: string) =>
          Promise.resolve(id === 'nonexistent' ? null : mockUser),
        )

      const data = { userId: 'user123', role: 'admin' }

      try {
        await adminService.updateUserRole(
          data,
          'nonexistent',
          'Nonexistent Admin',
          '127.0.0.1',
          null,
        )
        throw new Error('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('NOT_FOUND')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
        expect((error as ApiError).message).toBe('Admin not found')
      }
    })
  })

  describe('getAuditLogs', () => {
    it('should return audit logs with filters', async () => {
      const mockLogs = {
        logs: [
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
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }

      vi.mocked(mockRepository.getAuditLogs).mockResolvedValue(mockLogs)

      const filters = { userId: '1', page: 1, limit: 20 }
      const result = await adminService.getAuditLogs(filters)

      expect(result).toEqual(mockLogs)
      expect(mockRepository.getAuditLogs).toHaveBeenCalledWith(filters)
    })
  })

  describe('logAdminAction', () => {
    it('should create audit log for admin action', async () => {
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await adminService.logAdminAction(
        'admin123',
        'Admin User',
        'user_role_updated',
        'user:user123',
        'Role changed',
        '127.0.0.1',
        'Mozilla/5.0',
      )

      expect(mockRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'user_role_updated',
        'user:user123',
        'Role changed',
        '127.0.0.1',
        'Mozilla/5.0',
      )
    })

    it('should handle null IP and user agent', async () => {
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await adminService.logAdminAction(
        'admin123',
        'Admin User',
        'settings_updated',
        'settings:global',
        null,
        null,
        null,
      )

      expect(mockRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'settings_updated',
        'settings:global',
        null,
        null,
        null,
      )
    })
  })
})
