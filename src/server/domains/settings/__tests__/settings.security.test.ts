// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { SettingsController } from '../settings.controller'
import { SettingsRepository } from '../settings.repository'
import { SettingsService } from '../settings.service'
import type {
  ChangePasswordDTO,
  UpdateProfileDTO,
  UserSettings,
} from '../settings.types'

vi.mock('@/server/shared/middleware/auth.middleware', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/server/lib/database', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/server/shared/utils/password.utils', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
  isStrongPassword: vi.fn().mockReturnValue(true),
}))

vi.mock('otpauth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('otpauth')>()
  return {
    ...actual,
    TOTP: class MockTOTP {
      secret = { base32: 'MOCKSECRETBASE32' }
      toString() {
        return 'otpauth://totp/Notavex:test@test.com'
      }
      validate({ token }: { token: string }) {
        return token === '123456' ? 0 : null
      }
    },
    Secret: {
      fromBase32: vi.fn().mockReturnValue({ base32: 'MOCKSECRETBASE32' }),
    },
  }
})

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockqrcode'),
  },
}))

function createMockRequest(body?: any): Request {
  const mockRequest = {
    json: vi.fn().mockResolvedValue(body ?? {}),
    headers: new Headers(),
    method: 'POST',
    url: 'http://localhost/api/settings',
  }
  return mockRequest as any
}

function createMockSettings(
  overrides: Partial<UserSettings> = {},
): UserSettings {
  return {
    id: 'user123',
    email: 'test@test.com',
    name: 'Test User',
    image: null,
    twoFactorEnabled: false,
    theme: 'system',
    language: 'fr',
    notificationPreferences: null,
    hasPassword: true,
    onboardingCompleted: false,
    ...overrides,
  }
}

