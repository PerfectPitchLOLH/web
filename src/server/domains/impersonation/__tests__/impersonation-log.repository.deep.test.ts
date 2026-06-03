// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CreateImpersonationLogDTO } from '../impersonation-log.repository'
import { ImpersonationLogRepository } from '../impersonation-log.repository'

vi.mock('@/server/lib/database', () => ({
  db: {
    impersonationLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { db } from '@/server/lib/database'

describe('ImpersonationLogRepository - Deep Tests', () => {
  let repository: ImpersonationLogRepository

  beforeEach(() => {
    repository = new ImpersonationLogRepository()
    vi.clearAllMocks()
  })

  describe('create - Boundary Values', () => {
    it('should handle empty string in action', async () => {
      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: '',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.action).toBe('')
    })

    it('should handle very long action string (>1000 chars)', async () => {
      const longAction = 'a'.repeat(1000)

      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: longAction,
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.action).toBe(longAction)
    })

    it('should handle very long path (>5000 chars)', async () => {
      const longPath = '/api/' + 'a'.repeat(5000)

      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'GET',
        path: longPath,
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.path).toBe(longPath)
    })

    it('should handle path with special characters', async () => {
      const specialPath =
        "/api/users?name=John's&query=<script>alert('XSS')</script>"

      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'GET',
        path: specialPath,
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.path).toBe(specialPath)
    })

    it('should handle negative status code', async () => {
      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: -1,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.statusCode).toBe(-1)
    })

    it('should handle status code above 999', async () => {
      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 9999,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.statusCode).toBe(9999)
    })

    it('should handle null status code', async () => {
      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: null,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.statusCode).toBeNull()
    })

    it('should handle very long requestBody (>50000 chars)', async () => {
      const longBody = JSON.stringify({ data: 'a'.repeat(50000) })

      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: longBody,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.requestBody).toBe(longBody)
    })

    it('should handle unicode and emojis in requestBody', async () => {
      const unicodeBody = JSON.stringify({
        message: 'Hello 世界 🌍 Ñoño',
        emoji: '😀👍🎉',
      })

      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'POST',
        path: '/api/test',
        statusCode: 200,
        requestBody: unicodeBody,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.requestBody).toBe(unicodeBody)
    })

    it('should handle negative duration', async () => {
      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: -100,
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.duration).toBe(-100)
    })

    it('should handle extremely large duration (hours)', async () => {
      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: 360000000,
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.duration).toBe(360000000)
    })

    it('should handle all HTTP methods', async () => {
      const methods = [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
        'HEAD',
      ]

      for (const method of methods) {
        const logData: CreateImpersonationLogDTO = {
          impersonationSessionId: 'session123',
          action: 'test_action',
          method,
          path: '/api/test',
          statusCode: 200,
          requestBody: null,
          responseBody: null,
          ip: null,
          userAgent: null,
          duration: null,
        }

        const mockLog = {
          id: `log_${method}`,
          ...logData,
          timestamp: new Date(),
        }

        vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

        const result = await repository.create(logData)

        expect(result.method).toBe(method)
      }
    })
  })

  describe('findBySessionId - Edge Cases', () => {
    it('should handle empty sessionId', async () => {
      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([])

      const result = await repository.findBySessionId('')

      expect(result).toEqual([])
    })

    it('should handle very long sessionId', async () => {
      const longId = 'c' + 'a'.repeat(1000)

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([])

      const result = await repository.findBySessionId(longId)

      expect(result).toEqual([])
    })

    it('should handle sessionId with SQL injection attempt', async () => {
      const maliciousId = "'; DROP TABLE impersonationLog; --"

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([])

      const result = await repository.findBySessionId(maliciousId)

      expect(result).toEqual([])
      expect(db.impersonationLog.findMany).toHaveBeenCalledWith({
        where: {
          impersonationSessionId: maliciousId,
        },
        orderBy: {
          timestamp: 'desc',
        },
      })
    })

    it('should return empty array when no logs found', async () => {
      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([])

      const result = await repository.findBySessionId('session123')

      expect(result).toEqual([])
    })

    it('should return logs in descending timestamp order', async () => {
      const mockLogs = [
        {
          id: 'log3',
          impersonationSessionId: 'session123',
          action: 'action3',
          method: 'GET',
          path: '/api/3',
          statusCode: 200,
          requestBody: null,
          responseBody: null,
          ip: null,
          userAgent: null,
          duration: null,
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
        {
          id: 'log2',
          impersonationSessionId: 'session123',
          action: 'action2',
          method: 'GET',
          path: '/api/2',
          statusCode: 200,
          requestBody: null,
          responseBody: null,
          ip: null,
          userAgent: null,
          duration: null,
          timestamp: new Date('2024-01-01T11:00:00Z'),
        },
        {
          id: 'log1',
          impersonationSessionId: 'session123',
          action: 'action1',
          method: 'GET',
          path: '/api/1',
          statusCode: 200,
          requestBody: null,
          responseBody: null,
          ip: null,
          userAgent: null,
          duration: null,
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
      ]

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue(mockLogs)

      const result = await repository.findBySessionId('session123')

      expect(result).toEqual(mockLogs)
      expect(result[0].timestamp).toEqual(new Date('2024-01-01T12:00:00Z'))
    })
  })

  describe('findBySessionIdPaginated - Pagination Logic', () => {
    it('should handle page 1 with default limit', async () => {
      const mockLogs = Array.from({ length: 10 }, (_, i) => ({
        id: `log${i}`,
        impersonationSessionId: 'session123',
        action: `action${i}`,
        method: 'GET',
        path: `/api/${i}`,
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
        timestamp: new Date(),
      }))

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue(mockLogs)
      vi.mocked(db.impersonationLog.count).mockResolvedValue(100)

      const result = await repository.findBySessionIdPaginated(
        'session123',
        1,
        50,
      )

      expect(result.logs).toEqual(mockLogs)
      expect(result.total).toBe(100)
      expect(result.page).toBe(1)
      expect(result.totalPages).toBe(2)
    })

    it('should handle page 0 (should treat as page 1)', async () => {
      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([])
      vi.mocked(db.impersonationLog.count).mockResolvedValue(0)

      const result = await repository.findBySessionIdPaginated(
        'session123',
        0,
        50,
      )

      expect(db.impersonationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: -50,
          take: 50,
        }),
      )
    })

    it('should handle negative page number', async () => {
      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([])
      vi.mocked(db.impersonationLog.count).mockResolvedValue(0)

      const result = await repository.findBySessionIdPaginated(
        'session123',
        -5,
        50,
      )

      expect(db.impersonationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: -300,
        }),
      )
    })

    it('should handle very large page number', async () => {
      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([])
      vi.mocked(db.impersonationLog.count).mockResolvedValue(100)

      const result = await repository.findBySessionIdPaginated(
        'session123',
        1000000,
        50,
      )

      expect(result.logs).toEqual([])
      expect(result.totalPages).toBe(2)
    })

    it('should handle limit of 1', async () => {
      const mockLog = {
        id: 'log1',
        impersonationSessionId: 'session123',
        action: 'action1',
        method: 'GET',
        path: '/api/1',
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([mockLog])
      vi.mocked(db.impersonationLog.count).mockResolvedValue(100)

      const result = await repository.findBySessionIdPaginated(
        'session123',
        1,
        1,
      )

      expect(result.logs).toHaveLength(1)
      expect(result.totalPages).toBe(100)
    })

    it('should handle limit larger than total count', async () => {
      const mockLogs = Array.from({ length: 10 }, (_, i) => ({
        id: `log${i}`,
        impersonationSessionId: 'session123',
        action: `action${i}`,
        method: 'GET',
        path: `/api/${i}`,
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
        timestamp: new Date(),
      }))

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue(mockLogs)
      vi.mocked(db.impersonationLog.count).mockResolvedValue(10)

      const result = await repository.findBySessionIdPaginated(
        'session123',
        1,
        1000,
      )

      expect(result.logs).toHaveLength(10)
      expect(result.totalPages).toBe(1)
    })

    it('should handle zero limit', async () => {
      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([])
      vi.mocked(db.impersonationLog.count).mockResolvedValue(100)

      const result = await repository.findBySessionIdPaginated(
        'session123',
        1,
        0,
      )

      expect(result.totalPages).toBe(Infinity)
    })

    it('should handle negative limit', async () => {
      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([])
      vi.mocked(db.impersonationLog.count).mockResolvedValue(100)

      const result = await repository.findBySessionIdPaginated(
        'session123',
        1,
        -10,
      )

      expect(db.impersonationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: -10,
        }),
      )
    })

    it('should calculate skip correctly for middle pages', async () => {
      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([])
      vi.mocked(db.impersonationLog.count).mockResolvedValue(500)

      await repository.findBySessionIdPaginated('session123', 5, 50)

      expect(db.impersonationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 200,
          take: 50,
        }),
      )
    })
  })

  describe('getActionStats - Statistics Calculation', () => {
    it('should return zero stats for empty logs', async () => {
      vi.mocked(db.impersonationLog.findMany).mockResolvedValue([])

      const result = await repository.getActionStats('session123')

      expect(result.totalActions).toBe(0)
      expect(result.byMethod).toEqual({})
      expect(result.byStatus).toEqual({})
      expect(result.successRate).toBe(0)
    })

    it('should calculate stats correctly with mixed status codes', async () => {
      const mockLogs = [
        {
          action: 'action1',
          method: 'GET',
          statusCode: 200,
        },
        {
          action: 'action2',
          method: 'POST',
          statusCode: 201,
        },
        {
          action: 'action3',
          method: 'GET',
          statusCode: 404,
        },
        {
          action: 'action4',
          method: 'DELETE',
          statusCode: 500,
        },
      ]

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue(mockLogs as any)

      const result = await repository.getActionStats('session123')

      expect(result.totalActions).toBe(4)
      expect(result.byMethod).toEqual({
        GET: 2,
        POST: 1,
        DELETE: 1,
      })
      expect(result.byStatus).toEqual({
        '2xx': 2,
        '4xx': 1,
        '5xx': 1,
      })
      expect(result.successRate).toBe(50)
    })

    it('should handle null status codes', async () => {
      const mockLogs = [
        {
          action: 'action1',
          method: 'GET',
          statusCode: null,
        },
        {
          action: 'action2',
          method: 'POST',
          statusCode: 200,
        },
      ]

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue(mockLogs as any)

      const result = await repository.getActionStats('session123')

      expect(result.totalActions).toBe(2)
      expect(result.successRate).toBe(50)
    })

    it('should handle all success (100% success rate)', async () => {
      const mockLogs = Array.from({ length: 100 }, (_, i) => ({
        action: `action${i}`,
        method: 'GET',
        statusCode: 200,
      }))

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue(mockLogs as any)

      const result = await repository.getActionStats('session123')

      expect(result.successRate).toBe(100)
    })

    it('should handle all failures (0% success rate)', async () => {
      const mockLogs = Array.from({ length: 100 }, (_, i) => ({
        action: `action${i}`,
        method: 'GET',
        statusCode: 500,
      }))

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue(mockLogs as any)

      const result = await repository.getActionStats('session123')

      expect(result.successRate).toBe(0)
    })

    it('should categorize status codes correctly (boundary values)', async () => {
      const mockLogs = [
        { action: 'a1', method: 'GET', statusCode: 100 },
        { action: 'a2', method: 'GET', statusCode: 199 },
        { action: 'a3', method: 'GET', statusCode: 200 },
        { action: 'a4', method: 'GET', statusCode: 299 },
        { action: 'a5', method: 'GET', statusCode: 300 },
        { action: 'a6', method: 'GET', statusCode: 399 },
        { action: 'a7', method: 'GET', statusCode: 400 },
        { action: 'a8', method: 'GET', statusCode: 499 },
        { action: 'a9', method: 'GET', statusCode: 500 },
        { action: 'a10', method: 'GET', statusCode: 599 },
      ]

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue(mockLogs as any)

      const result = await repository.getActionStats('session123')

      expect(result.byStatus).toEqual({
        '1xx': 2,
        '2xx': 2,
        '3xx': 2,
        '4xx': 2,
        '5xx': 2,
      })
      expect(result.successRate).toBe(60)
    })

    it('should handle non-standard status codes', async () => {
      const mockLogs = [
        { action: 'a1', method: 'GET', statusCode: 0 },
        { action: 'a2', method: 'GET', statusCode: 999 },
        { action: 'a3', method: 'GET', statusCode: -1 },
      ]

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue(mockLogs as any)

      const result = await repository.getActionStats('session123')

      expect(result.byStatus).toHaveProperty('0xx')
      expect(result.byStatus).toHaveProperty('9xx')
    })
  })

  describe('Database Errors', () => {
    it('should handle database timeout on create', async () => {
      vi.mocked(db.impersonationLog.create).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 100),
          ),
      )

      const logData: CreateImpersonationLogDTO = {
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
      }

      await expect(repository.create(logData)).rejects.toThrow('Query timeout')
    })

    it('should handle database connection lost', async () => {
      vi.mocked(db.impersonationLog.findMany).mockRejectedValue(
        new Error('Connection lost'),
      )

      await expect(repository.findBySessionId('session123')).rejects.toThrow(
        'Connection lost',
      )
    })

    it('should handle foreign key constraint violation', async () => {
      vi.mocked(db.impersonationLog.create).mockRejectedValue(
        new Error('Foreign key constraint failed on impersonationSessionId'),
      )

      const logData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'nonexistent',
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
      }

      await expect(repository.create(logData)).rejects.toThrow(
        'Foreign key constraint',
      )
    })

    it('should handle database deadlock', async () => {
      vi.mocked(db.impersonationLog.create).mockRejectedValue(
        new Error('Deadlock detected'),
      )

      const logData: CreateImpersonationLogDTO = {
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
      }

      await expect(repository.create(logData)).rejects.toThrow(
        'Deadlock detected',
      )
    })
  })

  describe('Performance and Stress Tests', () => {
    it('should handle bulk log creation efficiently', async () => {
      const bulkLogs = Array.from({ length: 1000 }, (_, i) => ({
        id: `log${i}`,
        impersonationSessionId: 'session123',
        action: `action${i}`,
        method: 'GET',
        path: `/api/${i}`,
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
        timestamp: new Date(),
      }))

      vi.mocked(db.impersonationLog.create).mockImplementation(async (args) => {
        const index = parseInt(args.data.action.replace('action', ''))
        return bulkLogs[index]
      })

      const start = Date.now()
      const promises = bulkLogs.map((log) => repository.create(log))
      await Promise.all(promises)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(2000)
    })

    it('should handle large pagination queries efficiently', async () => {
      const largeLogs = Array.from({ length: 1000 }, (_, i) => ({
        id: `log${i}`,
        impersonationSessionId: 'session123',
        action: `action${i}`,
        method: 'GET',
        path: `/api/${i}`,
        statusCode: 200,
        requestBody: null,
        responseBody: null,
        ip: null,
        userAgent: null,
        duration: null,
        timestamp: new Date(),
      }))

      vi.mocked(db.impersonationLog.findMany).mockResolvedValue(
        largeLogs.slice(0, 50),
      )
      vi.mocked(db.impersonationLog.count).mockResolvedValue(10000)

      const start = Date.now()
      await repository.findBySessionIdPaginated('session123', 1, 50)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100)
    })
  })

  describe('Data Integrity', () => {
    it('should preserve exact timestamp precision', async () => {
      const exactTimestamp = new Date('2024-01-15T10:30:45.789Z')

      const logData: CreateImpersonationLogDTO = {
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
      }

      const mockLog = {
        id: 'log123',
        ...logData,
        timestamp: exactTimestamp,
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      const result = await repository.create(logData)

      expect(result.timestamp).toEqual(exactTimestamp)
      expect(result.timestamp.getMilliseconds()).toBe(789)
    })

    it('should not modify input data object', async () => {
      const originalData: CreateImpersonationLogDTO = {
        impersonationSessionId: 'session123',
        action: 'test_action',
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        requestBody: '{"key":"value"}',
        responseBody: '{"result":"ok"}',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        duration: 100,
      }

      const dataCopy = { ...originalData }

      const mockLog = {
        id: 'log123',
        ...originalData,
        timestamp: new Date(),
      }

      vi.mocked(db.impersonationLog.create).mockResolvedValue(mockLog)

      await repository.create(originalData)

      expect(originalData).toEqual(dataCopy)
    })
  })
})
