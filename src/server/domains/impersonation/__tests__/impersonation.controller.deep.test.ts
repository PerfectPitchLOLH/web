// @ts-nocheck
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { requireAdminAuth } from '@/server/shared/middleware/auth.middleware'
import { ApiError } from '@/server/shared/utils/api.utils'
import { auditLogger } from '@/server/shared/utils/audit.logger'

import { ImpersonationController } from '../impersonation.controller'
import type { ImpersonationService } from '../impersonation.service'

vi.mock('@/server/shared/middleware/auth.middleware')
vi.mock('@/server/lib/database', () => ({ db: {} }))
vi.mock('@/server/shared/utils/audit.logger', () => ({
  auditLogger: {
    logImpersonationStart: vi.fn(),
    logImpersonationEnd: vi.fn(),
  },
}))

describe('ImpersonationController - Deep Tests', () => {
  let controller: ImpersonationController
  let mockService: ImpersonationService

  beforeEach(() => {
    mockService = {
      startImpersonation: vi.fn(),
      getActiveImpersonation: vi.fn(),
      endImpersonation: vi.fn(),
      validateImpersonationSession: vi.fn(),
    } as unknown as ImpersonationService

    controller = new ImpersonationController(mockService)
    vi.clearAllMocks()
  })

  describe('startImpersonation - Boundary Values', () => {
    it('should reject empty targetUserId', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: '' }),
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error?.message).toContain('targetUserId is required')
    })

    it('should reject missing targetUserId field', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should reject invalid CUID format (too short)', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'c123' }),
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error?.message).toContain('Invalid user ID format')
    })

    it('should reject invalid CUID format (wrong prefix)', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'xmm2jrtqd00000unzmue1gerr' }),
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error?.message).toContain('Invalid user ID format')
    })

    it('should reject invalid CUID format (uppercase letters)', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cMM2JRTQD00000UNZMUE1GERR' }),
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject CUID with special characters', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: "c'; DROP TABLE users; --" }),
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error?.message).toContain('Invalid user ID format')
    })

    it('should handle extremely long targetUserId (>1000 chars)', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const longId = 'c' + 'a'.repeat(1000)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: longId }),
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should accept valid CUID format', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      const mockActiveImpersonation = {
        sessionId: 'session123',
        adminId: 'admin123',
        adminName: 'Admin User',
        adminEmail: 'admin@test.com',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        targetUserName: 'Target User',
        targetUserEmail: 'user@test.com',
        targetUserRole: 'user',
        startedAt: new Date(),
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(
        mockActiveImpersonation,
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
          headers: {
            'x-forwarded-for': '192.168.1.1',
            'user-agent': 'Mozilla/5.0',
          },
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(data.success).toBe(true)
    })
  })

  describe('startImpersonation - IP Extraction', () => {
    it('should extract IP from x-forwarded-for header (single IP)', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
          headers: {
            'x-forwarded-for': '192.168.1.100',
            'user-agent': 'Mozilla/5.0',
          },
        },
      )

      await controller.startImpersonation(request)

      expect(mockService.startImpersonation).toHaveBeenCalledWith(
        'admin123',
        'cmm2jrtqd00000unzmue1gerr',
        '192.168.1.100',
        'Mozilla/5.0',
      )
    })

    it('should extract first IP from x-forwarded-for header (multiple IPs)', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: '203.0.113.195',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
          headers: {
            'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
            'user-agent': 'Mozilla/5.0',
          },
        },
      )

      await controller.startImpersonation(request)

      expect(mockService.startImpersonation).toHaveBeenCalledWith(
        'admin123',
        'cmm2jrtqd00000unzmue1gerr',
        '203.0.113.195',
        'Mozilla/5.0',
      )
    })

    it('should extract IP from x-real-ip header if x-forwarded-for not present', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: '10.0.0.1',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
          headers: {
            'x-real-ip': '10.0.0.1',
            'user-agent': 'Mozilla/5.0',
          },
        },
      )

      await controller.startImpersonation(request)

      expect(mockService.startImpersonation).toHaveBeenCalledWith(
        'admin123',
        'cmm2jrtqd00000unzmue1gerr',
        '10.0.0.1',
        'Mozilla/5.0',
      )
    })

    it('should handle null IP when no headers present', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: null,
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
          headers: {
            'user-agent': 'Mozilla/5.0',
          },
        },
      )

      await controller.startImpersonation(request)

      expect(mockService.startImpersonation).toHaveBeenCalledWith(
        'admin123',
        'cmm2jrtqd00000unzmue1gerr',
        null,
        'Mozilla/5.0',
      )
    })

    it('should handle IPv6 addresses', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
          headers: {
            'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
            'user-agent': 'Mozilla/5.0',
          },
        },
      )

      await controller.startImpersonation(request)

      expect(mockService.startImpersonation).toHaveBeenCalledWith(
        'admin123',
        'cmm2jrtqd00000unzmue1gerr',
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        'Mozilla/5.0',
      )
    })
  })

  describe('startImpersonation - Cookie Handling', () => {
    it('should set httpOnly cookie in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: null,
        userAgent: null,
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
        },
      )

      const response = await controller.startImpersonation(request)

      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('impersonation_session_id=session123')
      expect(setCookieHeader).toContain('HttpOnly')
      expect(setCookieHeader).toContain('Secure')
      expect(setCookieHeader).toContain('SameSite=strict')

      process.env.NODE_ENV = originalEnv
    })

    it('should set cookie without secure flag in development', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: null,
        userAgent: null,
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
        },
      )

      const response = await controller.startImpersonation(request)

      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('impersonation_session_id=session123')
      expect(setCookieHeader).not.toContain('Secure')

      process.env.NODE_ENV = originalEnv
    })

    it('should set cookie with 30 minute maxAge', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: null,
        userAgent: null,
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
        },
      )

      const response = await controller.startImpersonation(request)

      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('Max-Age=1800')
    })
  })

  describe('startImpersonation - Audit Logging', () => {
    it('should call audit logger with correct parameters', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      const mockActiveImpersonation = {
        sessionId: 'session123',
        adminId: 'admin123',
        adminName: 'Admin User',
        adminEmail: 'admin@test.com',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        targetUserName: 'Target User',
        targetUserEmail: 'user@test.com',
        targetUserRole: 'user',
        startedAt: new Date(),
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(
        mockActiveImpersonation,
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
          headers: {
            'x-forwarded-for': '192.168.1.1',
            'user-agent': 'Mozilla/5.0',
          },
        },
      )

      await controller.startImpersonation(request)

      expect(auditLogger.logImpersonationStart).toHaveBeenCalledWith(
        'admin123',
        'admin@test.com',
        'cmm2jrtqd00000unzmue1gerr',
        'user@test.com',
        '192.168.1.1',
        'Mozilla/5.0',
      )
    })

    it('should not call audit logger if getActiveImpersonation returns null', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: null,
        userAgent: null,
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
        },
      )

      await controller.startImpersonation(request)

      expect(auditLogger.logImpersonationStart).not.toHaveBeenCalled()
    })
  })

  describe('startImpersonation - Error Handling', () => {
    it('should handle ApiError from service', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      vi.mocked(mockService.startImpersonation).mockRejectedValue(
        new ApiError(
          'FORBIDDEN',
          HTTP_STATUS.FORBIDDEN,
          'Cannot impersonate admin',
        ),
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
      expect(data.success).toBe(false)
      expect(data.error?.message).toContain('Cannot impersonate admin')
    })

    it('should handle database connection error', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      vi.mocked(mockService.startImpersonation).mockRejectedValue(
        new Error('Database connection lost'),
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(data.success).toBe(false)
    })

    it('should handle malformed JSON body', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: 'invalid json{',
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(data.success).toBe(false)
    })

    it('should handle authentication failure', async () => {
      vi.mocked(requireAdminAuth).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Not authenticated',
        ),
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
        },
      )

      const response = await controller.startImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(data.success).toBe(false)
    })
  })

  describe('endImpersonation - Validation', () => {
    it('should reject empty sessionId', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'DELETE',
          body: JSON.stringify({ sessionId: '' }),
        },
      )

      const response = await controller.endImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error?.message).toContain('sessionId is required')
    })

    it('should reject missing sessionId field', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'DELETE',
          body: JSON.stringify({}),
        },
      )

      const response = await controller.endImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject invalid CUID format for sessionId', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'DELETE',
          body: JSON.stringify({ sessionId: 'invalid' }),
        },
      )

      const response = await controller.endImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error?.message).toContain('Invalid session ID format')
    })

    it('should reject session ID that does not belong to admin', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockActiveImpersonation = {
        sessionId: 'cmm2jrtqd00000unzmue1gerr',
        adminId: 'admin123',
        adminName: 'Admin User',
        adminEmail: 'admin@test.com',
        targetUserId: 'user123',
        targetUserName: 'Target User',
        targetUserEmail: 'user@test.com',
        targetUserRole: 'user',
        startedAt: new Date(),
      }

      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(
        mockActiveImpersonation,
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'DELETE',
          body: JSON.stringify({ sessionId: 'cmm2jrtqd00000unzmue1gexx' }),
        },
      )

      const response = await controller.endImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
      expect(data.error?.message).toContain(
        'Invalid session or unauthorized access',
      )
    })

    it('should reject if admin has no active impersonation', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'DELETE',
          body: JSON.stringify({ sessionId: 'cmm2jrtqd00000unzmue1gerr' }),
        },
      )

      const response = await controller.endImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
    })
  })

  describe('endImpersonation - Cookie Deletion', () => {
    it('should delete impersonation cookie on success', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockActiveImpersonation = {
        sessionId: 'cmm2jrtqd00000unzmue1gerr',
        adminId: 'admin123',
        adminName: 'Admin User',
        adminEmail: 'admin@test.com',
        targetUserId: 'user123',
        targetUserName: 'Target User',
        targetUserEmail: 'user@test.com',
        targetUserRole: 'user',
        startedAt: new Date(),
      }

      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(
        mockActiveImpersonation,
      )
      vi.mocked(mockService.endImpersonation).mockResolvedValue(undefined)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'DELETE',
          body: JSON.stringify({ sessionId: 'cmm2jrtqd00000unzmue1gerr' }),
        },
      )

      const response = await controller.endImpersonation(request)

      const setCookieHeader = response.headers.get('set-cookie')
      expect(setCookieHeader).toContain('impersonation_session_id=')
      expect(
        setCookieHeader?.includes('Max-Age=0') ||
          setCookieHeader?.includes('Expires=Thu, 01 Jan 1970'),
      ).toBe(true)
    })
  })

  describe('endImpersonation - Audit Logging', () => {
    it('should call audit logger on successful end', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockActiveImpersonation = {
        sessionId: 'cmm2jrtqd00000unzmue1gerr',
        adminId: 'admin123',
        adminName: 'Admin User',
        adminEmail: 'admin@test.com',
        targetUserId: 'user123',
        targetUserName: 'Target User',
        targetUserEmail: 'user@test.com',
        targetUserRole: 'user',
        startedAt: new Date(),
      }

      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(
        mockActiveImpersonation,
      )
      vi.mocked(mockService.endImpersonation).mockResolvedValue(undefined)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'DELETE',
          body: JSON.stringify({ sessionId: 'cmm2jrtqd00000unzmue1gerr' }),
          headers: {
            'x-forwarded-for': '192.168.1.1',
          },
        },
      )

      await controller.endImpersonation(request)

      expect(auditLogger.logImpersonationEnd).toHaveBeenCalledWith(
        'admin123',
        'admin@test.com',
        'user123',
        'user@test.com',
        '192.168.1.1',
      )
    })
  })

  describe('getActiveImpersonation - Success Cases', () => {
    it('should return null when no active impersonation', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/active',
      )

      const response = await controller.getActiveImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data.impersonation).toBeNull()
    })

    it('should return active impersonation info', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockActiveImpersonation = {
        sessionId: 'session123',
        adminId: 'admin123',
        adminName: 'Admin User',
        adminEmail: 'admin@test.com',
        targetUserId: 'user123',
        targetUserName: 'Target User',
        targetUserEmail: 'user@test.com',
        targetUserRole: 'user',
        startedAt: new Date(),
      }

      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(
        mockActiveImpersonation,
      )

      const request = new NextRequest(
        'http://localhost:3000/api/impersonation/active',
      )

      const response = await controller.getActiveImpersonation(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data.impersonation).toBeDefined()
      expect(data.data.impersonation.targetUser.id).toBe('user123')
    })
  })

  describe('Concurrency and Race Conditions', () => {
    it('should handle concurrent startImpersonation calls', async () => {
      vi.mocked(requireAdminAuth).mockResolvedValue({
        user: { id: 'admin123', email: 'admin@test.com', role: 'admin' },
        expires: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        ip: null,
        userAgent: null,
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockService.startImpersonation).mockResolvedValue(mockSession)
      vi.mocked(mockService.getActiveImpersonation).mockResolvedValue(null)

      const request1 = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gerr' }),
        },
      )

      const request2 = new NextRequest(
        'http://localhost:3000/api/impersonation',
        {
          method: 'POST',
          body: JSON.stringify({ targetUserId: 'cmm2jrtqd00000unzmue1gexx' }),
        },
      )

      const [response1, response2] = await Promise.all([
        controller.startImpersonation(request1),
        controller.startImpersonation(request2),
      ])

      expect(response1.status).toBe(HTTP_STATUS.CREATED)
      expect(response2.status).toBe(HTTP_STATUS.CREATED)
    })
  })
})
