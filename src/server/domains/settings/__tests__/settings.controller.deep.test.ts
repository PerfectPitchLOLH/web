// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { SettingsController } from '../settings.controller'
import { SettingsService } from '../settings.service'
import type {
  ChangePasswordDTO,
  Disable2FADTO,
  UpdateAppearanceDTO,
  UpdateNotificationsDTO,
  UpdateProfileDTO,
  UserSettings,
  Verify2FADTO,
} from '../settings.types'

vi.mock('@/server/shared/middleware/auth.middleware', () => ({
  requireAuth: vi.fn(),
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

describe('SettingsController - Deep Tests', () => {
  let controller: SettingsController
  let mockService: SettingsService
  let mockRequireAuth: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const { requireAuth } =
      await import('@/server/shared/middleware/auth.middleware')
    mockRequireAuth = vi.mocked(requireAuth)

    mockService = {
      getSettings: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      setup2FA: vi.fn(),
      verify2FA: vi.fn(),
      disable2FA: vi.fn(),
      updateNotifications: vi.fn(),
      updateAppearance: vi.fn(),
      completeOnboarding: vi.fn(),
      exportData: vi.fn(),
      deleteAccount: vi.fn(),
    } as any

    controller = new SettingsController(mockService)
    vi.clearAllMocks()
  })

  describe('Authentication Edge Cases', () => {
    it('should reject request without authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('UNAUTHORIZED'))

      const response = await controller.getSettings()
      const body = await response.json()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(body.success).toBe(false)
    })

    it('should reject request with invalid session', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: '', email: '', role: 'user' },
      } as any)
      vi.mocked(mockService.getSettings).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Invalid session',
        ),
      )

      const response = await controller.getSettings()
      const body = await response.json()

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(body.success).toBe(false)
    })

    it('should handle expired session gracefully', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Session expired'))

      const response = await controller.getSettings()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should handle concurrent authentication checks', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.getSettings).mockResolvedValue(createMockSettings())

      const promises = Array.from({ length: 5 }, () => controller.getSettings())

      const responses = await Promise.all(promises)

      expect(responses).toHaveLength(5)
      responses.forEach((response) => {
        expect(response.status).toBe(HTTP_STATUS.OK)
      })
    })
  })

  describe('GET /settings - Edge Cases', () => {
    it('should return settings for authenticated user', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.getSettings).mockResolvedValue(createMockSettings())

      const response = await controller.getSettings()
      const body = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(body.success).toBe(true)
      expect(body.data).toEqual(createMockSettings())
    })

    it('should handle user not found', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'nonexistent', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.getSettings).mockRejectedValue(
        new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found'),
      )

      const response = await controller.getSettings()
      const body = await response.json()

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(body.success).toBe(false)
      expect(body.error?.message).toContain('User not found')
    })

    it('should handle database timeout', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.getSettings).mockRejectedValue(
        new Error('Database timeout'),
      )

      const response = await controller.getSettings()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })

  describe('PATCH /settings/profile - Edge Cases', () => {
    it('should update profile with valid data', async () => {
      const body: UpdateProfileDTO = { name: 'New Name' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateProfile).mockResolvedValue(
        createMockSettings({ name: 'New Name' }),
      )

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(responseBody.success).toBe(true)
      expect(responseBody.data.name).toBe('New Name')
    })

    it('should reject empty name', async () => {
      const body: UpdateProfileDTO = { name: '' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateProfile).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.BAD_REQUEST,
          'Name must be at least 2 characters',
        ),
      )

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(responseBody.success).toBe(false)
    })

    it('should handle malformed JSON body', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const request = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any

      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should handle very large payload (>1MB)', async () => {
      const largeBody = { name: 'A'.repeat(1024 * 1024 * 2) }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const request = createMockRequest(largeBody)
      const response = await controller.updateProfile(request)

      expect(response).toBeDefined()
    })

    it('should handle NULL values in body', async () => {
      const body = { name: null as any }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateProfile).mockResolvedValue(
        createMockSettings(),
      )

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle undefined values in body', async () => {
      const body = { name: undefined }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateProfile).mockResolvedValue(
        createMockSettings(),
      )

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle XSS attempt in name', async () => {
      const body = { name: '<script>alert("XSS")</script>' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateProfile).mockResolvedValue(
        createMockSettings({ name: body.name }),
      )

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle SQL injection attempt in name', async () => {
      const body = { name: "'; DROP TABLE users; --" }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateProfile).mockResolvedValue(
        createMockSettings({ name: body.name }),
      )

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle unicode and emojis in name', async () => {
      const body = { name: '测试 🚀 José María Ñoño' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateProfile).mockResolvedValue(
        createMockSettings({ name: body.name }),
      )

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(responseBody.data.name).toBe(body.name)
    })

    it('should handle very long image URL (data URI)', async () => {
      const body = { image: 'data:image/png;base64,' + 'A'.repeat(10000) }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateProfile).mockResolvedValue(
        createMockSettings({ image: body.image }),
      )

      const request = createMockRequest(body)
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('POST /settings/password - Edge Cases', () => {
    it('should change password with valid credentials', async () => {
      const body: ChangePasswordDTO = {
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
      }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.changePassword).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.changePassword(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(responseBody.success).toBe(true)
    })

    it('should reject password change for OAuth users', async () => {
      const body: ChangePasswordDTO = {
        currentPassword: 'any',
        newPassword: 'NewPass1!',
      }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.changePassword).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.BAD_REQUEST,
          'Cannot change password for OAuth accounts',
        ),
      )

      const request = createMockRequest(body)
      const response = await controller.changePassword(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(responseBody.success).toBe(false)
    })

    it('should reject incorrect current password', async () => {
      const body: ChangePasswordDTO = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPass1!',
      }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.changePassword).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Current password is incorrect',
        ),
      )

      const request = createMockRequest(body)
      const response = await controller.changePassword(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(responseBody.success).toBe(false)
    })

    it('should reject weak new password', async () => {
      const body: ChangePasswordDTO = {
        currentPassword: 'OldPass1!',
        newPassword: 'weak',
      }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.changePassword).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.BAD_REQUEST,
          'New password does not meet security requirements',
        ),
      )

      const request = createMockRequest(body)
      const response = await controller.changePassword(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(responseBody.success).toBe(false)
    })

    it('should handle missing currentPassword field', async () => {
      const body = { newPassword: 'NewPass1!' } as any
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const request = createMockRequest(body)
      const response = await controller.changePassword(request)

      expect(response).toBeDefined()
    })

    it('should handle missing newPassword field', async () => {
      const body = { currentPassword: 'OldPass1!' } as any
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const request = createMockRequest(body)
      const response = await controller.changePassword(request)

      expect(response).toBeDefined()
    })

    it('should handle very long password (>72 chars)', async () => {
      const body: ChangePasswordDTO = {
        currentPassword: 'OldPass1!',
        newPassword: 'A'.repeat(100) + '1!',
      }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.changePassword).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.changePassword(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle password with unicode characters', async () => {
      const body: ChangePasswordDTO = {
        currentPassword: 'OldPáss1!',
        newPassword: 'NewPässw0rd!测试',
      }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.changePassword).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.changePassword(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('POST /settings/2fa/setup - Edge Cases', () => {
    it('should setup 2FA for user', async () => {
      const setup2FAResult = {
        secret: 'SECRET123',
        uri: 'otpauth://totp/test',
        qrCodeDataUrl: 'data:image/png;base64,abc',
        backupCodes: ['ABC12-345', 'DEF67-890'],
      }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.setup2FA).mockResolvedValue(setup2FAResult)

      const response = await controller.setup2FA()
      const body = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(body.success).toBe(true)
      expect(body.data).toEqual(setup2FAResult)
    })

    it('should reject 2FA setup when already enabled', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.setup2FA).mockRejectedValue(
        new ApiError(
          'CONFLICT',
          HTTP_STATUS.CONFLICT,
          '2FA is already enabled',
        ),
      )

      const response = await controller.setup2FA()
      const body = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CONFLICT)
      expect(body.success).toBe(false)
    })

    it('should handle QR code generation failure', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.setup2FA).mockRejectedValue(
        new Error('QR code generation failed'),
      )

      const response = await controller.setup2FA()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })

  describe('POST /settings/2fa/verify - Edge Cases', () => {
    it('should verify 2FA with valid token', async () => {
      const body: Verify2FADTO = { token: '123456' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.verify2FA).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.verify2FA(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(responseBody.success).toBe(true)
    })

    it('should reject invalid 2FA token', async () => {
      const body: Verify2FADTO = { token: '000000' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.verify2FA).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Invalid 2FA code',
        ),
      )

      const request = createMockRequest(body)
      const response = await controller.verify2FA(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(responseBody.success).toBe(false)
    })

    it('should reject 2FA verification without setup', async () => {
      const body: Verify2FADTO = { token: '123456' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.verify2FA).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.BAD_REQUEST,
          '2FA setup not initiated',
        ),
      )

      const request = createMockRequest(body)
      const response = await controller.verify2FA(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(responseBody.success).toBe(false)
    })

    it('should handle missing token field', async () => {
      const body = {} as any
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)

      const request = createMockRequest(body)
      const response = await controller.verify2FA(request)

      expect(response).toBeDefined()
    })

    it('should handle non-numeric token', async () => {
      const body: Verify2FADTO = { token: 'abcdef' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.verify2FA).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Invalid 2FA code',
        ),
      )

      const request = createMockRequest(body)
      const response = await controller.verify2FA(request)

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should handle token with wrong length', async () => {
      const body: Verify2FADTO = { token: '123' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.verify2FA).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Invalid 2FA code',
        ),
      )

      const request = createMockRequest(body)
      const response = await controller.verify2FA(request)

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })
  })

  describe('POST /settings/2fa/disable - Edge Cases', () => {
    it('should disable 2FA with valid token', async () => {
      const body: Disable2FADTO = { token: '123456' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.disable2FA).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.disable2FA(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(responseBody.success).toBe(true)
    })

    it('should reject 2FA disable when not enabled', async () => {
      const body: Disable2FADTO = { token: '123456' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.disable2FA).mockRejectedValue(
        new ApiError(
          'VALIDATION_ERROR',
          HTTP_STATUS.BAD_REQUEST,
          '2FA is not enabled',
        ),
      )

      const request = createMockRequest(body)
      const response = await controller.disable2FA(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(responseBody.success).toBe(false)
    })

    it('should reject 2FA disable with wrong token', async () => {
      const body: Disable2FADTO = { token: '000000' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.disable2FA).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Invalid 2FA code',
        ),
      )

      const request = createMockRequest(body)
      const response = await controller.disable2FA(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(responseBody.success).toBe(false)
    })
  })

  describe('PATCH /settings/notifications - Edge Cases', () => {
    it('should update notification preferences', async () => {
      const body: UpdateNotificationsDTO = { marketing: false }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateNotifications).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.updateNotifications(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(responseBody.success).toBe(true)
    })

    it('should handle all preferences set to false', async () => {
      const body: UpdateNotificationsDTO = {
        marketing: false,
        security: false,
        updates: false,
        activity: false,
      }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateNotifications).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.updateNotifications(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle empty notification update', async () => {
      const body: UpdateNotificationsDTO = {}
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateNotifications).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.updateNotifications(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle invalid boolean values', async () => {
      const body = { marketing: 'true' } as any
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateNotifications).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.updateNotifications(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('PATCH /settings/appearance - Edge Cases', () => {
    it('should update theme preference', async () => {
      const body: UpdateAppearanceDTO = { theme: 'dark' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateAppearance).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.updateAppearance(request)
      const responseBody = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(responseBody.success).toBe(true)
    })

    it('should update language preference', async () => {
      const body: UpdateAppearanceDTO = { language: 'en' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateAppearance).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.updateAppearance(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should update both theme and language', async () => {
      const body: UpdateAppearanceDTO = { theme: 'dark', language: 'en' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateAppearance).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.updateAppearance(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle empty appearance update', async () => {
      const body: UpdateAppearanceDTO = {}
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateAppearance).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.updateAppearance(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle invalid theme value', async () => {
      const body = { theme: 'invalid' } as any
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateAppearance).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.updateAppearance(request)

      expect(response).toBeDefined()
    })

    it('should handle invalid language value', async () => {
      const body = { language: 'es' } as any
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateAppearance).mockResolvedValue(undefined)

      const request = createMockRequest(body)
      const response = await controller.updateAppearance(request)

      expect(response).toBeDefined()
    })
  })

  describe('GET /settings/export - Edge Cases', () => {
    it('should export user data', async () => {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: createMockSettings(),
      }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.exportData).mockResolvedValue(exportData)

      const response = await controller.exportData()
      const body = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(body.success).toBe(true)
      expect(body.data).toEqual(exportData)
    })

    it('should include timestamp in export', async () => {
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: createMockSettings(),
      }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.exportData).mockResolvedValue(exportData)

      const response = await controller.exportData()
      const body = await response.json()

      expect(body.data.exportedAt).toBeDefined()
    })
  })

  describe('DELETE /settings/account - Edge Cases', () => {
    it('should delete user account', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.deleteAccount).mockResolvedValue(undefined)

      const response = await controller.deleteAccount()
      const body = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(body.success).toBe(true)
      expect(body.data).toBeNull()
    })

    it('should reject deletion of non-existent account', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'nonexistent', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.deleteAccount).mockRejectedValue(
        new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'User not found'),
      )

      const response = await controller.deleteAccount()
      const body = await response.json()

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(body.success).toBe(false)
    })

    it('should handle cascade deletion errors', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.deleteAccount).mockRejectedValue(
        new Error('Foreign key constraint'),
      )

      const response = await controller.deleteAccount()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })

  describe('Error Handling - All Methods', () => {
    it('should handle unexpected errors in getSettings', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.getSettings).mockRejectedValue(
        new Error('Unexpected error'),
      )

      const response = await controller.getSettings()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should handle unexpected errors in updateProfile', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateProfile).mockRejectedValue(
        new Error('Unexpected error'),
      )

      const request = createMockRequest({ name: 'Test' })
      const response = await controller.updateProfile(request)

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should handle unexpected errors in changePassword', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.changePassword).mockRejectedValue(
        new Error('Unexpected error'),
      )

      const request = createMockRequest({
        currentPassword: 'Old',
        newPassword: 'New',
      })
      const response = await controller.changePassword(request)

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })
  })

  describe('Rate Limiting Scenarios', () => {
    it('should handle burst of requests', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.getSettings).mockResolvedValue(createMockSettings())

      const promises = Array.from({ length: 100 }, () =>
        controller.getSettings(),
      )

      const responses = await Promise.all(promises)

      expect(responses).toHaveLength(100)
    })

    it('should handle concurrent profile updates', async () => {
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateProfile).mockResolvedValue(
        createMockSettings(),
      )

      const promises = Array.from({ length: 10 }, (_, i) => {
        const request = createMockRequest({ name: `Name ${i}` })
        return controller.updateProfile(request)
      })

      const responses = await Promise.all(promises)

      expect(responses).toHaveLength(10)
    })
  })

  describe('Idempotence', () => {
    it('should be idempotent for appearance updates', async () => {
      const body: UpdateAppearanceDTO = { theme: 'dark' }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateAppearance).mockResolvedValue(undefined)

      const request1 = createMockRequest(body)
      const request2 = createMockRequest(body)
      const request3 = createMockRequest(body)

      const response1 = await controller.updateAppearance(request1)
      const response2 = await controller.updateAppearance(request2)
      const response3 = await controller.updateAppearance(request3)

      expect(response1.status).toBe(HTTP_STATUS.OK)
      expect(response2.status).toBe(HTTP_STATUS.OK)
      expect(response3.status).toBe(HTTP_STATUS.OK)
    })

    it('should be idempotent for notification updates', async () => {
      const body: UpdateNotificationsDTO = { marketing: false }
      mockRequireAuth.mockResolvedValue({
        user: { id: 'user123', email: 'test@test.com', role: 'user' },
      } as any)
      vi.mocked(mockService.updateNotifications).mockResolvedValue(undefined)

      const request1 = createMockRequest(body)
      const request2 = createMockRequest(body)

      const response1 = await controller.updateNotifications(request1)
      const response2 = await controller.updateNotifications(request2)

      expect(response1.status).toBe(HTTP_STATUS.OK)
      expect(response2.status).toBe(HTTP_STATUS.OK)
    })
  })
})
