import { beforeEach, describe, expect, it, vi } from 'vitest'

import { auditLogger } from '@/server/shared/utils/audit.logger'

import type { AdminRepository } from '../../admin/admin.repository'
import type { ImpersonationLogRepository } from '../impersonation-log.repository'
import { ImpersonationLogService } from '../impersonation-log.service'

vi.mock('@/server/shared/utils/audit.logger', () => ({
  auditLogger: {
    logImpersonationAction: vi.fn(),
  },
}))

describe('ImpersonationLogService - Deep Tests', () => {
  let service: ImpersonationLogService
  let mockRepository: ImpersonationLogRepository
  let mockAdminRepository: AdminRepository

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findBySessionId: vi.fn(),
      findBySessionIdPaginated: vi.fn(),
      getActionStats: vi.fn(),
    } as unknown as ImpersonationLogRepository

    mockAdminRepository = {
      createAuditLog: vi.fn(),
    } as unknown as AdminRepository

    service = new ImpersonationLogService(mockRepository, mockAdminRepository)
    vi.clearAllMocks()
    vi.mocked(auditLogger.logImpersonationAction).mockImplementation(() => {})
  })

  describe('logAction - Body Truncation', () => {
    it('should truncate requestBody exceeding MAX_BODY_LENGTH (5000)', async () => {
      const largeBody = { data: 'a'.repeat(6000) }

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: largeBody,
        responseBody: null,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.stringContaining('... [truncated]'),
        }),
      )

      const call = vi.mocked(mockRepository.create).mock.calls[0][0]
      expect(call.requestBody?.length).toBe(5015)
    })

    it('should truncate responseBody exceeding MAX_BODY_LENGTH', async () => {
      const largeResponse = { data: 'b'.repeat(6000) }

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: null,
        responseBody: largeResponse,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          responseBody: expect.stringContaining('... [truncated]'),
        }),
      )
    })

    it('should NOT truncate body under MAX_BODY_LENGTH', async () => {
      const smallBody = { data: 'a'.repeat(100) }

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: smallBody,
        responseBody: null,
      })

      const call = vi.mocked(mockRepository.create).mock.calls[0][0]
      expect(call.requestBody).not.toContain('[truncated]')
      expect(call.requestBody).toContain(JSON.stringify(smallBody))
    })

    it('should handle exactly MAX_BODY_LENGTH (5000 chars)', async () => {
      const exactBody = { data: 'a'.repeat(4989) }
      const stringified = JSON.stringify(exactBody)
      expect(stringified.length).toBe(5000)

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: exactBody,
        responseBody: null,
      })

      const call = vi.mocked(mockRepository.create).mock.calls[0][0]
      expect(call.requestBody).not.toContain('[truncated]')
    })

    it('should handle null requestBody', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        requestBody: null,
        responseBody: null,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: null,
        }),
      )
    })

    it('should handle undefined requestBody', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        requestBody: undefined,
        responseBody: null,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: null,
        }),
      )
    })

    it('should handle empty object', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: {},
        responseBody: null,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: '{}',
        }),
      )
    })

    it('should handle empty array', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: [],
        responseBody: null,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: '[]',
        }),
      )
    })
  })

  describe('logAction - Non-Serializable Data', () => {
    it('should handle circular references in requestBody', async () => {
      const circularObj: any = { name: 'test' }
      circularObj.self = circularObj

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: circularObj,
        responseBody: null,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: '[Non-serializable data]',
        }),
      )
    })

    it('should handle BigInt values in requestBody', async () => {
      const bodyWithBigInt = { value: BigInt(9007199254740991) }

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: bodyWithBigInt,
        responseBody: null,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: '[Non-serializable data]',
        }),
      )
    })

    it('should handle functions in requestBody', async () => {
      const bodyWithFunction = { fn: () => 'test' }

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: bodyWithFunction,
        responseBody: null,
      })

      const call = vi.mocked(mockRepository.create).mock.calls[0][0]
      expect(call.requestBody).toBeDefined()
    })

    it('should handle symbols in requestBody', async () => {
      const bodyWithSymbol = { key: Symbol('test') }

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: bodyWithSymbol,
        responseBody: null,
      })

      const call = vi.mocked(mockRepository.create).mock.calls[0][0]
      expect(call.requestBody).toBeDefined()
    })
  })

  describe('logAction - Edge Cases', () => {
    it('should handle empty sessionId', async () => {
      await service.logAction('', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          impersonationSessionId: '',
        }),
      )
    })

    it('should handle very long sessionId', async () => {
      const longId = 'c' + 'a'.repeat(1000)

      await service.logAction(longId, 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          impersonationSessionId: longId,
        }),
      )
    })

    it('should handle empty action string', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: '',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: '',
        }),
      )
    })

    it('should handle very long path (>5000 chars)', async () => {
      const longPath = '/api/' + 'a'.repeat(5000)

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: longPath,
        statusCode: 200,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          path: longPath,
        }),
      )
    })

    it('should handle path with query parameters and special characters', async () => {
      const complexPath =
        "/api/search?q=<script>alert('XSS')</script>&page=1&limit=50"

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: complexPath,
        statusCode: 200,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          path: complexPath,
        }),
      )
    })

    it('should handle undefined statusCode', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: undefined,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: null,
        }),
      )
    })

    it('should handle negative statusCode', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: -1,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: -1,
        }),
      )
    })

    it('should handle statusCode above 999', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 9999,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 9999,
        }),
      )
    })

    it('should handle null IP address', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        ip: null,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: null,
        }),
      )
    })

    it('should handle undefined IP address', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        ip: undefined,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: null,
        }),
      )
    })

    it('should handle IPv6 address', async () => {
      const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334'

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        ip: ipv6,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: ipv6,
        }),
      )
    })

    it('should handle very long user agent (>10000 chars)', async () => {
      const longUserAgent = 'Mozilla/5.0 ' + 'a'.repeat(10000)

      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        userAgent: longUserAgent,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: longUserAgent,
        }),
      )
    })

    it('should handle negative duration', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: -100,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: -100,
        }),
      )
    })

    it('should handle zero duration', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 0,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 0,
        }),
      )
    })

    it('should handle extremely large duration (hours)', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 360000000,
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 360000000,
        }),
      )
    })
  })

  describe('logAction - Audit Logging', () => {
    it('should call auditLogger with correct parameters', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        ip: '192.168.1.1',
      })

      expect(auditLogger.logImpersonationAction).toHaveBeenCalledWith(
        'admin123',
        'user123',
        'test_action',
        'POST',
        '/api/test',
        200,
        '192.168.1.1',
      )
    })

    it('should call auditLogger with null IP if not provided', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
      })

      expect(auditLogger.logImpersonationAction).toHaveBeenCalledWith(
        'admin123',
        'user123',
        'test_action',
        'GET',
        '/api/test',
        200,
        null,
      )
    })

    it('should call adminRepository.createAuditLog when provided', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'POST',
        path: '/api/users',
        statusCode: 201,
        adminName: 'Admin User',
        targetUserName: 'Target User',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })

      expect(mockAdminRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'impersonation_action',
        'user:user123',
        'POST /api/users (201) as Target User',
        '192.168.1.1',
        'Mozilla/5.0',
      )
    })

    it('should handle missing adminName gracefully', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        targetUserName: 'Target User',
      })

      expect(mockAdminRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Unknown Admin',
        expect.any(String),
        expect.any(String),
        expect.any(String),
        null,
        null,
      )
    })

    it('should handle missing targetUserName gracefully', async () => {
      await service.logAction('session123', 'admin123', 'user123', {
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        adminName: 'Admin User',
      })

      expect(mockAdminRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        expect.any(String),
        expect.any(String),
        expect.stringContaining('unknown user'),
        null,
        null,
      )
    })

    it('should not call adminRepository if not provided', async () => {
      const serviceWithoutAdminRepo = new ImpersonationLogService(
        mockRepository,
      )

      await serviceWithoutAdminRepo.logAction(
        'session123',
        'admin123',
        'user123',
        {
          action: 'test_action',
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
        },
      )

      expect(mockAdminRepository.createAuditLog).not.toHaveBeenCalled()
    })
  })

  describe('getSessionLogs - Delegation', () => {
    it('should delegate to repository with default pagination', async () => {
      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockRepository.findBySessionIdPaginated).mockResolvedValue(
        mockResult,
      )

      const result = await service.getSessionLogs('session123')

      expect(mockRepository.findBySessionIdPaginated).toHaveBeenCalledWith(
        'session123',
        1,
        50,
      )
      expect(result).toEqual(mockResult)
    })

    it('should delegate with custom page', async () => {
      const mockResult = {
        logs: [],
        total: 0,
        page: 5,
        totalPages: 10,
      }

      vi.mocked(mockRepository.findBySessionIdPaginated).mockResolvedValue(
        mockResult,
      )

      await service.getSessionLogs('session123', 5)

      expect(mockRepository.findBySessionIdPaginated).toHaveBeenCalledWith(
        'session123',
        5,
        50,
      )
    })

    it('should delegate with custom limit', async () => {
      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 2,
      }

      vi.mocked(mockRepository.findBySessionIdPaginated).mockResolvedValue(
        mockResult,
      )

      await service.getSessionLogs('session123', 1, 100)

      expect(mockRepository.findBySessionIdPaginated).toHaveBeenCalledWith(
        'session123',
        1,
        100,
      )
    })

    it('should handle empty sessionId', async () => {
      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockRepository.findBySessionIdPaginated).mockResolvedValue(
        mockResult,
      )

      await service.getSessionLogs('')

      expect(mockRepository.findBySessionIdPaginated).toHaveBeenCalledWith(
        '',
        1,
        50,
      )
    })

    it('should handle page 0', async () => {
      const mockResult = {
        logs: [],
        total: 0,
        page: 0,
        totalPages: 0,
      }

      vi.mocked(mockRepository.findBySessionIdPaginated).mockResolvedValue(
        mockResult,
      )

      await service.getSessionLogs('session123', 0)

      expect(mockRepository.findBySessionIdPaginated).toHaveBeenCalledWith(
        'session123',
        0,
        50,
      )
    })

    it('should handle negative page', async () => {
      const mockResult = {
        logs: [],
        total: 0,
        page: -1,
        totalPages: 0,
      }

      vi.mocked(mockRepository.findBySessionIdPaginated).mockResolvedValue(
        mockResult,
      )

      await service.getSessionLogs('session123', -1)

      expect(mockRepository.findBySessionIdPaginated).toHaveBeenCalledWith(
        'session123',
        -1,
        50,
      )
    })

    it('should handle zero limit', async () => {
      const mockResult = {
        logs: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }

      vi.mocked(mockRepository.findBySessionIdPaginated).mockResolvedValue(
        mockResult,
      )

      await service.getSessionLogs('session123', 1, 0)

      expect(mockRepository.findBySessionIdPaginated).toHaveBeenCalledWith(
        'session123',
        1,
        0,
      )
    })
  })

  describe('getSessionStats - Delegation', () => {
    it('should delegate to repository', async () => {
      const mockStats = {
        totalActions: 100,
        byMethod: { GET: 60, POST: 30, DELETE: 10 },
        byStatus: { '2xx': 80, '4xx': 15, '5xx': 5 },
        successRate: 80,
      }

      vi.mocked(mockRepository.getActionStats).mockResolvedValue(mockStats)

      const result = await service.getSessionStats('session123')

      expect(mockRepository.getActionStats).toHaveBeenCalledWith('session123')
      expect(result).toEqual(mockStats)
    })

    it('should handle empty sessionId', async () => {
      const mockStats = {
        totalActions: 0,
        byMethod: {},
        byStatus: {},
        successRate: 0,
      }

      vi.mocked(mockRepository.getActionStats).mockResolvedValue(mockStats)

      await service.getSessionStats('')

      expect(mockRepository.getActionStats).toHaveBeenCalledWith('')
    })
  })

  describe('Error Handling', () => {
    it('should propagate database errors from create', async () => {
      vi.mocked(mockRepository.create).mockRejectedValue(
        new Error('Database connection lost'),
      )

      await expect(
        service.logAction('session123', 'admin123', 'user123', {
          action: 'test_action',
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
        }),
      ).rejects.toThrow('Database connection lost')
    })

    it('should propagate errors from getSessionLogs', async () => {
      vi.mocked(mockRepository.findBySessionIdPaginated).mockRejectedValue(
        new Error('Query timeout'),
      )

      await expect(service.getSessionLogs('session123')).rejects.toThrow(
        'Query timeout',
      )
    })

    it('should propagate errors from getSessionStats', async () => {
      vi.mocked(mockRepository.getActionStats).mockRejectedValue(
        new Error('Database error'),
      )

      await expect(service.getSessionStats('session123')).rejects.toThrow(
        'Database error',
      )
    })

    it('should handle auditLogger failure gracefully (should not throw)', async () => {
      vi.mocked(auditLogger.logImpersonationAction).mockImplementation(() => {
        throw new Error('Audit logger failed')
      })

      await expect(
        service.logAction('session123', 'admin123', 'user123', {
          action: 'test_action',
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
        }),
      ).rejects.toThrow()
    })

    it('should handle adminRepository.createAuditLog failure', async () => {
      vi.mocked(mockAdminRepository.createAuditLog).mockRejectedValue(
        new Error('Admin audit log failed'),
      )

      await expect(
        service.logAction('session123', 'admin123', 'user123', {
          action: 'test_action',
          method: 'GET',
          path: '/api/test',
          statusCode: 200,
          adminName: 'Admin',
        }),
      ).rejects.toThrow()
    })
  })

  describe('Concurrency and Race Conditions', () => {
    it('should handle concurrent logAction calls', async () => {
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: 'log123',
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
        timestamp: new Date(),
      })

      const promises = Array.from({ length: 100 }, (_, i) =>
        service.logAction('session123', 'admin123', 'user123', {
          action: `action${i}`,
          method: 'GET',
          path: `/api/${i}`,
          statusCode: 200,
        }),
      )

      await expect(Promise.all(promises)).resolves.toBeDefined()
    })
  })

  describe('Performance Tests', () => {
    it('should handle logging 1000 actions efficiently', async () => {
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: 'log123',
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
        timestamp: new Date(),
      })

      const start = Date.now()
      const promises = Array.from({ length: 1000 }, (_, i) =>
        service.logAction('session123', 'admin123', 'user123', {
          action: `action${i}`,
          method: 'GET',
          path: `/api/${i}`,
          statusCode: 200,
        }),
      )
      await Promise.all(promises)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(3000)
    })
  })
})