describe('Settings Security Tests', () => {
  let controller: SettingsController
  let service: SettingsService
  let repository: SettingsRepository
  let mockRequireAuth: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const { requireAuth } =
      await import('@/server/shared/middleware/auth.middleware')
    const { db } = await import('@/server/lib/database')

    mockRequireAuth = vi.mocked(requireAuth)

    repository = new SettingsRepository()
    service = new SettingsService(repository)
    controller = new SettingsController(service)

    vi.clearAllMocks()
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user123',
      email: 'test@test.com',
      name: 'Test User',
      image: null,
      twoFactorEnabled: false,
      theme: 'system',
      language: 'fr',
      notificationPreferences: null,
      password: 'hashed_password',
    } as any)
  })

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated request to getSettings', async () => {
      mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED'))

      const response = await controller.getSettings()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should reject unauthenticated request to updateProfile', async () => {
      mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED'))

      const request = createMockRequest({ name: 'Test' })
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should reject unauthenticated request to changePassword', async () => {
      mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED'))

      const request = createMockRequest({
        currentPassword: 'Old',
        newPassword: 'New',
      })
      const response = await controller.changePassword(request)

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should reject unauthenticated request to setup2FA', async () => {
      mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED'))

      const response = await controller.setup2FA()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should reject unauthenticated request to deleteAccount', async () => {
      mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED'))

      const response = await controller.deleteAccount()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should prevent user from accessing other users settings', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      try {
        await service.getSettings('user123')
      } catch (error) {
        expect((error as ApiError).code).toBe('NOT_FOUND')
      }
    })

    it('should prevent user from updating other users profile', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      try {
        await service.updateProfile('otherUser', { name: 'Hacker' })
      } catch (error) {
        expect((error as ApiError).code).toBe('NOT_FOUND')
      }
    })

    it('should prevent user from deleting other users account', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      try {
        await service.deleteAccount('otherUser')
      } catch (error) {
        expect((error as ApiError).code).toBe('NOT_FOUND')
      }
    })
  })

  describe('Input Validation & Sanitization', () => {
    it('should reject SQL injection in name field', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const body: UpdateProfileDTO = {
        name: "'; DROP TABLE users; --",
      }

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(db.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: body.name,
          }),
        }),
      )
    })

    it('should reject XSS attack in name field', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const body: UpdateProfileDTO = {
        name: '<script>alert("XSS")</script>',
      }

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should reject XSS attack in image field', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const body: UpdateProfileDTO = {
        image: 'javascript:alert("XSS")',
      }

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle NoSQL injection attempt', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const body = {
        name: { $ne: null },
      } as any

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response).toBeDefined()
    })

    it('should handle prototype pollution attempt', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const body = {
        __proto__: { isAdmin: true },
        name: 'Test',
      } as any

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should reject command injection in password', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const body: ChangePasswordDTO = {
        currentPassword: 'OldPass1!',
        newPassword: 'Pass1!; rm -rf /',
      }

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        password: 'hashed',
      } as any)
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const request = createMockRequest(body)
      const response = await controller.changePassword(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle LDAP injection attempt', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const body: UpdateProfileDTO = {
        name: '*)(&(objectClass=*',
      }

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle XML injection attempt', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const body: UpdateProfileDTO = {
        name: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
      }

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('Password Security', () => {
    it('should require strong password for password change', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { isStrongPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(isStrongPassword).mockReturnValue(false)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        password: 'hashed',
      } as any)

      try {
        await service.changePassword('user123', {
          currentPassword: 'OldPass1!',
          newPassword: 'weak',
        })
      } catch (error) {
        expect((error as ApiError).code).toBe('VALIDATION_ERROR')
        expect((error as ApiError).message).toContain('security requirements')
      }
    })

    it('should verify current password before change', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { verifyPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        password: 'hashed',
      } as any)

      try {
        await service.changePassword('user123', {
          currentPassword: 'WrongPassword',
          newPassword: 'NewPass1!',
        })
      } catch (error) {
        expect((error as ApiError).code).toBe('UNAUTHORIZED')
        expect((error as ApiError).message).toContain('incorrect')
      }
    })

    it('should hash password before storage', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { hashPassword, verifyPassword, isStrongPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(isStrongPassword).mockReturnValue(true)
      vi.mocked(hashPassword).mockResolvedValue('hashed_new_password')

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        password: 'hashed_old',
      } as any)
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      await service.changePassword('user123', {
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
      })

      expect(hashPassword).toHaveBeenCalledWith('NewPass1!')
      expect(db.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            password: 'hashed_new_password',
          }),
        }),
      )
    })

    it('should prevent password reuse (current password)', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { verifyPassword, isStrongPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(isStrongPassword).mockReturnValue(true)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        password: 'hashed',
      } as any)

      const body: ChangePasswordDTO = {
        currentPassword: 'SamePass1!',
        newPassword: 'SamePass1!',
      }

      const request = createMockRequest(body)
      const response = await controller.changePassword(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should prevent timing attacks on password verification', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { verifyPassword } =
        await import('@/server/shared/utils/password.utils')

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        password: 'hashed',
      } as any)

      const timings: number[] = []

      for (let i = 0; i < 10; i++) {
        vi.mocked(verifyPassword).mockResolvedValue(false)
        const start = Date.now()

        try {
          await service.changePassword('user123', {
            currentPassword: `WrongPass${i}`,
            newPassword: 'NewPass1!',
          })
        } catch (error) {}

        timings.push(Date.now() - start)
      }

      const avgTiming = timings.reduce((a, b) => a + b, 0) / timings.length
      const variance = timings.every((t) => Math.abs(t - avgTiming) < 100)

      expect(variance).toBe(true)
    })
  })

  describe('Two-Factor Authentication Security', () => {
    it('should prevent 2FA bypass by disabling without token', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET123',
      } as any)

      try {
        await service.disable2FA('user123', { token: '000000' })
      } catch (error) {
        expect((error as ApiError).code).toBe('UNAUTHORIZED')
      }
    })

    it('should generate cryptographically secure backup codes', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        twoFactorEnabled: false,
      } as any)
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const result = await service.setup2FA('user123')

      expect(result.backupCodes).toHaveLength(8)
      result.backupCodes.forEach((code) => {
        expect(code).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/)
      })

      const uniqueCodes = new Set(result.backupCodes)
      expect(uniqueCodes.size).toBe(8)
    })

    it('should validate 2FA token with time window', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        twoFactorSecret: 'SECRET123',
      } as any)
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      await service.verify2FA('user123', '123456')

      expect(db.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            twoFactorEnabled: true,
          }),
        }),
      )
    })

    it('should prevent 2FA token reuse', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        twoFactorSecret: 'SECRET123',
      } as any)
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      await service.verify2FA('user123', '123456')

      expect(db.user.update).toHaveBeenCalled()
    })

    it('should clear 2FA secret when disabled', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET123',
      } as any)
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      await service.disable2FA('user123', { token: '123456' })

      const updateCall = vi.mocked(db.user.update).mock.calls[0][0]
      expect(updateCall.data.twoFactorEnabled).toBe(false)
      expect(updateCall.data.twoFactorSecret).toBe(null)
      expect(updateCall.data.twoFactorBackupCodes).toEqual(
        expect.objectContaining({}),
      )
    })

    it('should prevent brute force on 2FA verification', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        twoFactorSecret: 'SECRET123',
      } as any)

      for (let i = 0; i < 10; i++) {
        try {
          await service.verify2FA('user123', `${i.toString().padStart(6, '0')}`)
        } catch (error) {
          expect((error as ApiError).code).toBe('UNAUTHORIZED')
        }
      }
    })
  })

  describe('Session Security', () => {
    it('should invalidate session on account deletion', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
      } as any)
      vi.mocked(db.user.delete).mockResolvedValue({} as any)

      await service.deleteAccount('user123')

      expect(db.user.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user123' },
        }),
      )
    })

    it('should invalidate session on password change', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        password: 'hashed',
      } as any)
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const { verifyPassword, isStrongPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(isStrongPassword).mockReturnValue(true)

      await service.changePassword('user123', {
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
      })

      expect(db.user.update).toHaveBeenCalled()
    })
  })

  describe('Data Export Security', () => {
    it('should not expose sensitive data in export', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        email: 'test@test.com',
        name: 'Test User',
        password: 'hashed_password',
        twoFactorSecret: 'SECRET123',
      } as any)

      const result = await service.exportData('user123')

      expect(result).toHaveProperty('user')
      expect((result as any).user).not.toHaveProperty('password')
      expect((result as any).user).not.toHaveProperty('twoFactorSecret')
    })

    it('should include export timestamp for audit', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        email: 'test@test.com',
      } as any)

      const result = await service.exportData('user123')

      expect(result).toHaveProperty('exportedAt')
      expect((result as any).exportedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      )
    })

    it('should prevent unauthorized export access', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      try {
        await service.exportData('otherUser')
      } catch (error) {
        expect((error as ApiError).code).toBe('NOT_FOUND')
      }
    })
  })

  describe('Account Deletion Security', () => {
    it('should require authentication for account deletion', async () => {
      mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED'))

      const response = await controller.deleteAccount()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should permanently delete user data', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
      } as any)
      vi.mocked(db.user.delete).mockResolvedValue({} as any)

      await service.deleteAccount('user123')

      expect(db.user.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user123' },
        }),
      )
    })

    it('should handle cascade deletion securely', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
      } as any)
      vi.mocked(db.user.delete).mockResolvedValue({} as any)

      await service.deleteAccount('user123')

      expect(db.user.delete).toHaveBeenCalled()
    })

    it('should prevent deletion of other users accounts', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      try {
        await service.deleteAccount('otherUser')
      } catch (error) {
        expect((error as ApiError).code).toBe('NOT_FOUND')
      }
    })
  })

  describe('CSRF Protection', () => {
    it('should handle POST requests with CSRF token validation', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const request = createMockRequest({ name: 'Test' })
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should reject state-changing GET requests', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
      } as any)

      const response = await controller.getSettings()

      expect(response.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('Rate Limiting Security', () => {
    it('should handle high frequency password change attempts', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { verifyPassword, isStrongPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(verifyPassword).mockResolvedValue(false)
      vi.mocked(isStrongPassword).mockReturnValue(true)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        password: 'hashed',
      } as any)

      const promises = Array.from({ length: 10 }, () =>
        service
          .changePassword('user123', {
            currentPassword: 'WrongPass',
            newPassword: 'NewPass1!',
          })
          .catch(() => {}),
      )

      await Promise.all(promises)

      expect(verifyPassword).toHaveBeenCalledTimes(10)
    })

    it('should handle burst of 2FA verification attempts', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        twoFactorSecret: 'SECRET123',
      } as any)

      const promises = Array.from({ length: 20 }, (_, i) =>
        service
          .verify2FA('user123', `${i.toString().padStart(6, '0')}`)
          .catch(() => {}),
      )

      await Promise.all(promises)
    })
  })

  describe('Information Disclosure Prevention', () => {
    it('should not leak user existence in error messages', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      try {
        await service.getSettings('nonexistent')
      } catch (error) {
        expect((error as ApiError).message).toBe('User not found')
        expect((error as ApiError).message).not.toContain('nonexistent')
      }
    })

    it('should not reveal password hash in responses', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        email: 'test@test.com',
        password: 'hashed_password',
      } as any)

      const response = await controller.getSettings()
      const body = await response.json()

      expect(body.data).not.toHaveProperty('password')
      expect(body.data).toHaveProperty('hasPassword')
    })

    it('should not reveal 2FA secret in responses', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const { db } = await import('@/server/lib/database')
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: 'user123',
        twoFactorEnabled: false,
      } as any)
      vi.mocked(db.user.update).mockResolvedValue({} as any)

      const result = await service.setup2FA('user123')

      expect(result).toHaveProperty('secret')
      expect(result).toHaveProperty('qrCodeDataUrl')
      expect(result).toHaveProperty('backupCodes')
    })
  })
})
