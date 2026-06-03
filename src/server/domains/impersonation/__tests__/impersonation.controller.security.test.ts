import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'

import { ImpersonationController } from '../impersonation.controller'
import type { ImpersonationService } from '../impersonation.service'

vi.mock('@/server/shared/middleware/auth.middleware', () => ({
  requireAdminAuth: vi.fn(),
}))

vi.mock('@/server/shared/utils/audit.logger', () => ({
  auditLogger: {
    logImpersonationStart: vi.fn(),
    logImpersonationEnd: vi.fn(),
  },
}))

import { requireAdminAuth } from '@/server/shared/middleware/auth.middleware'

describe('ImpersonationController - Security Tests', () => {
  let controller: ImpersonationController
  let mockService: ImpersonationService

  const mockAdminSession = {
    user: {
      id: 'cmm2jrtqd00000unzmue1gerr',
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'admin',
      emailVerified: new Date(),
    },
  }

  beforeEach(() => {
    mockService = {
      startImpersonation: vi.fn(),
      getActiveImpersonation: vi.fn(),
      endImpersonation: vi.fn(),
    } as unknown as ImpersonationService

    controller = new ImpersonationController(mockService)

    vi.mocked(requireAdminAuth).mockResolvedValue(mockAdminSession as any)
    vi.clearAllMocks()
  })

  describe('startImpersonation - CUID Validation', () => {
    it('should reject invalid CUID format - too short', async () => {
      const invalidRequest = new NextRequest('http://localhost:3000/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'invalid123',
        }),
      })

      const response = await controller.startImpersonation(invalidRequest)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user ID format',
        },
      })
      expect(mockService.startImpersonation).not.toHaveBeenCalled()
    })

    it('should reject invalid CUID format - wrong prefix', async () => {
      const invalidRequest = new NextRequest('http://localhost:3000/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'amm2jrtqd00000unzmue1gerr',
        }),
      })

      const response = await controller.startImpersonation(invalidRequest)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user ID format',
        },
      })
      expect(mockService.startImpersonation).not.toHaveBeenCalled()
    })

    it('should reject invalid CUID format - uppercase letters', async () => {
      const invalidRequest = new NextRequest('http://localhost:3000/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'cMM2jrtqd00000unzmue1gerr',
        }),
      })

      const response = await controller.startImpersonation(invalidRequest)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user ID format',
        },
      })
      expect(mockService.startImpersonation).not.toHaveBeenCalled()
    })

    it('should reject invalid CUID format - special characters', async () => {
      const invalidRequest = new NextRequest('http://localhost:3000/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'cmm2jrtqd00000unzmue1ger!',
        }),
      })

      const response = await controller.startImpersonation(invalidRequest)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid user ID format',
        },
      })
      expect(mockService.startImpersonation).not.toHaveBeenCalled()
    })

    it('should accept valid CUID format', async () => {
      const validRequest = new NextRequest('http://localhost:3000/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        }),
      })

      const mockSession = {
        id: 'cses0000000000000000000001',
        adminId: 'cmm2jrtqd00000unzmue1gerr',
        targetUserId: 'cmm2jrtqd00000unzmue1gerr',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
        ip: null,
        userAgent: null,
      }

      const mockActiveImpersonation = {
        sessionId: 'cses0000000000000000000001',
        adminId: 'cmm2jrtqd00000unzmue1gerr',
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

      const response = await controller.startImpersonation(validRequest)

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(mockService.startImpersonation).toHaveBeenCalled()
    })
  })

  describe('endImpersonation - CUID Validation', () => {
    it('should reject invalid session ID format', async () => {
      const invalidRequest = new NextRequest('http://localhost:3000/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'invalid-session-id',
        }),
      })

      const response = await controller.endImpersonation(invalidRequest)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid session ID format',
        },
      })
      expect(mockService.endImpersonation).not.toHaveBeenCalled()
    })
  })
})
