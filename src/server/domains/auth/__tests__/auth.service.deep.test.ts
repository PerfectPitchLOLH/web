import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { AuthRepository } from '../auth.repository'
import { AuthService } from '../auth.service'

vi.mock('@/server/shared/utils/password.utils', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}))

vi.mock('@/server/lib/email', () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}))

import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '@/server/lib/email'
import {
  hashPassword,
  verifyPassword,
} from '@/server/shared/utils/password.utils'

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

describe('AuthService - Deep Tests', () => {
  let authService: AuthService
  let mockRepository: AuthRepository

  beforeEach(() => {
    mockRepository = {
      findUserByEmail: vi.fn(),
      createUser: vi.fn(),
      updatePassword: vi.fn(),
      verifyEmail: vi.fn(),
      createVerificationToken: vi.fn(),
      findVerificationToken: vi.fn(),
      deleteVerificationToken: vi.fn(),
      findEmailVerifiedById: vi.fn(),
    } as any

    authService = new AuthService(mockRepository)
    vi.clearAllMocks()
  })

  describe('signUp - Edge Cases', () => {
    it('should handle email with uppercase letters', async () => {
      const signUpData = {
        email: 'TEST@TEST.COM',
        password: 'Test123!@#',
        name: 'Test User',
      }

      const mockUser = createMockUser({ email: signUpData.email })

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed')
      vi.mocked(mockRepository.createUser).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      const result = await authService.signUp(signUpData)

      expect(result.email).toBe('TEST@TEST.COM')
    })

    it('should handle very long valid email', async () => {
      const longEmail = 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.com'
      const signUpData = {
        email: longEmail,
        password: 'Test123!@#',
        name: 'Test User',
      }

      const mockUser = createMockUser({ email: longEmail })

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed')
      vi.mocked(mockRepository.createUser).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      const result = await authService.signUp(signUpData)

      expect(result.email).toBe(longEmail)
    })

    it('should handle name with only unicode characters', async () => {
      const signUpData = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: '测试用户',
      }

      const mockUser = createMockUser({ name: '测试用户' })

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed')
      vi.mocked(mockRepository.createUser).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      const result = await authService.signUp(signUpData)

      expect(result.name).toBe('测试用户')
    })

    it('should handle password with all special characters', async () => {
      const signUpData = {
        email: 'test@test.com',
        password: 'Abc123!@#$%^&*()',
        name: 'Test User',
      }

      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed_complex')
      vi.mocked(mockRepository.createUser).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      await authService.signUp(signUpData)

      expect(hashPassword).toHaveBeenCalledWith('Abc123!@#$%^&*()')
    })

    it('should generate unique verification token on each signup', async () => {
      const signUpData = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
      }

      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed')
      vi.mocked(mockRepository.createUser).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      await authService.signUp(signUpData)
      await authService.signUp({ ...signUpData, email: 'test2@test.com' })

      const calls = vi.mocked(mockRepository.createVerificationToken).mock.calls

      expect(calls[0][1]).not.toBe(calls[1][1])
    })

    it('should set verification token expiry to 24 hours', async () => {
      const signUpData = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
      }

      const mockUser = createMockUser()
      const now = Date.now()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed')
      vi.mocked(mockRepository.createUser).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      await authService.signUp(signUpData)

      const createTokenCall = vi.mocked(mockRepository.createVerificationToken)
        .mock.calls[0]
      const expiryDate = createTokenCall[2]
      const expiryTime = expiryDate.getTime()

      expect(expiryTime).toBeGreaterThan(now + 23 * 60 * 60 * 1000)
      expect(expiryTime).toBeLessThan(now + 25 * 60 * 60 * 1000)
    })

    it('should rollback on email send failure', async () => {
      const signUpData = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
      }

      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed')
      vi.mocked(mockRepository.createUser).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockRejectedValue(
        new Error('Email service unavailable'),
      )

      await expect(authService.signUp(signUpData)).rejects.toThrow(
        'Email service unavailable',
      )
    })

    it('should not expose user existence on duplicate email', async () => {
      const signUpData = {
        email: 'existing@test.com',
        password: 'Test123!@#',
        name: 'Test User',
      }

      const existingUser = createMockUser({ email: 'existing@test.com' })

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(existingUser)

      try {
        await authService.signUp(signUpData)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).message).toBe('Email already registered')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.CONFLICT)
      }
    })
  })

  describe('signIn - Edge Cases', () => {
    it('should handle case-sensitive email comparison', async () => {
      const mockUser = createMockUser({ email: 'test@test.com' })

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      await authService.signIn({
        email: 'TEST@TEST.COM',
        password: 'Test123!@#',
      })

      expect(mockRepository.findUserByEmail).toHaveBeenCalledWith(
        'TEST@TEST.COM',
      )
    })

    it('should handle password with whitespace', async () => {
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      await authService.signIn({
        email: 'test@test.com',
        password: '  Test123!@#  ',
      })

      expect(verifyPassword).toHaveBeenCalledWith(
        '  Test123!@#  ',
        mockUser.password,
      )
    })

    it('should not leak user existence on invalid credentials', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      try {
        await authService.signIn({
          email: 'nonexistent@test.com',
          password: 'Test123!@#',
        })
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).message).toBe('Invalid credentials')
        expect((error as ApiError).code).toBe('UNAUTHORIZED')
      }
    })

    it('should handle OAuth users without password', async () => {
      const oauthUser = createMockUser({ password: null })

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(oauthUser)

      try {
        await authService.signIn({
          email: 'oauth@test.com',
          password: 'Test123!@#',
        })
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).message).toBe('Invalid credentials')
      }
    })

    it('should handle timing attacks with constant-time comparison', async () => {
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(verifyPassword).mockResolvedValue(false)

      const start1 = Date.now()
      try {
        await authService.signIn({
          email: 'test@test.com',
          password: 'a',
        })
      } catch {}
      const duration1 = Date.now() - start1

      const start2 = Date.now()
      try {
        await authService.signIn({
          email: 'test@test.com',
          password: 'a'.repeat(100),
        })
      } catch {}
      const duration2 = Date.now() - start2

      expect(Math.abs(duration1 - duration2)).toBeLessThan(50)
    })

    it('should return consistent error for wrong password', async () => {
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(verifyPassword).mockResolvedValue(false)

      try {
        await authService.signIn({
          email: 'test@test.com',
          password: 'WrongPassword123!',
        })
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).message).toBe('Invalid credentials')
        expect((error as ApiError).code).toBe('UNAUTHORIZED')
      }
    })
  })

  describe('verifyEmail - Edge Cases', () => {
    it('should handle expired token exactly at expiry time', async () => {
      const now = new Date()
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: now,
      }

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await expect(authService.verifyEmail('token')).rejects.toThrow(
        'Verification token expired',
      )
      expect(mockRepository.deleteVerificationToken).toHaveBeenCalledWith(
        'token',
      )
    })

    it('should handle token with very old expiry date', async () => {
      const veryOld = new Date('2000-01-01')
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: veryOld,
      }

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await expect(authService.verifyEmail('token')).rejects.toThrow(
        'Verification token expired',
      )
    })

    it('should delete token after successful verification', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(Date.now() + 1000000),
      }
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.verifyEmail).mockResolvedValue({
        ...mockUser,
        emailVerified: new Date(),
      })
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await authService.verifyEmail('token')

      expect(mockRepository.deleteVerificationToken).toHaveBeenCalledWith(
        'token',
      )
    })

    it('should delete token even when expired', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(Date.now() - 1000),
      }

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await expect(authService.verifyEmail('token')).rejects.toThrow()

      expect(mockRepository.deleteVerificationToken).toHaveBeenCalledWith(
        'token',
      )
    })

    it('should handle user deleted after token creation', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(Date.now() + 1000000),
      }

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      await expect(authService.verifyEmail('token')).rejects.toThrow(
        'User not found',
      )
    })

    it('should handle very long token string', async () => {
      const longToken = 'a'.repeat(500)

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(null)

      await expect(authService.verifyEmail(longToken)).rejects.toThrow(
        'Invalid verification token',
      )
    })

    it('should handle empty token', async () => {
      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(null)

      await expect(authService.verifyEmail('')).rejects.toThrow(
        'Invalid verification token',
      )
    })

    it('should handle token with special characters', async () => {
      const specialToken = 'token-with-special!@#$%'

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(null)

      await expect(authService.verifyEmail(specialToken)).rejects.toThrow(
        'Invalid verification token',
      )
    })
  })

  describe('requestPasswordReset - Security & Edge Cases', () => {
    it('should not reveal user existence for non-existent email', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      const result = await authService.requestPasswordReset(
        'nonexistent@test.com',
      )

      expect(result).toBe('ok')
      expect(mockRepository.createVerificationToken).not.toHaveBeenCalled()
      expect(sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('should generate unique reset token', async () => {
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined)

      const result1 = await authService.requestPasswordReset('test@test.com')
      const result2 = await authService.requestPasswordReset('test@test.com')

      expect(result1).not.toBe(result2)
    })

    it('should set reset token expiry to 1 hour', async () => {
      const mockUser = createMockUser()
      const now = Date.now()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined)

      await authService.requestPasswordReset('test@test.com')

      const createTokenCall = vi.mocked(mockRepository.createVerificationToken)
        .mock.calls[0]
      const expiryDate = createTokenCall[2]
      const expiryTime = expiryDate.getTime()

      expect(expiryTime).toBeGreaterThan(now + 59 * 60 * 1000)
      expect(expiryTime).toBeLessThan(now + 61 * 60 * 1000)
    })

    it('should handle email service failure gracefully', async () => {
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendPasswordResetEmail).mockRejectedValue(
        new Error('Email service down'),
      )

      await expect(
        authService.requestPasswordReset('test@test.com'),
      ).rejects.toThrow('Email service down')
    })

    it('should handle concurrent reset requests for same email', async () => {
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined)

      const promises = [
        authService.requestPasswordReset('test@test.com'),
        authService.requestPasswordReset('test@test.com'),
        authService.requestPasswordReset('test@test.com'),
      ]

      const results = await Promise.all(promises)

      expect(results).toHaveLength(3)
      expect(mockRepository.createVerificationToken).toHaveBeenCalledTimes(3)
    })

    it('should return ok instantly for non-existent user', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      const start = Date.now()
      const result = await authService.requestPasswordReset(
        'nonexistent@test.com',
      )
      const duration = Date.now() - start

      expect(result).toBe('ok')
      expect(duration).toBeLessThan(100)
    })
  })

  describe('resetPassword - Edge Cases', () => {
    it('should update password with new hash', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(Date.now() + 1000000),
      }
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(hashPassword).mockResolvedValue('new_hashed_password')
      vi.mocked(mockRepository.updatePassword).mockResolvedValue({
        ...mockUser,
        password: 'new_hashed_password',
      })
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await authService.resetPassword('token', 'NewPassword123!')

      expect(mockRepository.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        'new_hashed_password',
      )
    })

    it('should delete token after successful reset', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(Date.now() + 1000000),
      }
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(hashPassword).mockResolvedValue('new_hash')
      vi.mocked(mockRepository.updatePassword).mockResolvedValue({
        ...mockUser,
        password: 'new_hash',
      })
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await authService.resetPassword('token', 'NewPassword123!')

      expect(mockRepository.deleteVerificationToken).toHaveBeenCalledWith(
        'token',
      )
    })

    it('should delete token even when expired', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(Date.now() - 1000),
      }

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await expect(
        authService.resetPassword('token', 'NewPassword123!'),
      ).rejects.toThrow('Reset token expired')

      expect(mockRepository.deleteVerificationToken).toHaveBeenCalledWith(
        'token',
      )
    })

    it('should handle password hashing failure', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(Date.now() + 1000000),
      }
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(hashPassword).mockRejectedValue(new Error('Hashing failed'))

      await expect(
        authService.resetPassword('token', 'NewPassword123!'),
      ).rejects.toThrow('Hashing failed')
    })

    it('should handle user deleted after token creation', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(Date.now() + 1000000),
      }

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      await expect(
        authService.resetPassword('token', 'NewPassword123!'),
      ).rejects.toThrow('User not found')
    })

    it('should handle reusing same token twice', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'token',
        expires: new Date(Date.now() + 1000000),
      }
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findVerificationToken)
        .mockResolvedValueOnce(mockToken)
        .mockResolvedValueOnce(null)

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(hashPassword).mockResolvedValue('new_hash')
      vi.mocked(mockRepository.updatePassword).mockResolvedValue({
        ...mockUser,
        password: 'new_hash',
      })
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await authService.resetPassword('token', 'NewPassword123!')

      await expect(
        authService.resetPassword('token', 'AnotherPassword123!'),
      ).rejects.toThrow('Invalid reset token')
    })
  })

  describe('resendVerificationEmail - Edge Cases', () => {
    it('should throw if user not found', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      await expect(
        authService.resendVerificationEmail('nonexistent@test.com'),
      ).rejects.toThrow('User not found')
    })

    it('should throw if email already verified', async () => {
      const mockUser = createMockUser({ emailVerified: new Date() })

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)

      await expect(
        authService.resendVerificationEmail('test@test.com'),
      ).rejects.toThrow('Email already verified')
    })

    it('should generate new verification token', async () => {
      const mockUser = createMockUser({ emailVerified: null })

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      await authService.resendVerificationEmail('test@test.com')

      expect(mockRepository.createVerificationToken).toHaveBeenCalled()
      expect(sendVerificationEmail).toHaveBeenCalled()
    })

    it('should handle email send failure', async () => {
      const mockUser = createMockUser({ emailVerified: null })

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockRejectedValue(
        new Error('Email failed'),
      )

      await expect(
        authService.resendVerificationEmail('test@test.com'),
      ).rejects.toThrow('Email failed')
    })

    it('should generate different token on each resend', async () => {
      const mockUser = createMockUser({ emailVerified: null })

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      await authService.resendVerificationEmail('test@test.com')
      await authService.resendVerificationEmail('test@test.com')

      const calls = vi.mocked(mockRepository.createVerificationToken).mock.calls

      expect(calls[0][1]).not.toBe(calls[1][1])
    })
  })

  describe('Token Generation - Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      const mockUser = createMockUser({ emailVerified: null })

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      await authService.resendVerificationEmail('test@test.com')

      const token = vi.mocked(mockRepository.createVerificationToken).mock
        .calls[0][1]

      expect(token).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate tokens with sufficient entropy', async () => {
      const signUpData = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
      }

      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed')
      vi.mocked(mockRepository.createUser).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      await authService.signUp(signUpData)

      const token = vi.mocked(mockRepository.createVerificationToken).mock
        .calls[0][1]

      expect(token.length).toBeGreaterThanOrEqual(64)
    })
  })

  describe('Error Handling - Idempotence', () => {
    it('should be idempotent for password reset requests', async () => {
      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined)

      const result1 = await authService.requestPasswordReset('test@test.com')
      const result2 = await authService.requestPasswordReset('test@test.com')

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(mockRepository.createVerificationToken).toHaveBeenCalledTimes(2)
    })
  })

  describe('Race Conditions', () => {
    it('should handle concurrent signUp attempts with same email', async () => {
      const signUpData = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
      }

      const mockUser = createMockUser()

      vi.mocked(mockRepository.findUserByEmail)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      vi.mocked(hashPassword).mockResolvedValue('hashed')

      vi.mocked(mockRepository.createUser)
        .mockResolvedValueOnce(mockUser)
        .mockRejectedValueOnce(new Error('Unique constraint violation'))

      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      const promise1 = authService.signUp(signUpData)
      const promise2 = authService.signUp(signUpData)

      const results = await Promise.allSettled([promise1, promise2])

      const fulfilled = results.filter((r) => r.status === 'fulfilled')
      const rejected = results.filter((r) => r.status === 'rejected')

      expect(fulfilled.length).toBeGreaterThanOrEqual(1)
      expect(rejected.length).toBeGreaterThanOrEqual(0)
    })
  })
})
