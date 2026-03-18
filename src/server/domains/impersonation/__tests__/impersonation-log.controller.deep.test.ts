// @ts-nocheck
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { requireAdminAuth } from '@/server/shared/middleware/auth.middleware'
import { ApiError } from '@/server/shared/utils/api.utils'

import { ImpersonationLogController } from '../impersonation-log.controller'
import type { ImpersonationLogService } from '../impersonation-log.service'

vi.mock('@/server/shared/middleware/auth.middleware')

describe('ImpersonationLogController - Deep Tests', () => {
  let controller: ImpersonationLogController
  let mockService: ImpersonationLogService

  beforeEach(() => {
    mockService = {
      logAction: vi.fn(),
      getSessionLogs: vi.fn(),
      getSessionStats: vi.fn(),
    } as unknown as ImpersonationLogService

    controller = new ImpersonationLogController(mockService)
    vi.clearAllMocks()
  })

  describe('getSessionLogs - Query Parameter Validation', () => {
    it('should reject missing sessionId', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs',
      )

      const response = await controller.getSessionLogs(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.data.error).toContain('sessionId query parameter is required')
    })

    it('should handle empty sessionId string', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=',
      )

      const response = await controller.getSessionLogs(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should accept valid sessionId', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123',
      )

      const response = await controller.getSessionLogs(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockResult)
    })

    it('should handle very long sessionId', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const longId = 'c' + 'a'.repeat(1000)
      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        `http://localhost:3000/api/impersonation/logs?sessionId=${longId}`,
      )

      const response = await controller.getSessionLogs(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(mockService.getSessionLogs).toHaveBeenCalledWith(longId, 1, 50)
    })

    it('should handle sessionId with special characters', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const specialId = "'; DROP TABLE logs; --"
      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        `http://localhost:3000/api/impersonation/logs?sessionId=${encodeURIComponent(specialId)}`,
      )

      const response = await controller.getSessionLogs(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle unicode and emojis in sessionId', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const unicodeId = '测试🚀session'
      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        `http://localhost:3000/api/impersonation/logs?sessionId=${encodeURIComponent(unicodeId)}`,
      )

      const response = await controller.getSessionLogs(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('getSessionLogs - Pagination Parameters', () => {
    it('should use default page=1 when not provided', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        1,
        50,
      )
    })

    it('should use default limit=50 when not provided', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        1,
        50,
      )
    })

    it('should handle custom page parameter', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 5,
        totalPages: 10,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&page=5',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        5,
        50,
      )
    })

    it('should handle custom limit parameter', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 1,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&limit=100',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        1,
        100,
      )
    })

    it('should handle both page and limit parameters', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 3,
        totalPages: 5,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&page=3&limit=25',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        3,
        25,
      )
    })

    it('should handle page=0', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 0,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&page=0',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        0,
        50,
      )
    })

    it('should handle negative page number', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: -5,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&page=-5',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        -5,
        50,
      )
    })

    it('should handle very large page number', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 999999,
        totalPages: 10,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&page=999999',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        999999,
        50,
      )
    })

    it('should handle limit=0', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&limit=0',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        1,
        0,
      )
    })

    it('should handle negative limit', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&limit=-10',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        1,
        -10,
      )
    })

    it('should handle very large limit', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 1,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&limit=999999',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        1,
        999999,
      )
    })

    it('should handle non-numeric page parameter (NaN)', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&page=abc',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        NaN,
        50,
      )
    })

    it('should handle non-numeric limit parameter (NaN)', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&limit=xyz',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        1,
        NaN,
      )
    })

    it('should handle decimal page number', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 3,
        totalPages: 10,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123&page=3.7',
      )

      await controller.getSessionLogs(request)

      expect(mockService.getSessionLogs).toHaveBeenCalledWith(
        'session123',
        3,
        50,
      )
    })
  })

  describe('getSessionStats - Validation', () => {
    it('should reject missing sessionId', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/stats',
      )

      const response = await controller.getSessionStats(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.data.error).toContain('sessionId query parameter is required')
    })

    it('should handle empty sessionId string', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/stats?sessionId=',
      )

      const response = await controller.getSessionStats(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should accept valid sessionId', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockStats = {
        totalActions: 100,
        byMethod: { GET: 60, POST: 40 },
        byStatus: { '2xx': 90, '4xx': 10 },
        successRate: 90,
      }

      vi.mocked(mockService.getSessionStats).mockResolvedValue(mockStats)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/stats?sessionId=session123',
      )

      const response = await controller.getSessionStats(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockStats)
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests to getSessionLogs', async () => {
      vi.mocked(requireAdminAuth).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Not authenticated',
        ),
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123',
      )

      const response = await controller.getSessionLogs(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(data.success).toBe(false)
    })

    it('should reject non-admin users to getSessionLogs', async () => {
      vi.mocked(requireAdminAuth).mockRejectedValue(
        new ApiError(
          'FORBIDDEN',
          HTTP_STATUS.FORBIDDEN,
          'Only admins can access logs',
        ),
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123',
      )

      const response = await controller.getSessionLogs(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
    })

    it('should reject unauthenticated requests to getSessionStats', async () => {
      vi.mocked(requireAdminAuth).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Not authenticated',
        ),
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/stats?sessionId=session123',
      )

      const response = await controller.getSessionStats(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors in getSessionLogs', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      vi.mocked(mockService.getSessionLogs).mockRejectedValue(
        new Error('Database connection lost'),
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123',
      )

      const response = await controller.getSessionLogs(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(data.success).toBe(false)
    })

    it('should handle service errors in getSessionStats', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      vi.mocked(mockService.getSessionStats).mockRejectedValue(
        new Error('Query timeout'),
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/stats?sessionId=session123',
      )

      const response = await controller.getSessionStats(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(data.success).toBe(false)
    })

    it('should handle ApiError from service', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      vi.mocked(mockService.getSessionLogs).mockRejectedValue(
        new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Session not found'),
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=nonexistent',
      )

      const response = await controller.getSessionLogs(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(data.error?.message).toContain('Session not found')
    })
  })

  describe('Response Structure', () => {
    it('should return correct structure for getSessionLogs success', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [
          {
            id: 'log1',
            impersonationSessionId: 'session123',
            action: 'test_action',
            method: 'GET',
            path: '/api/test',
            statusCode: 200,
            requestBody: null,
            responseBody: null,
            ip: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
            duration: 100,
            timestamp: new Date(),
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/logs?sessionId=session123',
      )

      const response = await controller.getSessionLogs(request)
      const data = await response.json()

      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('logs')
      expect(data.data).toHaveProperty('total')
      expect(data.data).toHaveProperty('page')
      expect(data.data).toHaveProperty('totalPages')
    })

    it('should return correct structure for getSessionStats success', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockStats = {
        totalActions: 100,
        byMethod: { GET: 60, POST: 40 },
        byStatus: { '2xx': 90, '4xx': 10 },
        successRate: 90,
      }

      vi.mocked(mockService.getSessionStats).mockResolvedValue(mockStats)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/stats?sessionId=session123',
      )

      const response = await controller.getSessionStats(request)
      const data = await response.json()

      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('totalActions')
      expect(data.data).toHaveProperty('byMethod')
      expect(data.data).toHaveProperty('byStatus')
      expect(data.data).toHaveProperty('successRate')
    })
  })

  describe('Concurrency', () => {
    it('should handle concurrent getSessionLogs calls', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockService.getSessionLogs).mockResolvedValue(mockResult)

      const requests = Array.from({ length: 10 }, (_, i) =>
        controller.getSessionLogs(
          new NextRequest(
            `http://localhost:3000/api/impersonation/logs?sessionId=session${i}`,
          ),
        ),
      )

      const responses = await Promise.all(requests)

      responses.forEach((response) => {
        expect(response.status).toBe(HTTP_STATUS.OK)
      })
    })
  })
})
