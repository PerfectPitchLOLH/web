import { NextRequest, type NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { requireAdminAuth } from '@/server/shared/middleware/auth.middleware'
import { ApiError } from '@/server/shared/utils/api.utils'

import { AdminController } from '../admin.controller'
import { AdminService } from '../admin.service'

vi.mock('@/server/shared/middleware/auth.middleware', () => ({
  requireAdminAuth: vi.fn(),
}))

describe('AdminController - Deep Tests', () => {
  let controller: AdminController
  let mockService: AdminService

  const createMockRequest = (
    url: string,
    method: string,
    body?: any,
    headers?: Record<string, string>,
  ): NextRequest => {
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Test-Agent/1.0',
    }

    if (!headers || !headers['X-Real-IP']) {
      defaultHeaders['X-Forwarded-For'] = '127.0.0.1'
    }

    return new NextRequest(url, {
      method,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  const mockAdminSession = {
    user: {
      id: 'admin123',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'admin' as const,
    },
  }

  beforeEach(() => {
    mockService = {
      getDashboardStats: vi.fn(),
      getUsers: vi.fn(),
      updateUserRole: vi.fn(),
      suspendUser: vi.fn(),
      deleteUser: vi.fn(),
      getAuditLogs: vi.fn(),
      logAdminAction: vi.fn(),
    } as any

    controller = new AdminController(mockService)
    vi.clearAllMocks()
    vi.mocked(requireAdminAuth).mockResolvedValue(mockAdminSession as any)
  })

  describe('getDashboardStats', () => {
    describe('Authorization', () => {
      it('should allow admin to get dashboard stats', async () => {
        const mockStats = {
          users: {
            totalUsers: 100,
            activeUsers: 80,
            newUsersToday: 5,
            newUsersThisWeek: 15,
            newUsersThisMonth: 25,
            usersByRole: { admin: 10, user: 90 },
          },
          system: {
            totalApiCalls: 1000,
            failedApiCalls: 10,
            averageResponseTime: 150,
            uptime: 3600,
            errorRate: 0.01,
          },
          mrr: {
            mrr: 0,
            arr: 0,
            revenueThisMonth: 0,
            newSubscribersThisMonth: 0,
            activeSubscriptions: 0,
            churnedThisMonth: 0,
          },
        }

        vi.mocked(mockService.getDashboardStats).mockResolvedValue(mockStats)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/stats',
          'GET',
        )

        const response = await controller.getDashboardStats(request)
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(data.success).toBe(true)
        expect(data.data).toEqual(mockStats)
      })

      it('should reject non-admin user', async () => {
        vi.mocked(requireAdminAuth).mockRejectedValue(
          new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/stats',
          'GET',
        )

        const response = await controller.getDashboardStats(request)
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('FORBIDDEN')
        expect(mockService.getDashboardStats).not.toHaveBeenCalled()
      })

      it('should handle missing authentication', async () => {
        vi.mocked(requireAdminAuth).mockRejectedValue(
          new ApiError('UNAUTHORIZED', HTTP_STATUS.UNAUTHORIZED),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/stats',
          'GET',
        )

        const response = await controller.getDashboardStats(request)

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
        expect(mockService.getDashboardStats).not.toHaveBeenCalled()
      })
    })

    describe('Edge Cases - IP Address Extraction', () => {
      const roleChangeBody = { userId: 'user123', role: 'admin' }

      const expectIpForwardedToService = (
        ip: string | null,
        userAgent: unknown = expect.any(String),
      ) =>
        expect(mockService.updateUserRole).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(String),
          expect.any(String),
          ip,
          userAgent,
        )

      beforeEach(() => {
        vi.mocked(mockService.updateUserRole).mockResolvedValue(undefined)
      })

      it('should extract first IP from X-Forwarded-For header', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          roleChangeBody,
          { 'X-Forwarded-For': '192.168.1.1, 10.0.0.1' },
        )

        await controller.updateUserRole(request)

        expectIpForwardedToService('192.168.1.1')
      })

      it('should extract IP from X-Real-IP header', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          roleChangeBody,
          { 'X-Real-IP': '172.16.0.1' },
        )

        await controller.updateUserRole(request)

        expectIpForwardedToService('172.16.0.1')
      })

      it('should pass null when no IP headers are present', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/users/role',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(roleChangeBody),
          },
        )

        await controller.updateUserRole(request)

        expectIpForwardedToService(null, null)
      })
    })

    describe('Service Errors', () => {
      it('should handle service throwing error', async () => {
        vi.mocked(mockService.getDashboardStats).mockRejectedValue(
          new Error('Database connection failed'),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/stats',
          'GET',
        )

        const response = await controller.getDashboardStats(request)

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      })

      it('should handle service throwing ApiError', async () => {
        vi.mocked(mockService.getDashboardStats).mockRejectedValue(
          new ApiError(
            'SERVICE_UNAVAILABLE',
            HTTP_STATUS.SERVICE_UNAVAILABLE,
            'Stats service unavailable',
          ),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/stats',
          'GET',
        )

        const response = await controller.getDashboardStats(request)

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE)
      })
    })
  })

  describe('getUsers', () => {
    describe('Query Parameter Parsing', () => {
      it('should parse all filters correctly', async () => {
        const mockResult = {
          users: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }

        vi.mocked(mockService.getUsers).mockResolvedValue(mockResult)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users?role=admin&search=test&emailVerified=true&page=2&limit=20',
          'GET',
        )

        await controller.getUsers(request)

        expect(mockService.getUsers).toHaveBeenCalledWith({
          role: 'admin',
          search: 'test',
          emailVerified: true,
          page: 2,
          limit: 20,
        })
      })

      it('should handle missing query parameters', async () => {
        const mockResult = {
          users: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }

        vi.mocked(mockService.getUsers).mockResolvedValue(mockResult)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users',
          'GET',
        )

        await controller.getUsers(request)

        expect(mockService.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
            limit: 10,
          }),
        )
      })

      it('should handle special characters in search', async () => {
        const mockResult = {
          users: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }

        vi.mocked(mockService.getUsers).mockResolvedValue(mockResult)

        const searchTerm = encodeURIComponent("test'; DROP TABLE users; --")

        const request = createMockRequest(
          `http://localhost:3000/api/admin/users?search=${searchTerm}`,
          'GET',
        )

        await controller.getUsers(request)

        expect(mockService.getUsers).toHaveBeenCalled()
      })

      it('should handle Unicode in search query', async () => {
        const mockResult = {
          users: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }

        vi.mocked(mockService.getUsers).mockResolvedValue(mockResult)

        const searchTerm = encodeURIComponent('测试 🚀 José')

        const request = createMockRequest(
          `http://localhost:3000/api/admin/users?search=${searchTerm}`,
          'GET',
        )

        await controller.getUsers(request)

        expect(mockService.getUsers).toHaveBeenCalled()
      })

      it('should handle invalid page number', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users?page=-1',
          'GET',
        )

        const response = await controller.getUsers(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })

      it('should handle invalid limit', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users?limit=1000',
          'GET',
        )

        const response = await controller.getUsers(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })

      it('should handle emailVerified=false', async () => {
        const mockResult = {
          users: [],
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        }

        vi.mocked(mockService.getUsers).mockResolvedValue(mockResult)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users?emailVerified=false',
          'GET',
        )

        await controller.getUsers(request)

        expect(mockService.getUsers).toHaveBeenCalledWith(
          expect.objectContaining({
            emailVerified: false,
          }),
        )
      })
    })

    describe('Authorization', () => {
      it('should reject non-admin user', async () => {
        vi.mocked(requireAdminAuth).mockRejectedValue(
          new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users',
          'GET',
        )

        const response = await controller.getUsers(request)

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
        expect(mockService.getUsers).not.toHaveBeenCalled()
      })
    })
  })

  describe('updateUserRole', () => {
    describe('Success Cases', () => {
      it('should update user role successfully', async () => {
        vi.mocked(mockService.updateUserRole).mockResolvedValue(undefined)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          {
            userId: 'user123',
            role: 'admin',
          },
        )

        const response = await controller.updateUserRole(request)
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(data.success).toBe(true)
        expect(data.data.message).toBe('User role updated successfully')
      })

      it('should pass correct parameters to service', async () => {
        vi.mocked(mockService.updateUserRole).mockResolvedValue(undefined)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          {
            userId: 'user123',
            role: 'admin',
          },
          {
            'User-Agent': 'Mozilla/5.0',
            'X-Forwarded-For': '192.168.1.1',
          },
        )

        await controller.updateUserRole(request)

        expect(mockService.updateUserRole).toHaveBeenCalledWith(
          { userId: 'user123', role: 'admin' },
          'admin123',
          'Admin User',
          '192.168.1.1',
          'Mozilla/5.0',
        )
      })
    })

    describe('Validation Errors', () => {
      it('should reject empty userId', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          {
            userId: '',
            role: 'admin',
          },
        )

        const response = await controller.updateUserRole(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
        expect(mockService.updateUserRole).not.toHaveBeenCalled()
      })

      it('should reject invalid role', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          {
            userId: 'user123',
            role: 'superadmin',
          },
        )

        const response = await controller.updateUserRole(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })

      it('should handle missing userId', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          {
            role: 'admin',
          },
        )

        const response = await controller.updateUserRole(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })

      it('should handle missing role', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          {
            userId: 'user123',
          },
        )

        const response = await controller.updateUserRole(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })
    })

    describe('Edge Cases - Request Body', () => {
      it('should handle malformed JSON', async () => {
        const request = new NextRequest(
          'http://localhost:3000/api/admin/users/role',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{invalid json',
          },
        )

        const response = await controller.updateUserRole(request)

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      })

      it('should handle empty request body', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          null,
        )

        const response = await controller.updateUserRole(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })

      it('should handle very large userId', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          {
            userId: 'a'.repeat(10000),
            role: 'admin',
          },
        )

        const response = await controller.updateUserRole(request)

        expect([200, 400, 413]).toContain(response.status)
      })

      it('should handle SQL injection in userId', async () => {
        vi.mocked(mockService.updateUserRole).mockRejectedValue(
          new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found'),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          {
            userId: "'; DROP TABLE users; --",
            role: 'admin',
          },
        )

        const response = await controller.updateUserRole(request)

        expect([400, 404]).toContain(response.status)
      })
    })

    describe('Authorization', () => {
      it('should reject non-admin user', async () => {
        vi.mocked(requireAdminAuth).mockRejectedValue(
          new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          {
            userId: 'user123',
            role: 'admin',
          },
        )

        const response = await controller.updateUserRole(request)

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
        expect(mockService.updateUserRole).not.toHaveBeenCalled()
      })
    })

    describe('Service Errors', () => {
      it('should handle user not found', async () => {
        vi.mocked(mockService.updateUserRole).mockRejectedValue(
          new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found'),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          {
            userId: 'nonexistent',
            role: 'admin',
          },
        )

        const response = await controller.updateUserRole(request)
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
        expect(data.success).toBe(false)
      })

      it('should handle forbidden action', async () => {
        vi.mocked(mockService.updateUserRole).mockRejectedValue(
          new ApiError(
            'FORBIDDEN',
            HTTP_STATUS.FORBIDDEN,
            'Cannot change your own role',
          ),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          {
            userId: 'admin123',
            role: 'user',
          },
        )

        const response = await controller.updateUserRole(request)

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
      })
    })
  })

  describe('suspendUser', () => {
    describe('Success Cases', () => {
      it('should suspend user successfully', async () => {
        vi.mocked(mockService.suspendUser).mockResolvedValue(undefined)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/suspend',
          'POST',
          {
            userId: 'user123',
          },
        )

        const response = await controller.suspendUser(request)
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(data.success).toBe(true)
        expect(data.data.message).toBe(
          'User suspension status updated successfully',
        )
      })
    })

    describe('Validation Errors', () => {
      it('should reject empty userId', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/suspend',
          'POST',
          {
            userId: '',
          },
        )

        const response = await controller.suspendUser(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })

      it('should reject missing userId', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/suspend',
          'POST',
          {},
        )

        const response = await controller.suspendUser(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })
    })

    describe('Authorization', () => {
      it('should reject non-admin user', async () => {
        vi.mocked(requireAdminAuth).mockRejectedValue(
          new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/suspend',
          'POST',
          {
            userId: 'user123',
          },
        )

        const response = await controller.suspendUser(request)

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
        expect(mockService.suspendUser).not.toHaveBeenCalled()
      })
    })
  })

  describe('deleteUser', () => {
    describe('Success Cases', () => {
      it('should delete user successfully', async () => {
        vi.mocked(mockService.deleteUser).mockResolvedValue(undefined)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/delete',
          'POST',
          {
            userId: 'user123',
          },
        )

        const response = await controller.deleteUser(request)
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(data.success).toBe(true)
        expect(data.data.message).toBe('User deleted successfully')
      })
    })

    describe('Validation Errors', () => {
      it('should reject empty userId', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/delete',
          'POST',
          {
            userId: '',
          },
        )

        const response = await controller.deleteUser(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })
    })

    describe('Authorization', () => {
      it('should reject non-admin user', async () => {
        vi.mocked(requireAdminAuth).mockRejectedValue(
          new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/delete',
          'POST',
          {
            userId: 'user123',
          },
        )

        const response = await controller.deleteUser(request)

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
        expect(mockService.deleteUser).not.toHaveBeenCalled()
      })
    })

    describe('Service Errors', () => {
      it('should handle root admin deletion attempt', async () => {
        vi.mocked(mockService.deleteUser).mockRejectedValue(
          new ApiError(
            'FORBIDDEN',
            HTTP_STATUS.FORBIDDEN,
            'Cannot delete root admin',
          ),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/delete',
          'POST',
          {
            userId: 'root123',
          },
        )

        const response = await controller.deleteUser(request)

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
      })
    })
  })

  describe('getAuditLogs', () => {
    describe('Query Parameter Parsing', () => {
      it('should parse all filters correctly', async () => {
        const mockResult = {
          logs: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        }

        vi.mocked(mockService.getAuditLogs).mockResolvedValue(mockResult)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/audit-logs?userId=user123&action=user_role_updated&startDate=2024-01-01&endDate=2024-12-31&page=2&limit=50',
          'GET',
        )

        await controller.getAuditLogs(request)

        expect(mockService.getAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user123',
            action: 'user_role_updated',
            startDate: expect.any(Date),
            endDate: expect.any(Date),
            page: 2,
            limit: 50,
          }),
        )
      })

      it('should handle missing filters', async () => {
        const mockResult = {
          logs: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        }

        vi.mocked(mockService.getAuditLogs).mockResolvedValue(mockResult)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/audit-logs',
          'GET',
        )

        await controller.getAuditLogs(request)

        expect(mockService.getAuditLogs).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 1,
            limit: 20,
          }),
        )
      })

      it('should handle invalid date formats', async () => {
        const request = createMockRequest(
          'http://localhost:3000/api/admin/audit-logs?startDate=invalid-date',
          'GET',
        )

        const response = await controller.getAuditLogs(request)

        expect([200, 400]).toContain(response.status)
      })

      it('should handle very old dates', async () => {
        const mockResult = {
          logs: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        }

        vi.mocked(mockService.getAuditLogs).mockResolvedValue(mockResult)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/audit-logs?startDate=1900-01-01',
          'GET',
        )

        const response = await controller.getAuditLogs(request)

        expect(response.status).toBe(HTTP_STATUS.OK)
      })

      it('should handle future dates', async () => {
        const mockResult = {
          logs: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        }

        vi.mocked(mockService.getAuditLogs).mockResolvedValue(mockResult)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/audit-logs?startDate=2099-12-31',
          'GET',
        )

        const response = await controller.getAuditLogs(request)

        expect(response.status).toBe(HTTP_STATUS.OK)
      })
    })

    describe('Authorization', () => {
      it('should reject non-admin user', async () => {
        vi.mocked(requireAdminAuth).mockRejectedValue(
          new ApiError('FORBIDDEN', HTTP_STATUS.FORBIDDEN),
        )

        const request = createMockRequest(
          'http://localhost:3000/api/admin/audit-logs',
          'GET',
        )

        const response = await controller.getAuditLogs(request)

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
        expect(mockService.getAuditLogs).not.toHaveBeenCalled()
      })
    })
  })

  describe('Concurrency', () => {
    it('should handle multiple concurrent requests', async () => {
      vi.mocked(mockService.getDashboardStats).mockResolvedValue({
        users: {
          totalUsers: 100,
          activeUsers: 80,
          newUsersToday: 5,
          newUsersThisWeek: 15,
          newUsersThisMonth: 25,
          usersByRole: { admin: 10, user: 90 },
        },
        system: {
          totalApiCalls: 1000,
          failedApiCalls: 10,
          averageResponseTime: 150,
          uptime: 3600,
          errorRate: 0.01,
        },
        mrr: {
          mrr: 0,
          arr: 0,
          revenueThisMonth: 0,
          newSubscribersThisMonth: 0,
          activeSubscriptions: 0,
          churnedThisMonth: 0,
        },
      })

      const requests = Array.from({ length: 10 }, () =>
        createMockRequest('http://localhost:3000/api/admin/stats', 'GET'),
      )

      const responses = await Promise.all(
        requests.map((req) => controller.getDashboardStats(req)),
      )

      responses.forEach((response: NextResponse) => {
        expect(response.status).toBe(HTTP_STATUS.OK)
      })

      expect(mockService.getDashboardStats).toHaveBeenCalledTimes(10)
    })
  })

  describe('Error Recovery', () => {
    it('should recover from transient errors', async () => {
      vi.mocked(mockService.getDashboardStats)
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          users: {
            totalUsers: 100,
            activeUsers: 80,
            newUsersToday: 5,
            newUsersThisWeek: 15,
            newUsersThisMonth: 25,
            usersByRole: { admin: 10, user: 90 },
          },
          system: {
            totalApiCalls: 1000,
            failedApiCalls: 10,
            averageResponseTime: 150,
            uptime: 3600,
            errorRate: 0.01,
          },
          mrr: {
            mrr: 0,
            arr: 0,
            revenueThisMonth: 0,
            newSubscribersThisMonth: 0,
            activeSubscriptions: 0,
            churnedThisMonth: 0,
          },
        })

      const request1 = createMockRequest(
        'http://localhost:3000/api/admin/stats',
        'GET',
      )
      const response1 = await controller.getDashboardStats(request1)

      expect(response1.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)

      const request2 = createMockRequest(
        'http://localhost:3000/api/admin/stats',
        'GET',
      )
      const response2 = await controller.getDashboardStats(request2)

      expect(response2.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('Rate Limiting Scenarios', () => {
    it('should handle high request volume', async () => {
      const mockResult = {
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      }

      vi.mocked(mockService.getUsers).mockResolvedValue(mockResult)

      const requests = Array.from({ length: 100 }, (_, i) =>
        createMockRequest(
          `http://localhost:3000/api/admin/users?page=${i + 1}`,
          'GET',
        ),
      )

      const startTime = Date.now()
      const responses = await Promise.all(
        requests.map((req) => controller.getUsers(req)),
      )
      const duration = Date.now() - startTime

      responses.forEach((response: NextResponse) => {
        expect([200, 429]).toContain(response.status)
      })

      expect(duration).toBeLessThan(10000)
    })
  })

  describe('User Session Edge Cases', () => {
    it('should handle admin with no name', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: {
          id: 'admin123',
          email: 'admin@test.com',
          name: null,
          role: 'admin' as const,
        },
      } as any)

      vi.mocked(mockService.updateUserRole).mockResolvedValue(undefined)

      const request = createMockRequest(
        'http://localhost:3000/api/admin/users/role',
        'POST',
        {
          userId: 'user123',
          role: 'admin',
        },
      )

      await controller.updateUserRole(request)

      expect(mockService.updateUserRole).toHaveBeenCalledWith(
        expect.any(Object),
        'admin123',
        'admin@test.com',
        expect.any(String),
        expect.any(String),
      )
    })
  })
})
