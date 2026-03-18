import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { SettingsRepository } from '../settings.repository'
import { SettingsService } from '../settings.service'
import type { UserSettings } from '../settings.types'

vi.mock('@/server/shared/utils/password.utils', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_new_password'),
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
      validate() {
        return 0
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
    ...overrides,
  }
}

describe('SettingsService', () => {
  let service: SettingsService
  let mockRepository: SettingsRepository

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      updateProfile: vi.fn(),
      getPassword: vi.fn(),
      updatePassword: vi.fn(),
      updateTwoFactor: vi.fn(),
      getTwoFactorSecret: vi.fn(),
      updateNotifications: vi.fn(),
      updateAppearance: vi.fn(),
    } as any

    service = new SettingsService(mockRepository)
    vi.clearAllMocks()
  })

  describe('getSettings', () => {
    it('should return user settings', async () => {
      const mockSettings = createMockSettings()
      vi.mocked(mockRepository.findById).mockResolvedValue(mockSettings)

      const result = await service.getSettings('user123')

      expect(result).toEqual(mockSettings)
      expect(mockRepository.findById).toHaveBeenCalledWith('user123')
    })

    it('should throw NOT_FOUND if user does not exist', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.getSettings('nonexistent')).rejects.toThrow(ApiError)

      try {
        await service.getSettings('nonexistent')
      } catch (error) {
        expect((error as ApiError).code).toBe('NOT_FOUND')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }
    })
  })

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const existing = createMockSettings()
      const updated = createMockSettings({ name: 'New Name' })

      vi.mocked(mockRepository.findById)
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated)
      vi.mocked(mockRepository.updateProfile).mockResolvedValue(undefined)

      const result = await service.updateProfile('user123', {
        name: 'New Name',
      })

      expect(result.name).toBe('New Name')
      expect(mockRepository.updateProfile).toHaveBeenCalledWith('user123', {
        name: 'New Name',
      })
    })

    it('should throw VALIDATION_ERROR if name is too short', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())

      await expect(
        service.updateProfile('user123', { name: 'A' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.updateProfile('user123', { name: 'A' })
      } catch (error) {
        expect((error as ApiError).code).toBe('VALIDATION_ERROR')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.BAD_REQUEST)
      }
    })

    it('should throw NOT_FOUND if user does not exist', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(
        service.updateProfile('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(ApiError)
    })
  })

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const { verifyPassword, isStrongPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(mockRepository.getPassword).mockResolvedValue(
        'hashed_old_password',
      )
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(isStrongPassword).mockReturnValue(true)
      vi.mocked(mockRepository.updatePassword).mockResolvedValue(undefined)

      await service.changePassword('user123', {
        currentPassword: 'OldPass1!',
        newPassword: 'NewPass1!',
      })

      expect(mockRepository.updatePassword).toHaveBeenCalledWith(
        'user123',
        'hashed_new_password',
      )
    })

    it('should throw BAD_REQUEST for OAuth accounts (no password)', async () => {
      vi.mocked(mockRepository.getPassword).mockResolvedValue(null)

      await expect(
        service.changePassword('user123', {
          currentPassword: 'any',
          newPassword: 'NewPass1!',
        }),
      ).rejects.toThrow(ApiError)

      try {
        await service.changePassword('user123', {
          currentPassword: 'any',
          newPassword: 'NewPass1!',
        })
      } catch (error) {
        expect((error as ApiError).code).toBe('VALIDATION_ERROR')
      }
    })

    it('should throw UNAUTHORIZED if current password is wrong', async () => {
      const { verifyPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(mockRepository.getPassword).mockResolvedValue('hashed_password')
      vi.mocked(verifyPassword).mockResolvedValue(false)

      await expect(
        service.changePassword('user123', {
          currentPassword: 'WrongPass',
          newPassword: 'NewPass1!',
        }),
      ).rejects.toThrow(ApiError)

      try {
        await service.changePassword('user123', {
          currentPassword: 'WrongPass',
          newPassword: 'NewPass1!',
        })
      } catch (error) {
        expect((error as ApiError).code).toBe('UNAUTHORIZED')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.UNAUTHORIZED)
      }
    })

    it('should throw VALIDATION_ERROR if new password is weak', async () => {
      const { verifyPassword, isStrongPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(mockRepository.getPassword).mockResolvedValue('hashed_password')
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(isStrongPassword).mockReturnValue(false)

      await expect(
        service.changePassword('user123', {
          currentPassword: 'OldPass1!',
          newPassword: 'weak',
        }),
      ).rejects.toThrow(ApiError)

      try {
        await service.changePassword('user123', {
          currentPassword: 'OldPass1!',
          newPassword: 'weak',
        })
      } catch (error) {
        expect((error as ApiError).code).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('setup2FA', () => {
    it('should generate 2FA secret and QR code', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateTwoFactor).mockResolvedValue(undefined)

      const result = await service.setup2FA('user123')

      expect(result).toHaveProperty('secret')
      expect(result).toHaveProperty('uri')
      expect(result).toHaveProperty('qrCodeDataUrl')
      expect(result).toHaveProperty('backupCodes')
      expect(result.backupCodes).toHaveLength(8)
    })

    it('should throw CONFLICT if 2FA is already enabled', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ twoFactorEnabled: true }),
      )

      await expect(service.setup2FA('user123')).rejects.toThrow(ApiError)

      try {
        await service.setup2FA('user123')
      } catch (error) {
        expect((error as ApiError).code).toBe('CONFLICT')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.CONFLICT)
      }
    })
  })

  describe('updateNotifications', () => {
    it('should update notification preferences', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateNotifications).mockResolvedValue(undefined)

      await service.updateNotifications('user123', { marketing: false })

      expect(mockRepository.updateNotifications).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({ marketing: false }),
      )
    })

    it('should merge with existing preferences', async () => {
      const existing = createMockSettings({
        notificationPreferences: {
          marketing: true,
          security: true,
          updates: false,
          activity: true,
        },
      })
      vi.mocked(mockRepository.findById).mockResolvedValue(existing)
      vi.mocked(mockRepository.updateNotifications).mockResolvedValue(undefined)

      await service.updateNotifications('user123', { marketing: false })

      expect(mockRepository.updateNotifications).toHaveBeenCalledWith(
        'user123',
        {
          marketing: false,
          security: true,
          updates: false,
          activity: true,
        },
      )
    })
  })

  describe('updateAppearance', () => {
    it('should update appearance preferences', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateAppearance).mockResolvedValue(undefined)

      await service.updateAppearance('user123', {
        theme: 'dark',
        language: 'en',
      })

      expect(mockRepository.updateAppearance).toHaveBeenCalledWith('user123', {
        theme: 'dark',
        language: 'en',
      })
    })
  })
})
