import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import { AuthRepository } from '../auth.repository'

const createMockUser = (overrides: any = {}) => ({
  id: '1',
  email: 'test@test.com',
  name: 'Test User',
  password: 'hashed',
  role: 'user',
  isRootAdmin: false,
  emailVerified: null,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'active',
  suspendedAt: null,
  deletedAt: null,
  stripeCustomerId: null,
  ...overrides,
})

vi.mock('@/server/lib/database', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    verificationToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

describe('AuthRepository - Deep Tests', () => {
  let repository: AuthRepository

  beforeEach(() => {
    repository = new AuthRepository()
    vi.clearAllMocks()
  })

  describe('Edge Cases - Boundary Values', () => {
    describe('findUserByEmail', () => {
      it('should handle empty email', async () => {
        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        const result = await repository.findUserByEmail('')

        expect(result).toBeNull()
        expect(db.user.findUnique).toHaveBeenCalledWith({
          where: { email: '' },
        })
      })

      it('should handle very long email (>255 chars)', async () => {
        const longEmail = 'a'.repeat(250) + '@test.com'
        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        const result = await repository.findUserByEmail(longEmail)

        expect(result).toBeNull()
      })

      it('should handle email with special characters', async () => {
        const specialEmail = `user+test@example.com`
        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        await repository.findUserByEmail(specialEmail)

        expect(db.user.findUnique).toHaveBeenCalledWith({
          where: { email: specialEmail },
        })
      })

      it('should handle email with unicode characters', async () => {
        const unicodeEmail = 'tëst@exämple.com'
        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        await repository.findUserByEmail(unicodeEmail)

        expect(db.user.findUnique).toHaveBeenCalledWith({
          where: { email: unicodeEmail },
        })
      })

      it('should handle email with emojis', async () => {
        const emojiEmail = '😀@test.com'
        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        await repository.findUserByEmail(emojiEmail)

        expect(db.user.findUnique).toHaveBeenCalledWith({
          where: { email: emojiEmail },
        })
      })

      it('should handle email case sensitivity', async () => {
        const mockUser = createMockUser({ email: 'TEST@TEST.COM' })
        vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)

        const result = await repository.findUserByEmail('TEST@TEST.COM')

        expect(result).toEqual(mockUser)
      })

      it('should handle whitespace in email', async () => {
        const emailWithSpaces = '  test@test.com  '
        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        await repository.findUserByEmail(emailWithSpaces)

        expect(db.user.findUnique).toHaveBeenCalledWith({
          where: { email: emailWithSpaces },
        })
      })

      it('should handle SQL injection attempts in email', async () => {
        const sqlInjection = `test@test.com'; DROP TABLE users; --`
        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        await repository.findUserByEmail(sqlInjection)

        expect(db.user.findUnique).toHaveBeenCalledWith({
          where: { email: sqlInjection },
        })
      })
    })

    describe('createUser', () => {
      it('should handle empty name', async () => {
        const userData = {
          email: 'test@test.com',
          name: '',
          password: 'password',
          hashedPassword: 'hashed',
        }

        const mockUser = createMockUser({ email: userData.email, name: '' })
        vi.mocked(db.user.create).mockResolvedValue(mockUser)

        const result = await repository.createUser(userData)

        expect(result.name).toBe('')
      })

      it('should handle very long name (>100 chars)', async () => {
        const longName = 'a'.repeat(150)
        const userData = {
          email: 'test@test.com',
          name: longName,
          password: 'password',
          hashedPassword: 'hashed',
        }

        vi.mocked(db.user.create).mockRejectedValue(
          new Error('Value too long for column'),
        )

        await expect(repository.createUser(userData)).rejects.toThrow()
      })

      it('should handle name with special characters', async () => {
        const specialName = `José María Ñoño-O'Brien`
        const userData = {
          email: 'test@test.com',
          name: specialName,
          password: 'password',
          hashedPassword: 'hashed',
        }

        const mockUser = createMockUser({ name: specialName })
        vi.mocked(db.user.create).mockResolvedValue(mockUser)

        const result = await repository.createUser(userData)

        expect(result.name).toBe(specialName)
      })

      it('should handle name with unicode and emojis', async () => {
        const unicodeName = '测试 🚀 Tëst'
        const userData = {
          email: 'test@test.com',
          name: unicodeName,
          password: 'password',
          hashedPassword: 'hashed',
        }

        const mockUser = createMockUser({ name: unicodeName })
        vi.mocked(db.user.create).mockResolvedValue(mockUser)

        const result = await repository.createUser(userData)

        expect(result.name).toBe(unicodeName)
      })

      it('should handle XSS attempts in name', async () => {
        const xssName = '<script>alert("xss")</script>'
        const userData = {
          email: 'test@test.com',
          name: xssName,
          password: 'password',
          hashedPassword: 'hashed',
        }

        const mockUser = createMockUser({ name: xssName })
        vi.mocked(db.user.create).mockResolvedValue(mockUser)

        await repository.createUser(userData)

        expect(db.user.create).toHaveBeenCalled()
      })

      it('should handle null-like strings in password', async () => {
        const userData = {
          email: 'test@test.com',
          name: 'Test',
          password: 'password',
          hashedPassword: 'null',
        }

        const mockUser = createMockUser({ password: 'null' })
        vi.mocked(db.user.create).mockResolvedValue(mockUser)

        const result = await repository.createUser(userData)

        expect(result.password).toBe('null')
      })
    })

    describe('createVerificationToken', () => {
      it('should handle very long token (>500 chars)', async () => {
        const longToken = 'a'.repeat(600)
        const expires = new Date()

        vi.mocked(db.verificationToken.create).mockRejectedValue(
          new Error('Token too long'),
        )

        await expect(
          repository.createVerificationToken(
            'test@test.com',
            longToken,
            expires,
          ),
        ).rejects.toThrow()
      })

      it('should handle empty token', async () => {
        const expires = new Date()

        vi.mocked(db.verificationToken.create).mockResolvedValue({
          identifier: 'test@test.com',
          token: '',
          expires,
        })

        await repository.createVerificationToken('test@test.com', '', expires)

        expect(db.verificationToken.create).toHaveBeenCalledWith({
          data: {
            identifier: 'test@test.com',
            token: '',
            expires,
          },
        })
      })

      it('should handle past expiration date', async () => {
        const pastDate = new Date('2020-01-01')

        vi.mocked(db.verificationToken.create).mockResolvedValue({
          identifier: 'test@test.com',
          token: 'token',
          expires: pastDate,
        })

        await repository.createVerificationToken(
          'test@test.com',
          'token',
          pastDate,
        )

        expect(db.verificationToken.create).toHaveBeenCalled()
      })

      it('should handle very far future expiration date', async () => {
        const futureDate = new Date('2100-01-01')

        vi.mocked(db.verificationToken.create).mockResolvedValue({
          identifier: 'test@test.com',
          token: 'token',
          expires: futureDate,
        })

        await repository.createVerificationToken(
          'test@test.com',
          'token',
          futureDate,
        )

        expect(db.verificationToken.create).toHaveBeenCalled()
      })

      it('should handle token with special characters', async () => {
        const specialToken = 'token-with-special!@#$%^&*()'
        const expires = new Date()

        vi.mocked(db.verificationToken.create).mockResolvedValue({
          identifier: 'test@test.com',
          token: specialToken,
          expires,
        })

        await repository.createVerificationToken(
          'test@test.com',
          specialToken,
          expires,
        )

        expect(db.verificationToken.create).toHaveBeenCalled()
      })
    })
  })

  describe('Database Constraints', () => {
    it('should throw on duplicate email', async () => {
      const userData = {
        email: 'existing@test.com',
        name: 'Test',
        password: 'password',
        hashedPassword: 'hashed',
      }

      vi.mocked(db.user.create).mockRejectedValue(
        new Error('Unique constraint violation'),
      )

      await expect(repository.createUser(userData)).rejects.toThrow()
    })

    it('should throw on duplicate verification token', async () => {
      const token = 'duplicate_token'
      const expires = new Date()

      vi.mocked(db.verificationToken.create).mockRejectedValue(
        new Error('Unique constraint violation'),
      )

      await expect(
        repository.createVerificationToken('test@test.com', token, expires),
      ).rejects.toThrow()
    })

    it('should handle NULL in required email field', async () => {
      const userData = {
        email: null as any,
        name: 'Test',
        password: 'password',
        hashedPassword: 'hashed',
      }

      vi.mocked(db.user.create).mockRejectedValue(
        new Error('NOT NULL constraint violation'),
      )

      await expect(repository.createUser(userData)).rejects.toThrow()
    })

    it('should handle NULL in required name field', async () => {
      const userData = {
        email: 'test@test.com',
        name: null as any,
        password: 'password',
        hashedPassword: 'hashed',
      }

      vi.mocked(db.user.create).mockRejectedValue(
        new Error('NOT NULL constraint violation'),
      )

      await expect(repository.createUser(userData)).rejects.toThrow()
    })

    it('should handle NULL in password field', async () => {
      const userData = {
        email: 'test@test.com',
        name: 'Test',
        password: 'password',
        hashedPassword: null as any,
      }

      vi.mocked(db.user.create).mockRejectedValue(
        new Error('NOT NULL constraint violation'),
      )

      await expect(repository.createUser(userData)).rejects.toThrow()
    })
  })

  describe('Database Errors', () => {
    it('should handle database connection timeout', async () => {
      vi.mocked(db.user.findUnique).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 100),
          ) as any,
      )

      await expect(repository.findUserByEmail('test@test.com')).rejects.toThrow(
        'Connection timeout',
      )
    })

    it('should handle database deadlock on update', async () => {
      vi.mocked(db.user.update).mockRejectedValue(
        new Error('Deadlock detected'),
      )

      await expect(repository.updatePassword('1', 'new_hash')).rejects.toThrow(
        'Deadlock detected',
      )
    })

    it('should handle database connection lost during create', async () => {
      const userData = {
        email: 'test@test.com',
        name: 'Test',
        password: 'password',
        hashedPassword: 'hashed',
      }

      vi.mocked(db.user.create).mockRejectedValue(new Error('Connection lost'))

      await expect(repository.createUser(userData)).rejects.toThrow(
        'Connection lost',
      )
    })

    it('should handle database unavailable error', async () => {
      vi.mocked(db.user.findUnique).mockRejectedValue(
        new Error('Database unavailable'),
      )

      await expect(repository.findUserByEmail('test@test.com')).rejects.toThrow(
        'Database unavailable',
      )
    })

    it('should handle transaction rollback', async () => {
      vi.mocked(db.verificationToken.create).mockRejectedValue(
        new Error('Transaction rolled back'),
      )

      await expect(
        repository.createVerificationToken(
          'test@test.com',
          'token',
          new Date(),
        ),
      ).rejects.toThrow('Transaction rolled back')
    })

    it('should handle foreign key constraint violation', async () => {
      vi.mocked(db.verificationToken.delete).mockRejectedValue(
        new Error('Foreign key constraint'),
      )

      await expect(repository.deleteVerificationToken('token')).rejects.toThrow(
        'Foreign key constraint',
      )
    })
  })

  describe('Race Conditions', () => {
    it('should handle concurrent email lookups', async () => {
      const mockUser = createMockUser()
      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)

      const promises = Array.from({ length: 10 }, () =>
        repository.findUserByEmail('test@test.com'),
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      expect(results.every((r) => r?.id === '1')).toBe(true)
    })

    it('should handle concurrent user creation attempts with same email', async () => {
      const userData = {
        email: 'test@test.com',
        name: 'Test',
        password: 'password',
        hashedPassword: 'hashed',
      }

      vi.mocked(db.user.create)
        .mockResolvedValueOnce(createMockUser())
        .mockRejectedValue(new Error('Unique constraint violation'))

      const promise1 = repository.createUser(userData)
      const promise2 = repository.createUser(userData)

      const results = await Promise.allSettled([promise1, promise2])

      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      const rejected = results.filter((r) => r.status === 'rejected')

      expect(fulfilled.length).toBeGreaterThanOrEqual(1)
      expect(rejected.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle concurrent password updates', async () => {
      const mockUpdatedUser = createMockUser({ password: 'new_hash' })
      vi.mocked(db.user.update).mockResolvedValue(mockUpdatedUser)

      const promises = [
        repository.updatePassword('1', 'hash1'),
        repository.updatePassword('1', 'hash2'),
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(2)
      expect(db.user.update).toHaveBeenCalledTimes(2)
    })

    it('should handle concurrent token deletion', async () => {
      vi.mocked(db.verificationToken.delete).mockResolvedValue({
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(),
      })

      const promises = [
        repository.deleteVerificationToken('token'),
        repository.deleteVerificationToken('token'),
      ]

      await Promise.allSettled(promises)

      expect(db.verificationToken.delete).toHaveBeenCalled()
    })
  })

  describe('Data Integrity', () => {
    it('should preserve email format after creation', async () => {
      const email = 'TeSt@TeSt.CoM'
      const userData = {
        email,
        name: 'Test',
        password: 'password',
        hashedPassword: 'hashed',
      }

      const mockUser = createMockUser({ email })
      vi.mocked(db.user.create).mockResolvedValue(mockUser)

      const result = await repository.createUser(userData)

      expect(result.email).toBe(email)
    })

    it('should preserve exact name format', async () => {
      const name = '  John  Doe  '
      const userData = {
        email: 'test@test.com',
        name,
        password: 'password',
        hashedPassword: 'hashed',
      }

      const mockUser = createMockUser({ name })
      vi.mocked(db.user.create).mockResolvedValue(mockUser)

      const result = await repository.createUser(userData)

      expect(result.name).toBe(name)
    })

    it('should preserve emailVerified timestamp', async () => {
      const now = new Date('2024-01-15T10:30:00Z')
      const mockUser = createMockUser({ emailVerified: now })

      vi.mocked(db.user.update).mockResolvedValue(mockUser)

      const result = await repository.verifyEmail('1')

      expect(result.emailVerified).toEqual(now)
    })

    it('should preserve token expiration time', async () => {
      const expires = new Date('2024-12-31T23:59:59Z')
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires,
      }

      vi.mocked(db.verificationToken.findUnique).mockResolvedValue(mockToken)

      const result = await repository.findVerificationToken('token')

      expect(result?.expires).toEqual(expires)
    })
  })

  describe('Deletion Operations', () => {
    it('should successfully delete existing token', async () => {
      vi.mocked(db.verificationToken.delete).mockResolvedValue({
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(),
      })

      await repository.deleteVerificationToken('token')

      expect(db.verificationToken.delete).toHaveBeenCalledWith({
        where: { token: 'token' },
      })
    })

    it('should throw when deleting non-existent token', async () => {
      vi.mocked(db.verificationToken.delete).mockRejectedValue(
        new Error('Record not found'),
      )

      await expect(
        repository.deleteVerificationToken('nonexistent'),
      ).rejects.toThrow('Record not found')
    })

    it('should handle deletion of already deleted token', async () => {
      vi.mocked(db.verificationToken.delete).mockRejectedValue(
        new Error('Record not found'),
      )

      await expect(
        repository.deleteVerificationToken('deleted_token'),
      ).rejects.toThrow()
    })
  })

  describe('Update Operations', () => {
    it('should update password for existing user', async () => {
      const mockUser = createMockUser({ password: 'new_hash' })
      vi.mocked(db.user.update).mockResolvedValue(mockUser)

      const result = await repository.updatePassword('1', 'new_hash')

      expect(result.password).toBe('new_hash')
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { password: 'new_hash' },
      })
    })

    it('should throw when updating password for non-existent user', async () => {
      vi.mocked(db.user.update).mockRejectedValue(new Error('Record not found'))

      await expect(
        repository.updatePassword('nonexistent', 'hash'),
      ).rejects.toThrow('Record not found')
    })

    it('should verify email for existing user', async () => {
      const mockUser = createMockUser({ emailVerified: new Date() })
      vi.mocked(db.user.update).mockResolvedValue(mockUser)

      const result = await repository.verifyEmail('1')

      expect(result.emailVerified).toBeDefined()
      expect(db.user.update).toHaveBeenCalled()
    })

    it('should throw when verifying email for non-existent user', async () => {
      vi.mocked(db.user.update).mockRejectedValue(new Error('Record not found'))

      await expect(repository.verifyEmail('nonexistent')).rejects.toThrow(
        'Record not found',
      )
    })

    it('should handle multiple password updates in sequence', async () => {
      const mockUser1 = createMockUser({ password: 'hash1' })
      const mockUser2 = createMockUser({ password: 'hash2' })
      const mockUser3 = createMockUser({ password: 'hash3' })

      vi.mocked(db.user.update)
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2)
        .mockResolvedValueOnce(mockUser3)

      await repository.updatePassword('1', 'hash1')
      await repository.updatePassword('1', 'hash2')
      const result = await repository.updatePassword('1', 'hash3')

      expect(result.password).toBe('hash3')
      expect(db.user.update).toHaveBeenCalledTimes(3)
    })
  })

  describe('Query Operations', () => {
    it('should return null for non-existent user by email', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const result = await repository.findUserByEmail('nonexistent@test.com')

      expect(result).toBeNull()
    })

    it('should return null for non-existent token', async () => {
      vi.mocked(db.verificationToken.findUnique).mockResolvedValue(null)

      const result = await repository.findVerificationToken('nonexistent')

      expect(result).toBeNull()
    })

    it('should return null for non-existent user by id', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const result = await repository.findEmailVerifiedById('nonexistent')

      expect(result).toBeNull()
    })

    it('should return only emailVerified field when querying by id', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue({
        emailVerified: new Date(),
      } as any)

      const result = await repository.findEmailVerifiedById('1')

      expect(result).toHaveProperty('emailVerified')
      expect(Object.keys(result!)).toEqual(['emailVerified'])
    })
  })

  describe('Performance & Stress', () => {
    it('should handle rapid sequential user lookups', async () => {
      const mockUser = createMockUser()
      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)

      const start = Date.now()
      for (let i = 0; i < 100; i++) {
        await repository.findUserByEmail('test@test.com')
      }
      const duration = Date.now() - start

      expect(duration).toBeLessThan(5000)
    })

    it('should handle rapid parallel token lookups', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(),
      }
      vi.mocked(db.verificationToken.findUnique).mockResolvedValue(mockToken)

      const promises = Array.from({ length: 50 }, () =>
        repository.findVerificationToken('token'),
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(50)
      expect(results.every((r) => r?.token === 'token')).toBe(true)
    })
  })
})
