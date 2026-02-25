import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import { AuthRepository } from '../auth.repository'

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

describe('AuthRepository', () => {
  let repository: AuthRepository

  beforeEach(() => {
    repository = new AuthRepository()
    vi.clearAllMocks()
  })

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        password: 'hashed',
        role: 'user',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)

      const result = await repository.findUserByEmail('test@test.com')

      expect(result).toEqual(mockUser)
      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      })
    })

    it('should return null if user not found', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const result = await repository.findUserByEmail('notfound@test.com')

      expect(result).toBeNull()
    })
  })

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const userData = {
        email: 'new@test.com',
        name: 'New User',
        password: 'password',
        hashedPassword: 'hashed_password',
      }

      const mockCreatedUser = {
        id: '2',
        email: userData.email,
        name: userData.name,
        password: userData.hashedPassword,
        role: 'user',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.user.create).mockResolvedValue(mockCreatedUser)

      const result = await repository.createUser(userData)

      expect(result).toEqual(mockCreatedUser)
      expect(db.user.create).toHaveBeenCalledWith({
        data: {
          email: userData.email,
          name: userData.name,
          password: userData.hashedPassword,
          role: 'user',
        },
      })
    })
  })

  describe('updatePassword', () => {
    it('should update user password', async () => {
      const userId = '1'
      const newHashedPassword = 'new_hashed_password'

      const mockUpdatedUser = {
        id: userId,
        email: 'test@test.com',
        name: 'Test User',
        password: newHashedPassword,
        role: 'user',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.user.update).mockResolvedValue(mockUpdatedUser)

      const result = await repository.updatePassword(userId, newHashedPassword)

      expect(result).toEqual(mockUpdatedUser)
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: newHashedPassword },
      })
    })
  })

  describe('verifyEmail', () => {
    it('should set emailVerified timestamp', async () => {
      const userId = '1'
      const now = new Date()

      const mockVerifiedUser = {
        id: userId,
        email: 'test@test.com',
        name: 'Test User',
        password: 'hashed',
        role: 'user',
        emailVerified: now,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.user.update).mockResolvedValue(mockVerifiedUser)

      const result = await repository.verifyEmail(userId)

      expect(result.emailVerified).toBeDefined()
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { emailVerified: expect.any(Date) },
      })
    })
  })

  describe('createVerificationToken', () => {
    it('should create verification token', async () => {
      const email = 'test@test.com'
      const token = 'random_token'
      const expires = new Date()

      vi.mocked(db.verificationToken.create).mockResolvedValue({
        identifier: email,
        token,
        expires,
      })

      await repository.createVerificationToken(email, token, expires)

      expect(db.verificationToken.create).toHaveBeenCalledWith({
        data: {
          identifier: email,
          token,
          expires,
        },
      })
    })
  })

  describe('findVerificationToken', () => {
    it('should find verification token', async () => {
      const token = 'random_token'
      const mockToken = {
        identifier: 'test@test.com',
        token,
        expires: new Date(),
      }

      vi.mocked(db.verificationToken.findUnique).mockResolvedValue(mockToken)

      const result = await repository.findVerificationToken(token)

      expect(result).toEqual(mockToken)
      expect(db.verificationToken.findUnique).toHaveBeenCalledWith({
        where: { token },
      })
    })

    it('should return null if token not found', async () => {
      vi.mocked(db.verificationToken.findUnique).mockResolvedValue(null)

      const result = await repository.findVerificationToken('invalid_token')

      expect(result).toBeNull()
    })
  })

  describe('deleteVerificationToken', () => {
    it('should delete verification token', async () => {
      const token = 'random_token'

      vi.mocked(db.verificationToken.delete).mockResolvedValue({
        identifier: 'test@test.com',
        token,
        expires: new Date(),
      })

      await repository.deleteVerificationToken(token)

      expect(db.verificationToken.delete).toHaveBeenCalledWith({
        where: { token },
      })
    })
  })
})
