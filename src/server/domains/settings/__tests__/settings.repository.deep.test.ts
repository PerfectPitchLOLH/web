// @ts-nocheck
import { Prisma } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import { SettingsRepository } from '../settings.repository'
import type { NotificationPreferences } from '../settings.types'

vi.mock('@/server/lib/database', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

function createMockDbUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user123',
    email: 'test@test.com',
    name: 'Test User',
    image: null,
    twoFactorEnabled: false,
    theme: 'system',
    language: 'fr',
    notificationPreferences: null,
    password: 'hashed_password',
    ...overrides,
  }
}

describe('SettingsRepository - Deep Tests', () => {
  let repository: SettingsRepository

  beforeEach(() => {
    repository = new SettingsRepository()
    vi.clearAllMocks()
  })

  describe('Edge Cases - Boundary Values', () => {
    describe('findById', () => {
      it('should handle empty string user ID', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        const result = await repository.findById('')

        expect(result).toBeNull()
        expect(db.user.findUnique).toHaveBeenCalledWith({
          where: { id: '' },
          select: expect.any(Object),
        })
      })

      it('should handle very long user ID (>1000 chars)', async () => {
        const longId = 'a'.repeat(1001)
        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        const result = await repository.findById(longId)

        expect(result).toBeNull()
      })

      it('should handle user ID with special characters', async () => {
        const specialId = `'; DROP TABLE users; --`
        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        const result = await repository.findById(specialId)

        expect(result).toBeNull()
      })

      it('should handle user ID with unicode and emojis', async () => {
        const unicodeId = '测试-🚀-Ñoño'
        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        const result = await repository.findById(unicodeId)

        expect(result).toBeNull()
      })

      it('should handle NULL notificationPreferences', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue(
          createMockDbUser({ notificationPreferences: null }),
        )

        const result = await repository.findById('user123')

        expect(result?.notificationPreferences).toBeNull()
      })

      it('should handle undefined notificationPreferences', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue(
          createMockDbUser({ notificationPreferences: undefined }),
        )

        const result = await repository.findById('user123')

        expect(result?.notificationPreferences).toBeNull()
      })

      it('should handle NULL password correctly for OAuth users', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue(
          createMockDbUser({ password: null }),
        )

        const result = await repository.findById('user123')

        expect(result?.hasPassword).toBe(false)
      })

      it('should handle empty string password', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue(
          createMockDbUser({ password: '' }),
        )

        const result = await repository.findById('user123')

        expect(result?.hasPassword).toBe(false)
      })

      it('should handle malformed JSON in notificationPreferences', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue(
          createMockDbUser({
            notificationPreferences: 'invalid json {',
          }),
        )

        const result = await repository.findById('user123')

        expect(result?.notificationPreferences).toBe('invalid json {')
      })

      it('should handle very long name (>10000 chars)', async () => {
        const longName = 'a'.repeat(10001)
        vi.mocked(db.user.findUnique).mockResolvedValue(
          createMockDbUser({ name: longName }),
        )

        const result = await repository.findById('user123')

        expect(result?.name.length).toBe(10001)
      })

      it('should handle empty name string', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue(
          createMockDbUser({ name: '' }),
        )

        const result = await repository.findById('user123')

        expect(result?.name).toBe('')
      })
    })

    describe('updateProfile', () => {
      it('should handle empty name update', async () => {
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateProfile('user123', { name: '' })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { name: '' },
        })
      })

      it('should handle very long name (>10000 chars)', async () => {
        const longName = 'a'.repeat(10001)
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateProfile('user123', { name: longName })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { name: longName },
        })
      })

      it('should handle unicode and emojis in name', async () => {
        const unicodeName = '测试 🚀 José Ñoño'
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateProfile('user123', { name: unicodeName })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { name: unicodeName },
        })
      })

      it('should handle HTML/XSS in name', async () => {
        const xssName = '<script>alert("XSS")</script>'
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateProfile('user123', { name: xssName })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { name: xssName },
        })
      })

      it('should handle NULL image', async () => {
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateProfile('user123', { image: undefined })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { image: undefined },
        })
      })

      it('should handle very long image URL (>10000 chars)', async () => {
        const longUrl = 'https://example.com/' + 'a'.repeat(10000)
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateProfile('user123', { image: longUrl })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { image: longUrl },
        })
      })

      it('should handle empty object update', async () => {
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateProfile('user123', {})

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: {},
        })
      })
    })

    describe('updateNotifications', () => {
      it('should handle all preferences set to false', async () => {
        const prefs: NotificationPreferences = {
          marketing: false,
          security: false,
          updates: false,
          activity: false,
        }
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateNotifications('user123', prefs)

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { notificationPreferences: prefs },
        })
      })

      it('should handle all preferences set to true', async () => {
        const prefs: NotificationPreferences = {
          marketing: true,
          security: true,
          updates: true,
          activity: true,
        }
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateNotifications('user123', prefs)

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { notificationPreferences: prefs },
        })
      })
    })

    describe('updateAppearance', () => {
      it('should handle theme update to "light"', async () => {
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateAppearance('user123', { theme: 'light' })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { theme: 'light' },
        })
      })

      it('should handle theme update to "dark"', async () => {
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateAppearance('user123', { theme: 'dark' })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { theme: 'dark' },
        })
      })

      it('should handle theme update to "system"', async () => {
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateAppearance('user123', { theme: 'system' })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { theme: 'system' },
        })
      })

      it('should handle language update to "fr"', async () => {
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateAppearance('user123', { language: 'fr' })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { language: 'fr' },
        })
      })

      it('should handle language update to "en"', async () => {
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateAppearance('user123', { language: 'en' })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { language: 'en' },
        })
      })

      it('should handle simultaneous theme and language update', async () => {
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateAppearance('user123', {
          theme: 'dark',
          language: 'en',
        })

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: { theme: 'dark', language: 'en' },
        })
      })

      it('should handle empty appearance update', async () => {
        vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

        await repository.updateAppearance('user123', {})

        expect(db.user.update).toHaveBeenCalledWith({
          where: { id: 'user123' },
          data: {},
        })
      })
    })
  })

  describe('Database Errors', () => {
    it('should propagate database connection timeout errors', async () => {
      vi.mocked(db.user.findUnique).mockRejectedValue(
        new Error('Connection timeout'),
      )

      await expect(repository.findById('user123')).rejects.toThrow(
        'Connection timeout',
      )
    })

    it('should propagate database deadlock errors', async () => {
      vi.mocked(db.user.update).mockRejectedValue(
        new Error('Deadlock detected'),
      )

      await expect(
        repository.updateProfile('user123', { name: 'Test' }),
      ).rejects.toThrow('Deadlock detected')
    })

    it('should propagate foreign key constraint violation on delete', async () => {
      vi.mocked(db.user.delete).mockRejectedValue(
        new Error('Foreign key constraint'),
      )

      await expect(repository.deleteUser('user123')).rejects.toThrow(
        'Foreign key constraint',
      )
    })

    it('should handle database disconnect during update', async () => {
      vi.mocked(db.user.update).mockRejectedValue(
        new Error('Database connection lost'),
      )

      await expect(
        repository.updatePassword('user123', 'hashed'),
      ).rejects.toThrow('Database connection lost')
    })

    it('should handle query timeout on findById', async () => {
      vi.mocked(db.user.findUnique).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout')), 100),
          ),
      )

      await expect(repository.findById('user123')).rejects.toThrow(
        'Query timeout',
      )
    })

    it('should handle unique constraint violation', async () => {
      vi.mocked(db.user.update).mockRejectedValue(
        new Error('Unique constraint failed on the fields: (`email`)'),
      )

      await expect(
        repository.updateProfile('user123', { name: 'Test' }),
      ).rejects.toThrow('Unique constraint')
    })

    it('should handle record not found on update', async () => {
      vi.mocked(db.user.update).mockRejectedValue(
        new Error('Record to update not found'),
      )

      await expect(
        repository.updateProfile('nonexistent', { name: 'Test' }),
      ).rejects.toThrow('Record to update not found')
    })

    it('should handle record not found on delete', async () => {
      vi.mocked(db.user.delete).mockRejectedValue(
        new Error('Record to delete does not exist'),
      )

      await expect(repository.deleteUser('nonexistent')).rejects.toThrow(
        'Record to delete does not exist',
      )
    })
  })

  describe('Password Operations', () => {
    it('should return NULL for OAuth users without password', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        createMockDbUser({ password: null }),
      )

      const result = await repository.getPassword('user123')

      expect(result).toBeNull()
    })

    it('should return password hash for users with password', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        createMockDbUser({ password: 'hashed_password' }),
      )

      const result = await repository.getPassword('user123')

      expect(result).toBe('hashed_password')
    })

    it('should handle very long password hash (bcrypt max)', async () => {
      const longHash = 'a'.repeat(72)
      vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

      await repository.updatePassword('user123', longHash)

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { password: longHash },
      })
    })

    it('should handle empty password hash', async () => {
      vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

      await repository.updatePassword('user123', '')

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { password: '' },
      })
    })
  })

  describe('Two-Factor Authentication', () => {
    it('should enable 2FA with secret and backup codes', async () => {
      const backupCodes = ['ABC12-345', 'DEF67-890']
      vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

      await repository.updateTwoFactor('user123', {
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET123',
        twoFactorBackupCodes: backupCodes,
      })

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: 'SECRET123',
          twoFactorBackupCodes: backupCodes,
        },
      })
    })

    it('should disable 2FA and clear secret and backup codes', async () => {
      vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

      await repository.updateTwoFactor('user123', {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      })

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: Prisma.JsonNull,
        },
      })
    })

    it('should return NULL for users without 2FA secret', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        createMockDbUser({ twoFactorSecret: null }),
      )

      const result = await repository.getTwoFactorSecret('user123')

      expect(result).toBeNull()
    })

    it('should return secret for users with 2FA enabled', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        createMockDbUser({ twoFactorSecret: 'SECRET123' }),
      )

      const result = await repository.getTwoFactorSecret('user123')

      expect(result).toBe('SECRET123')
    })

    it('should handle empty array of backup codes', async () => {
      vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

      await repository.updateTwoFactor('user123', {
        twoFactorEnabled: true,
        twoFactorSecret: 'SECRET123',
        twoFactorBackupCodes: [],
      })

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: 'SECRET123',
          twoFactorBackupCodes: [],
        },
      })
    })

    it('should handle very long 2FA secret', async () => {
      const longSecret = 'A'.repeat(500)
      vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

      await repository.updateTwoFactor('user123', {
        twoFactorEnabled: true,
        twoFactorSecret: longSecret,
        twoFactorBackupCodes: null,
      })

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: longSecret,
          twoFactorBackupCodes: Prisma.JsonNull,
        },
      })
    })
  })

  describe('Cascade Operations', () => {
    it('should cascade delete user and related data', async () => {
      vi.mocked(db.user.delete).mockResolvedValue(createMockDbUser())

      await repository.deleteUser('user123')

      expect(db.user.delete).toHaveBeenCalledWith({
        where: { id: 'user123' },
      })
    })

    it('should handle delete of non-existent user', async () => {
      vi.mocked(db.user.delete).mockRejectedValue(
        new Error('Record to delete does not exist'),
      )

      await expect(repository.deleteUser('nonexistent')).rejects.toThrow(
        'Record to delete does not exist',
      )
    })
  })

  describe('Data Type Conversions', () => {
    it('should correctly map hasPassword from truthy password', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        createMockDbUser({ password: 'hashed' }),
      )

      const result = await repository.findById('user123')

      expect(result?.hasPassword).toBe(true)
    })

    it('should correctly map hasPassword from falsy password', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        createMockDbUser({ password: null }),
      )

      const result = await repository.findById('user123')

      expect(result?.hasPassword).toBe(false)
    })

    it('should cast notificationPreferences from JSON correctly', async () => {
      const prefs = {
        marketing: true,
        security: false,
        updates: true,
        activity: false,
      }
      vi.mocked(db.user.findUnique).mockResolvedValue(
        createMockDbUser({ notificationPreferences: prefs }),
      )

      const result = await repository.findById('user123')

      expect(result?.notificationPreferences).toEqual(prefs)
    })

    it('should handle NULL for optional fields', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(
        createMockDbUser({
          image: null,
          notificationPreferences: null,
        }),
      )

      const result = await repository.findById('user123')

      expect(result?.image).toBeNull()
      expect(result?.notificationPreferences).toBeNull()
    })
  })

  describe('Concurrency', () => {
    it('should handle concurrent findById requests', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(createMockDbUser())

      const promises = Array.from({ length: 10 }, () =>
        repository.findById('user123'),
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      results.forEach((result) => {
        expect(result?.id).toBe('user123')
      })
    })

    it('should handle concurrent updateProfile requests', async () => {
      vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

      const promises = Array.from({ length: 5 }, (_, i) =>
        repository.updateProfile('user123', { name: `Name ${i}` }),
      )

      await Promise.all(promises)

      expect(db.user.update).toHaveBeenCalledTimes(5)
    })

    it('should handle concurrent password updates', async () => {
      vi.mocked(db.user.update).mockResolvedValue(createMockDbUser())

      const promises = Array.from({ length: 3 }, (_, i) =>
        repository.updatePassword('user123', `hash${i}`),
      )

      await Promise.all(promises)

      expect(db.user.update).toHaveBeenCalledTimes(3)
    })
  })
})
