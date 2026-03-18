import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'
import { auditLogger } from '@/server/shared/utils'
import { ApiError } from '@/server/shared/utils/api.utils'

import { AdminController } from '../admin.controller'
import { AdminService } from '../admin.service'

vi.mock('@/server/shared/middleware/auth.middleware', () => ({
  validateApiAuth: vi.fn(),
}))

vi.mock('@/server/shared/utils', () => ({
  auditLogger: {
    logUnauthorizedAdminAccess: vi.fn(),
  },
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

  const mockUserSession = {
    user: {
      id: 'user123',
      email: 'user@test.com',
      name: 'Regular User',
      role: 'user' as const,
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
  })

  describe('getDashboardStats', () => {
    describe('Authorization', () => {
      it('should allow admin to get dashboard stats', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockUserSession,
        } as any)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/stats',
          'GET',
        )

        const response = await controller.getDashboardStats(request)
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
        expect(data.success).toBe(false)
        expect(data.error.message).toBe('Admin access required')
        expect(mockService.getDashboardStats).not.toHaveBeenCalled()
      })

      it('should log unauthorized access attempt', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockUserSession,
        } as any)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/stats',
          'GET',
        )

        await controller.getDashboardStats(request)

        expect(auditLogger.logUnauthorizedAdminAccess).toHaveBeenCalledWith(
          'user123',
          'Regular User',
          '/api/admin/stats',
          '127.0.0.1',
        )
      })

      it('should handle missing authentication', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          response: NextResponse.json(
            { success: false, error: { message: 'Unauthorized' } },
            { status: HTTP_STATUS.UNAUTHORIZED },
          ),
        } as any)

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
      it('should extract IP from X-Forwarded-For header', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockUserSession,
        } as any)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/stats',
          'GET',
          undefined,
          { 'X-Forwarded-For': '192.168.1.1, 10.0.0.1' },
        )

        await controller.getDashboardStats(request)

        expect(auditLogger.logUnauthorizedAdminAccess).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          '192.168.1.1',
        )
      })

      it('should extract IP from X-Real-IP header', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockUserSession,
        } as any)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/stats',
          'GET',
          undefined,
          { 'X-Real-IP': '172.16.0.1' },
        )

        await controller.getDashboardStats(request)

        expect(auditLogger.logUnauthorizedAdminAccess).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          '172.16.0.1',
        )
      })

      it('should handle missing IP headers', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockUserSession,
        } as any)

        const request = new NextRequest(
          'http://localhost:3000/api/admin/stats',
          {
            method: 'GET',
            headers: {},
          },
        )

        await controller.getDashboardStats(request)

        expect(auditLogger.logUnauthorizedAdminAccess).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          null,
        )
      })
    })

    describe('Service Errors', () => {
      it('should handle service throwing error', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users?page=-1',
          'GET',
        )

        const response = await controller.getUsers(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })

      it('should handle invalid limit', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users?limit=1000',
          'GET',
        )

        const response = await controller.getUsers(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })

      it('should handle emailVerified=false', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockUserSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
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

        const response = await controller.updateUserRole(request)
        const data = await response.json()

        expect(response.status).toBe(HTTP_STATUS.OK)
        expect(data.success).toBe(true)
        expect(data.data.message).toBe('User role updated successfully')
      })

      it('should pass correct parameters to service', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/users/role',
          'POST',
          null,
        )

        const response = await controller.updateUserRole(request)

        expect(response.status).toBeGreaterThanOrEqual(400)
      })

      it('should handle very large userId', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockUserSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockUserSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockUserSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

        const request = createMockRequest(
          'http://localhost:3000/api/admin/audit-logs?startDate=invalid-date',
          'GET',
        )

        const response = await controller.getAuditLogs(request)

        expect([200, 400]).toContain(response.status)
      })

      it('should handle very old dates', async () => {
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockAdminSession,
        } as any)

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
        vi.mocked(validateApiAuth).mockResolvedValue({
          session: mockUserSession,
        } as any)

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
      vi.mocked(validateApiAuth).mockResolvedValue({
        session: mockAdminSession,
      } as any)

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
      })

      const requests = Array.from({ length: 10 }, () =>
        createMockRequest('http://localhost:3000/api/admin/stats', 'GET'),
      )

      const responses = await Promise.all(
        requests.map((req) => controller.getDashboardStats(req)),
      )

      responses.forEach((response) => {
        expect(response.status).toBe(HTTP_STATUS.OK)
      })

      expect(mockService.getDashboardStats).toHaveBeenCalledTimes(10)
    })
  })

  describe('Error Recovery', () => {
    it('should recover from transient errors', async () => {
      vi.mocked(validateApiAuth).mockResolvedValue({
        session: mockAdminSession,
      } as any)

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
      vi.mocked(validateApiAuth).mockResolvedValue({
        session: mockAdminSession,
      } as any)

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

      responses.forEach((response) => {
        expect([200, 429]).toContain(response.status)
      })

      expect(duration).toBeLessThan(10000)
    })
  })

  describe('User Session Edge Cases', () => {
    it('should handle user with no name', async () => {
      vi.mocked(validateApiAuth).mockResolvedValue({
        session: {
          user: {
            id: 'user123',
            email: 'user@test.com',
            name: null,
            role: 'user' as const,
          },
        },
      } as any)

      const request = createMockRequest(
        'http://localhost:3000/api/admin/stats',
        'GET',
      )

      await controller.getDashboardStats(request)

      expect(auditLogger.logUnauthorizedAdminAccess).toHaveBeenCalledWith(
        'user123',
        'user@test.com',
        expect.any(String),
        expect.any(String),
      )
    })

    it('should handle admin with no name', async () => {
      vi.mocked(validateApiAuth).mockResolvedValue({
        session: {
          user: {
            id: 'admin123',
            email: 'admin@test.com',
            name: null,
            role: 'admin' as const,
          },
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
