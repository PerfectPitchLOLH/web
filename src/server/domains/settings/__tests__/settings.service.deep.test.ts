import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/server/shared/utils'

import { SettingsRepository } from '../settings.repository'
import { SettingsService } from '../settings.service'
import type { UserSettings } from '../settings.types'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../settings.types'

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

describe('SettingsService - Deep Tests', () => {
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
      completeOnboarding: vi.fn(),
      deleteUser: vi.fn(),
    } as any

    service = new SettingsService(mockRepository)
    vi.clearAllMocks()
  })

  describe('Validation Edge Cases - Profile', () => {
    it('should reject name with single character', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())

      await expect(
        service.updateProfile('user123', { name: 'A' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.updateProfile('user123', { name: 'A' })
      } catch (error) {
        expect((error as ApiError).code).toBe('VALIDATION_ERROR')
        expect((error as ApiError).message).toContain('at least 2 characters')
      }
    })

    it('should reject name with only whitespace', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())

      await expect(
        service.updateProfile('user123', { name: '   ' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.updateProfile('user123', { name: '   ' })
      } catch (error) {
        expect((error as ApiError).code).toBe('VALIDATION_ERROR')
      }
    })

    it('should accept name with exactly 2 characters', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateProfile).mockResolvedValue(undefined)
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ name: 'AB' }),
      )

      const result = await service.updateProfile('user123', { name: 'AB' })

      expect(result.name).toBeDefined()
      expect(mockRepository.updateProfile).toHaveBeenCalled()
    })

    it('should accept very long names (>1000 chars)', async () => {
      const longName = 'A'.repeat(1001)
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateProfile).mockResolvedValue(undefined)
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ name: longName }),
      )

      const result = await service.updateProfile('user123', { name: longName })

      expect(result).toBeDefined()
    })

    it('should accept unicode and emojis in name', async () => {
      const unicodeName = '测试 🚀 José María Ñoño'
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateProfile).mockResolvedValue(undefined)
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ name: unicodeName }),
      )

      const result = await service.updateProfile('user123', {
        name: unicodeName,
      })

      expect(result.name).toBe(unicodeName)
    })

    it('should handle name with leading/trailing whitespace', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateProfile).mockResolvedValue(undefined)
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ name: '  Valid Name  ' }),
      )

      const result = await service.updateProfile('user123', {
        name: '  Valid Name  ',
      })

      expect(result).toBeDefined()
    })

    it('should handle undefined name (no update)', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateProfile).mockResolvedValue(undefined)
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())

      const result = await service.updateProfile('user123', { name: undefined })

      expect(result).toBeDefined()
    })

    it('should handle NULL image', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateProfile).mockResolvedValue(undefined)
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ image: null }),
      )

      const result = await service.updateProfile('user123', {
        image: undefined,
      })

      expect(result.image).toBeNull()
    })

    it('should handle very long image URL (data URI)', async () => {
      const longDataUri = 'data:image/png;base64,' + 'A'.repeat(10000)
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateProfile).mockResolvedValue(undefined)
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ image: longDataUri }),
      )

      const result = await service.updateProfile('user123', {
        image: longDataUri,
      })

      expect(result).toBeDefined()
    })
  })

  describe('Validation Edge Cases - Password', () => {
    it('should reject password change for OAuth accounts', async () => {
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
        expect((error as ApiError).message).toContain('OAuth accounts')
      }
    })

    it('should reject incorrect current password', async () => {
      const { verifyPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(mockRepository.getPassword).mockResolvedValue('hashed_password')
      vi.mocked(verifyPassword).mockResolvedValue(false)

      await expect(
        service.changePassword('user123', {
          currentPassword: 'WrongPassword',
          newPassword: 'NewPass1!',
        }),
      ).rejects.toThrow(ApiError)

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

    it('should reject weak new password (no uppercase)', async () => {
      const { verifyPassword, isStrongPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(mockRepository.getPassword).mockResolvedValue('hashed_password')
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(isStrongPassword).mockReturnValue(false)

      await expect(
        service.changePassword('user123', {
          currentPassword: 'OldPass1!',
          newPassword: 'weakpassword',
        }),
      ).rejects.toThrow(ApiError)

      try {
        await service.changePassword('user123', {
          currentPassword: 'OldPass1!',
          newPassword: 'weakpassword',
        })
      } catch (error) {
        expect((error as ApiError).code).toBe('VALIDATION_ERROR')
        expect((error as ApiError).message).toContain('security requirements')
      }
    })

    it('should reject weak new password (too short)', async () => {
      const { verifyPassword, isStrongPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(mockRepository.getPassword).mockResolvedValue('hashed_password')
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(isStrongPassword).mockReturnValue(false)

      await expect(
        service.changePassword('user123', {
          currentPassword: 'OldPass1!',
          newPassword: 'Aa1!',
        }),
      ).rejects.toThrow(ApiError)
    })

    it('should accept strong password with all requirements', async () => {
      const { verifyPassword, isStrongPassword, hashPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(mockRepository.getPassword).mockResolvedValue('hashed_password')
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(isStrongPassword).mockReturnValue(true)
      vi.mocked(hashPassword).mockResolvedValue('hashed_new_password')
      vi.mocked(mockRepository.updatePassword).mockResolvedValue(undefined)

      await service.changePassword('user123', {
        currentPassword: 'OldPass1!',
        newPassword: 'StrongPass123!',
      })

      expect(mockRepository.updatePassword).toHaveBeenCalledWith(
        'user123',
        'hashed_new_password',
      )
    })

    it('should handle very long password (>72 chars bcrypt limit)', async () => {
      const { verifyPassword, isStrongPassword, hashPassword } =
        await import('@/server/shared/utils/password.utils')
      const longPassword = 'A'.repeat(100) + '1!'
      vi.mocked(mockRepository.getPassword).mockResolvedValue('hashed_password')
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(isStrongPassword).mockReturnValue(true)
      vi.mocked(hashPassword).mockResolvedValue('hashed_long_password')
      vi.mocked(mockRepository.updatePassword).mockResolvedValue(undefined)

      await service.changePassword('user123', {
        currentPassword: 'OldPass1!',
        newPassword: longPassword,
      })

      expect(mockRepository.updatePassword).toHaveBeenCalled()
    })

    it('should handle password with unicode characters', async () => {
      const { verifyPassword, isStrongPassword, hashPassword } =
        await import('@/server/shared/utils/password.utils')
      const unicodePassword = 'Pássw0rd!测试'
      vi.mocked(mockRepository.getPassword).mockResolvedValue('hashed_password')
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(isStrongPassword).mockReturnValue(true)
      vi.mocked(hashPassword).mockResolvedValue('hashed_unicode_password')
      vi.mocked(mockRepository.updatePassword).mockResolvedValue(undefined)

      await service.changePassword('user123', {
        currentPassword: 'OldPass1!',
        newPassword: unicodePassword,
      })

      expect(mockRepository.updatePassword).toHaveBeenCalled()
    })
  })

  describe('Two-Factor Authentication - Edge Cases', () => {
    it('should prevent 2FA setup when already enabled', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ twoFactorEnabled: true }),
      )

      await expect(service.setup2FA('user123')).rejects.toThrow(ApiError)

      try {
        await service.setup2FA('user123')
      } catch (error) {
        expect((error as ApiError).code).toBe('CONFLICT')
        expect((error as ApiError).message).toContain('already enabled')
      }
    })

    it('should generate exactly 8 backup codes', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateTwoFactor).mockResolvedValue(undefined)

      const result = await service.setup2FA('user123')

      expect(result.backupCodes).toHaveLength(8)
      result.backupCodes.forEach((code) => {
        expect(code).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/)
      })
    })

    it('should generate unique backup codes', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateTwoFactor).mockResolvedValue(undefined)

      const result = await service.setup2FA('user123')

      const uniqueCodes = new Set(result.backupCodes)
      expect(uniqueCodes.size).toBe(8)
    })

    it('should reject invalid 2FA token format', async () => {
      vi.mocked(mockRepository.getTwoFactorSecret).mockResolvedValue(
        'SECRET123',
      )

      await expect(service.verify2FA('user123', 'invalid')).rejects.toThrow(
        ApiError,
      )

      try {
        await service.verify2FA('user123', 'invalid')
      } catch (error) {
        expect((error as ApiError).code).toBe('UNAUTHORIZED')
        expect((error as ApiError).message).toContain('Invalid 2FA code')
      }
    })

    it('should reject 2FA token with wrong code', async () => {
      vi.mocked(mockRepository.getTwoFactorSecret).mockResolvedValue(
        'SECRET123',
      )

      await expect(service.verify2FA('user123', '000000')).rejects.toThrow(
        ApiError,
      )
    })

    it('should accept valid 2FA token', async () => {
      vi.mocked(mockRepository.getTwoFactorSecret).mockResolvedValue(
        'SECRET123',
      )
      vi.mocked(mockRepository.updateTwoFactor).mockResolvedValue(undefined)

      await service.verify2FA('user123', '123456')

      expect(mockRepository.updateTwoFactor).toHaveBeenCalledWith('user123', {
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET123',
        twoFactorBackupCodes: null,
      })
    })

    it('should reject 2FA verification without setup', async () => {
      vi.mocked(mockRepository.getTwoFactorSecret).mockResolvedValue(null)

      await expect(service.verify2FA('user123', '123456')).rejects.toThrow(
        ApiError,
      )

      try {
        await service.verify2FA('user123', '123456')
      } catch (error) {
        expect((error as ApiError).code).toBe('VALIDATION_ERROR')
        expect((error as ApiError).message).toContain('not initiated')
      }
    })

    it('should reject 2FA disable when not enabled', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ twoFactorEnabled: false }),
      )

      await expect(
        service.disable2FA('user123', { token: '123456' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.disable2FA('user123', { token: '123456' })
      } catch (error) {
        expect((error as ApiError).code).toBe('VALIDATION_ERROR')
        expect((error as ApiError).message).toContain('not enabled')
      }
    })

    it('should reject 2FA disable with wrong token', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ twoFactorEnabled: true }),
      )
      vi.mocked(mockRepository.getTwoFactorSecret).mockResolvedValue(
        'SECRET123',
      )

      await expect(
        service.disable2FA('user123', { token: '000000' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.disable2FA('user123', { token: '000000' })
      } catch (error) {
        expect((error as ApiError).code).toBe('UNAUTHORIZED')
      }
    })

    it('should disable 2FA with correct token', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ twoFactorEnabled: true }),
      )
      vi.mocked(mockRepository.getTwoFactorSecret).mockResolvedValue(
        'SECRET123',
      )
      vi.mocked(mockRepository.updateTwoFactor).mockResolvedValue(undefined)

      await service.disable2FA('user123', { token: '123456' })

      expect(mockRepository.updateTwoFactor).toHaveBeenCalledWith('user123', {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      })
    })

    it('should handle missing secret during disable', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ twoFactorEnabled: true }),
      )
      vi.mocked(mockRepository.getTwoFactorSecret).mockResolvedValue(null)

      await expect(
        service.disable2FA('user123', { token: '123456' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.disable2FA('user123', { token: '123456' })
      } catch (error) {
        expect((error as ApiError).code).toBe('INTERNAL_ERROR')
        expect((error as ApiError).message).toContain('secret not found')
      }
    })
  })

  describe('Notification Preferences - Edge Cases', () => {
    it('should merge partial preferences with defaults when NULL', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ notificationPreferences: null }),
      )
      vi.mocked(mockRepository.updateNotifications).mockResolvedValue(undefined)

      await service.updateNotifications('user123', { marketing: false })

      expect(mockRepository.updateNotifications).toHaveBeenCalledWith(
        'user123',
        {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          marketing: false,
        },
      )
    })

    it('should merge partial preferences with existing', async () => {
      const existing = {
        marketing: true,
        security: false,
        updates: true,
        activity: false,
      }
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ notificationPreferences: existing }),
      )
      vi.mocked(mockRepository.updateNotifications).mockResolvedValue(undefined)

      await service.updateNotifications('user123', { security: true })

      expect(mockRepository.updateNotifications).toHaveBeenCalledWith(
        'user123',
        {
          marketing: true,
          security: true,
          updates: true,
          activity: false,
        },
      )
    })

    it('should handle updating multiple preferences at once', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateNotifications).mockResolvedValue(undefined)

      await service.updateNotifications('user123', {
        marketing: false,
        security: false,
        updates: false,
      })

      expect(mockRepository.updateNotifications).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({
          marketing: false,
          security: false,
          updates: false,
        }),
      )
    })

    it('should handle empty notification update', async () => {
      const existing = {
        marketing: true,
        security: true,
        updates: true,
        activity: true,
      }
      vi.mocked(mockRepository.findById).mockResolvedValue(
        createMockSettings({ notificationPreferences: existing }),
      )
      vi.mocked(mockRepository.updateNotifications).mockResolvedValue(undefined)

      await service.updateNotifications('user123', {})

      expect(mockRepository.updateNotifications).toHaveBeenCalledWith(
        'user123',
        existing,
      )
    })
  })

  describe('Appearance Preferences - Edge Cases', () => {
    it('should accept all valid theme values', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateAppearance).mockResolvedValue(undefined)

      for (const theme of ['light', 'dark', 'system'] as const) {
        await service.updateAppearance('user123', { theme })
        expect(mockRepository.updateAppearance).toHaveBeenCalledWith(
          'user123',
          {
            theme,
          },
        )
      }
    })

    it('should accept all valid language values', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateAppearance).mockResolvedValue(undefined)

      for (const language of ['fr', 'en'] as const) {
        await service.updateAppearance('user123', { language })
        expect(mockRepository.updateAppearance).toHaveBeenCalledWith(
          'user123',
          {
            language,
          },
        )
      }
    })

    it('should handle simultaneous theme and language update', async () => {
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

    it('should handle empty appearance update', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateAppearance).mockResolvedValue(undefined)

      await service.updateAppearance('user123', {})

      expect(mockRepository.updateAppearance).toHaveBeenCalledWith(
        'user123',
        {},
      )
    })
  })

  describe('Data Export - Edge Cases', () => {
    it('should export user data without sensitive fields', async () => {
      const settings = createMockSettings()
      vi.mocked(mockRepository.findById).mockResolvedValue(settings)

      const result = await service.exportData('user123')

      expect(result).toHaveProperty('exportedAt')
      expect(result).toHaveProperty('user')
      expect((result as any).user).toEqual(settings)
    })

    it('should include export timestamp', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())

      const before = new Date().toISOString()
      const result = await service.exportData('user123')
      const after = new Date().toISOString()

      expect((result as any).exportedAt).toBeDefined()
      expect((result as any).exportedAt >= before).toBe(true)
      expect((result as any).exportedAt <= after).toBe(true)
    })

    it('should reject export for non-existent user', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.exportData('nonexistent')).rejects.toThrow(ApiError)

      try {
        await service.exportData('nonexistent')
      } catch (error) {
        expect((error as ApiError).code).toBe('NOT_FOUND')
      }
    })
  })

  describe('Account Deletion - Edge Cases', () => {
    it('should delete existing user account', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.deleteUser).mockResolvedValue(undefined)

      await service.deleteAccount('user123')

      expect(mockRepository.deleteUser).toHaveBeenCalledWith('user123')
    })

    it('should reject deletion of non-existent user', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.deleteAccount('nonexistent')).rejects.toThrow(
        ApiError,
      )

      try {
        await service.deleteAccount('nonexistent')
      } catch (error) {
        expect((error as ApiError).code).toBe('NOT_FOUND')
      }
    })
  })

  describe('User Not Found - All Methods', () => {
    it('should throw NOT_FOUND in getSettings', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.getSettings('nonexistent')).rejects.toThrow(ApiError)
    })

    it('should throw NOT_FOUND in updateProfile', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(
        service.updateProfile('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(ApiError)
    })

    it('should throw NOT_FOUND in setup2FA', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.setup2FA('nonexistent')).rejects.toThrow(ApiError)
    })

    it('should throw NOT_FOUND in updateNotifications', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(
        service.updateNotifications('nonexistent', { marketing: false }),
      ).rejects.toThrow(ApiError)
    })

    it('should throw NOT_FOUND in updateAppearance', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(
        service.updateAppearance('nonexistent', { theme: 'dark' }),
      ).rejects.toThrow(ApiError)
    })

    it('should throw NOT_FOUND in exportData', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.exportData('nonexistent')).rejects.toThrow(ApiError)
    })

    it('should throw NOT_FOUND in deleteAccount', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.deleteAccount('nonexistent')).rejects.toThrow(
        ApiError,
      )
    })
  })

  describe('Race Conditions', () => {
    it('should handle concurrent profile updates', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateProfile).mockResolvedValue(undefined)
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())

      const promises = Array.from({ length: 5 }, (_, i) =>
        service.updateProfile('user123', { name: `Name ${i}` }),
      )

      const results = await Promise.allSettled(promises)

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(5)
    })

    it('should handle concurrent notification updates', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateNotifications).mockResolvedValue(undefined)

      const promises = Array.from({ length: 3 }, (_, i) =>
        service.updateNotifications('user123', {
          marketing: i % 2 === 0,
        }),
      )

      await Promise.all(promises)

      expect(mockRepository.updateNotifications).toHaveBeenCalledTimes(3)
    })

    it('should handle concurrent password changes', async () => {
      const { verifyPassword, isStrongPassword, hashPassword } =
        await import('@/server/shared/utils/password.utils')
      vi.mocked(mockRepository.getPassword).mockResolvedValue('hashed_password')
      vi.mocked(verifyPassword).mockResolvedValue(true)
      vi.mocked(isStrongPassword).mockReturnValue(true)
      vi.mocked(hashPassword).mockResolvedValue('hashed_new')
      vi.mocked(mockRepository.updatePassword).mockResolvedValue(undefined)

      const promises = Array.from({ length: 3 }, () =>
        service.changePassword('user123', {
          currentPassword: 'OldPass1!',
          newPassword: 'NewPass1!',
        }),
      )

      await Promise.all(promises)

      expect(mockRepository.updatePassword).toHaveBeenCalledTimes(3)
    })
  })

  describe('Idempotence', () => {
    it('should be idempotent for appearance updates', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateAppearance).mockResolvedValue(undefined)

      await service.updateAppearance('user123', { theme: 'dark' })
      await service.updateAppearance('user123', { theme: 'dark' })
      await service.updateAppearance('user123', { theme: 'dark' })

      expect(mockRepository.updateAppearance).toHaveBeenCalledTimes(3)
      expect(mockRepository.updateAppearance).toHaveBeenNthCalledWith(
        1,
        'user123',
        { theme: 'dark' },
      )
      expect(mockRepository.updateAppearance).toHaveBeenNthCalledWith(
        2,
        'user123',
        { theme: 'dark' },
      )
      expect(mockRepository.updateAppearance).toHaveBeenNthCalledWith(
        3,
        'user123',
        { theme: 'dark' },
      )
    })

    it('should be idempotent for notification updates', async () => {
      const prefs = { marketing: false }
      vi.mocked(mockRepository.findById).mockResolvedValue(createMockSettings())
      vi.mocked(mockRepository.updateNotifications).mockResolvedValue(undefined)

      await service.updateNotifications('user123', prefs)
      await service.updateNotifications('user123', prefs)

      expect(mockRepository.updateNotifications).toHaveBeenCalledTimes(2)
    })
  })
})
