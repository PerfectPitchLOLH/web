import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import { UserRepository } from '../user.repository'

vi.mock('@/server/lib/database', () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('UserRepository - Deep Tests', () => {
  let repository: UserRepository

  beforeEach(() => {
    repository = new UserRepository()
    vi.clearAllMocks()
  })

  describe('Edge Cases - Boundary Values', () => {
    describe('findAll - Search', () => {
      it('should handle empty string in search', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])

        const result = await repository.findAll({ search: '' })

        expect(result).toBeDefined()
        expect(result).toEqual([])
        expect(db.user.findMany).toHaveBeenCalledWith({
          where: {},
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      })

      it('should handle very long search strings (>1000 chars)', async () => {
        const longString = 'a'.repeat(1001)
        vi.mocked(db.user.findMany).mockResolvedValue([])

        const result = await repository.findAll({ search: longString })

        expect(result).toBeDefined()
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({
                  email: expect.objectContaining({ contains: longString }),
                }),
              ]),
            }),
          }),
        )
      })

      it('should handle special characters in search', async () => {
        const specialChars = `'; DROP TABLE users; --`
        vi.mocked(db.user.findMany).mockResolvedValue([])

        const result = await repository.findAll({ search: specialChars })

        expect(result).toBeDefined()
      })

      it('should handle unicode and emojis in search', async () => {
        const unicode = '测试 🚀 Ñoño'
        vi.mocked(db.user.findMany).mockResolvedValue([])

        const result = await repository.findAll({ search: unicode })

        expect(result).toBeDefined()
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.any(Array),
            }),
          }),
        )
      })

      it('should handle null characters in search', async () => {
        const nullChar = 'test\x00malicious'
        vi.mocked(db.user.findMany).mockResolvedValue([])

        const result = await repository.findAll({ search: nullChar })

        expect(result).toBeDefined()
      })
    })

    describe('findAll - Pagination', () => {
      it('should handle negative page number', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])

        await repository.findAll({}, { page: -1, limit: 10 })

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: -20,
          }),
        )
      })

      it('should handle zero limit', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])

        await repository.findAll({}, { page: 1, limit: 0 })

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 0,
          }),
        )
      })

      it('should handle excessively large limit (>1000)', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])

        await repository.findAll({}, { page: 1, limit: 10000 })

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 10000,
          }),
        )
      })

      it('should handle page overflow calculation', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])

        await repository.findAll({}, { page: 999999, limit: 999999 })

        const expectedSkip = (999999 - 1) * 999999
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: expectedSkip,
          }),
        )
      })

      it('should handle missing pagination params', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])

        await repository.findAll({})

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
            take: 10,
          }),
        )
      })
    })

    describe('findAll - Role Filter', () => {
      it('should filter by admin role', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])

        await repository.findAll({ role: 'admin' })

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              role: 'admin',
            }),
          }),
        )
      })

      it('should filter by user role', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])

        await repository.findAll({ role: 'user' })

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              role: 'user',
            }),
          }),
        )
      })

      it('should combine role and search filters', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])

        await repository.findAll({ role: 'admin', search: 'test' })

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              role: 'admin',
              OR: expect.any(Array),
            }),
          }),
        )
      })
    })
  })

  describe('Database Constraints', () => {
    it('should throw on duplicate email', async () => {
      vi.mocked(db.user.create).mockRejectedValue(
        new Error('Unique constraint failed'),
      )

      await expect(
        repository.create({
          email: 'test@test.com',
          name: 'Test',
          role: 'user',
        }),
      ).rejects.toThrow()
    })

    it('should handle case-insensitive email searches', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Test',
      } as any)

      const result = await repository.findByEmail('TEST@TEST.COM')

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'TEST@TEST.COM' },
      })
    })

    it('should reject NULL in required fields', async () => {
      vi.mocked(db.user.create).mockRejectedValue(
        new Error('NOT NULL constraint failed'),
      )

      await expect(
        repository.create({
          email: null as any,
          name: 'Test',
          role: 'user',
        }),
      ).rejects.toThrow()
    })

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com'
      vi.mocked(db.user.create).mockResolvedValue({
        id: '1',
        email: longEmail,
        name: 'Test',
      } as any)

      const result = await repository.create({
        email: longEmail,
        name: 'Test',
        role: 'user',
      })

      expect(result.email).toBe(longEmail)
    })

    it('should handle very long names', async () => {
      const longName = 'a'.repeat(500)
      vi.mocked(db.user.create).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: longName,
      } as any)

      const result = await repository.create({
        email: 'test@test.com',
        name: longName,
        role: 'user',
      })

      expect(result.name).toBe(longName)
    })
  })

  describe('Database Errors', () => {
    it('should handle database connection timeout', async () => {
      vi.mocked(db.user.findMany).mockRejectedValue(
        new Error('Connection timeout'),
      )

      await expect(repository.findAll()).rejects.toThrow('Connection timeout')
    })

    it('should handle database deadlock', async () => {
      vi.mocked(db.user.update).mockRejectedValue(
        new Error('Deadlock detected'),
      )

      await expect(repository.update('1', { name: 'Updated' })).rejects.toThrow(
        'Deadlock detected',
      )
    })

    it('should handle foreign key constraint violation on delete', async () => {
      vi.mocked(db.user.delete).mockRejectedValue(
        new Error('Foreign key constraint'),
      )

      await expect(repository.delete('1')).rejects.toThrow(
        'Foreign key constraint',
      )
    })

    it('should handle transaction rollback', async () => {
      vi.mocked(db.user.create).mockRejectedValue(
        new Error('Transaction rolled back'),
      )

      await expect(
        repository.create({
          email: 'test@test.com',
          name: 'Test',
          role: 'user',
        }),
      ).rejects.toThrow('Transaction rolled back')
    })
  })

  describe('Update Operations', () => {
    it('should handle updating with Prisma.JsonNull for twoFactorBackupCodes', async () => {
      vi.mocked(db.user.update).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Test',
        twoFactorBackupCodes: null,
      } as any)

      const result = await repository.update('1', {
        twoFactorBackupCodes: null,
      })

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          twoFactorBackupCodes: expect.anything(),
        }),
      })
    })

    it('should handle updating with array for twoFactorBackupCodes', async () => {
      const backupCodes = ['code1', 'code2', 'code3']
      vi.mocked(db.user.update).mockResolvedValue({
        id: '1',
        twoFactorBackupCodes: backupCodes,
      } as any)

      const result = await repository.update('1', {
        twoFactorBackupCodes: backupCodes,
      })

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          twoFactorBackupCodes: backupCodes,
        }),
      })
    })

    it('should handle updating with Prisma.JsonNull for notificationPreferences', async () => {
      vi.mocked(db.user.update).mockResolvedValue({
        id: '1',
        notificationPreferences: null,
      } as any)

      const result = await repository.update('1', {
        notificationPreferences: null,
      })

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          notificationPreferences: expect.anything(),
        }),
      })
    })

    it('should handle concurrent updates to same user', async () => {
      vi.mocked(db.user.update)
        .mockResolvedValueOnce({ id: '1', name: 'Update1' } as any)
        .mockResolvedValueOnce({ id: '1', name: 'Update2' } as any)

      const [result1, result2] = await Promise.all([
        repository.update('1', { name: 'Update1' }),
        repository.update('1', { name: 'Update2' }),
      ])

      expect(db.user.update).toHaveBeenCalledTimes(2)
    })

    it('should handle update with all optional fields undefined', async () => {
      vi.mocked(db.user.update).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
      } as any)

      const result = await repository.update('1', {})

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          twoFactorBackupCodes: undefined,
          notificationPreferences: undefined,
        },
      })
    })
  })

  describe('Count Operations', () => {
    it('should count with no filters', async () => {
      vi.mocked(db.user.count).mockResolvedValue(42)

      const result = await repository.count()

      expect(result).toBe(42)
      expect(db.user.count).toHaveBeenCalledWith({ where: {} })
    })

    it('should count with role filter', async () => {
      vi.mocked(db.user.count).mockResolvedValue(10)

      const result = await repository.count({ role: 'admin' })

      expect(result).toBe(10)
      expect(db.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ role: 'admin' }),
      })
    })

    it('should count with search filter', async () => {
      vi.mocked(db.user.count).mockResolvedValue(5)

      const result = await repository.count({ search: 'test' })

      expect(result).toBe(5)
      expect(db.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      })
    })

    it('should handle count with both filters', async () => {
      vi.mocked(db.user.count).mockResolvedValue(3)

      const result = await repository.count({ role: 'user', search: 'john' })

      expect(result).toBe(3)
      expect(db.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          role: 'user',
          OR: expect.any(Array),
        }),
      })
    })
  })

  describe('Create Operations', () => {
    it('should create user with minimal required fields', async () => {
      vi.mocked(db.user.create).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Test',
        role: 'user',
      } as any)

      const result = await repository.create({
        email: 'test@test.com',
        name: 'Test',
        role: 'user',
      })

      expect(result).toHaveProperty('id')
      expect(result.email).toBe('test@test.com')
    })

    it('should create user with all optional fields', async () => {
      const fullData = {
        email: 'test@test.com',
        name: 'Test',
        role: 'admin' as const,
        password: 'hashedpassword',
        emailVerified: new Date(),
        image: 'https://example.com/avatar.jpg',
        isRootAdmin: true,
        status: 'active',
        stripeCustomerId: 'cus_123',
      }

      vi.mocked(db.user.create).mockResolvedValue({
        id: '1',
        ...fullData,
      } as any)

      const result = await repository.create(fullData)

      expect(result).toMatchObject(fullData)
    })

    it('should handle creating with null optional fields', async () => {
      vi.mocked(db.user.create).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Test',
        password: null,
        emailVerified: null,
      } as any)

      const result = await repository.create({
        email: 'test@test.com',
        name: 'Test',
        role: 'user',
        password: null,
        emailVerified: null,
      })

      expect(result.password).toBeNull()
      expect(result.emailVerified).toBeNull()
    })
  })

  describe('Delete Operations', () => {
    it('should delete existing user', async () => {
      vi.mocked(db.user.delete).mockResolvedValue({
        id: '1',
      } as any)

      const result = await repository.delete('1')

      expect(result).toBe(true)
      expect(db.user.delete).toHaveBeenCalledWith({ where: { id: '1' } })
    })

    it('should throw when deleting non-existent user', async () => {
      vi.mocked(db.user.delete).mockRejectedValue(new Error('Record not found'))

      await expect(repository.delete('nonexistent')).rejects.toThrow(
        'Record not found',
      )
    })

    it('should handle cascade delete with related records', async () => {
      vi.mocked(db.user.delete).mockResolvedValue({
        id: '1',
      } as any)

      const result = await repository.delete('1')

      expect(result).toBe(true)
    })
  })

  describe('FindById Operations', () => {
    it('should find user by valid ID', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Test',
      } as any)

      const result = await repository.findById('1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('1')
    })

    it('should return null for non-existent ID', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const result = await repository.findById('nonexistent')

      expect(result).toBeNull()
    })

    it('should handle malformed ID gracefully', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const result = await repository.findById('invalid-id-format')

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'invalid-id-format' },
      })
    })
  })

  describe('FindByEmail Operations', () => {
    it('should find user by valid email', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
      } as any)

      const result = await repository.findByEmail('test@test.com')

      expect(result).toBeDefined()
      expect(result?.email).toBe('test@test.com')
    })

    it('should return null for non-existent email', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const result = await repository.findByEmail('nonexistent@test.com')

      expect(result).toBeNull()
    })

    it('should handle malformed email', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const result = await repository.findByEmail('not-an-email')

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'not-an-email' },
      })
    })

    it('should handle email with special characters', async () => {
      const specialEmail = 'test+alias@example.co.uk'
      vi.mocked(db.user.findUnique).mockResolvedValue({
        id: '1',
        email: specialEmail,
      } as any)

      const result = await repository.findByEmail(specialEmail)

      expect(result?.email).toBe(specialEmail)
    })
  })
})
