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

describe('AuthService', () => {
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
    } as any

    authService = new AuthService(mockRepository)
    vi.clearAllMocks()
  })

  describe('signUp', () => {
    const signUpData = {
      email: 'test@test.com',
      password: 'Test123!@#',
      name: 'Test User',
    }

    it('should create new user successfully', async () => {
      const mockUser = {
        id: '1',
        email: signUpData.email,
        name: signUpData.name,
        role: 'user',
        password: 'hashed',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed_password')
      vi.mocked(mockRepository.createUser).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      const result = await authService.signUp(signUpData)

      expect(result.email).toBe(signUpData.email)
      expect(result.name).toBe(signUpData.name)
      expect(mockRepository.findUserByEmail).toHaveBeenCalledWith(
        signUpData.email,
      )
      expect(hashPassword).toHaveBeenCalledWith(signUpData.password)
      expect(mockRepository.createUser).toHaveBeenCalled()
      expect(mockRepository.createVerificationToken).toHaveBeenCalled()
      expect(sendVerificationEmail).toHaveBeenCalledWith(
        signUpData.email,
        expect.any(String),
      )
    })

    it('should throw error if email already exists', async () => {
      const existingUser = {
        id: '1',
        email: signUpData.email,
        name: 'Existing User',
        role: 'user',
        password: 'hashed',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(existingUser)

      await expect(authService.signUp(signUpData)).rejects.toThrow(ApiError)
      await expect(authService.signUp(signUpData)).rejects.toThrow(
        'Email already registered',
      )
    })

    it('should throw ApiError with CONFLICT status', async () => {
      const existingUser = {
        id: '1',
        email: signUpData.email,
        name: 'Existing User',
        role: 'user',
        password: 'hashed',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(existingUser)

      try {
        await authService.signUp(signUpData)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.CONFLICT)
        expect((error as ApiError).code).toBe('CONFLICT')
      }
    })
  })

  describe('signIn', () => {
    const signInData = {
      email: 'test@test.com',
      password: 'Test123!@#',
    }

    it('should sign in user successfully', async () => {
      const mockUser = {
        id: '1',
        email: signInData.email,
        name: 'Test User',
        password: 'hashed_password',
        role: 'user',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const result = await authService.signIn(signInData)

      expect(result.email).toBe(signInData.email)
      expect(result.id).toBe('1')
      expect(mockRepository.findUserByEmail).toHaveBeenCalledWith(
        signInData.email,
      )
      expect(verifyPassword).toHaveBeenCalledWith(
        signInData.password,
        mockUser.password,
      )
    })

    it('should throw error if user not found', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      await expect(authService.signIn(signInData)).rejects.toThrow(ApiError)
      await expect(authService.signIn(signInData)).rejects.toThrow(
        'Invalid credentials',
      )
    })

    it('should throw error if user has no password (OAuth user)', async () => {
      const oauthUser = {
        id: '1',
        email: signInData.email,
        name: 'Test User',
        password: null,
        role: 'user',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(oauthUser)

      await expect(authService.signIn(signInData)).rejects.toThrow(ApiError)
      await expect(authService.signIn(signInData)).rejects.toThrow(
        'Invalid credentials',
      )
    })

    it('should throw error if password is invalid', async () => {
      const mockUser = {
        id: '1',
        email: signInData.email,
        name: 'Test User',
        password: 'hashed_password',
        role: 'user',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(verifyPassword).mockResolvedValue(false)

      await expect(authService.signIn(signInData)).rejects.toThrow(ApiError)
      await expect(authService.signIn(signInData)).rejects.toThrow(
        'Invalid credentials',
      )
    })

    it('should throw ApiError with UNAUTHORIZED status', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      try {
        await authService.signIn(signInData)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.UNAUTHORIZED)
        expect((error as ApiError).code).toBe('UNAUTHORIZED')
      }
    })
  })

  describe('verifyEmail', () => {
    const token = 'valid_token'

    it('should verify email successfully', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

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

      await authService.verifyEmail(token)

      expect(mockRepository.findVerificationToken).toHaveBeenCalledWith(token)
      expect(mockRepository.verifyEmail).toHaveBeenCalledWith(mockUser.id)
      expect(mockRepository.deleteVerificationToken).toHaveBeenCalledWith(token)
    })

    it('should throw error if token not found', async () => {
      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(null)

      await expect(authService.verifyEmail(token)).rejects.toThrow(ApiError)
      await expect(authService.verifyEmail(token)).rejects.toThrow(
        'Invalid verification token',
      )
    })

    it('should throw error if token expired', async () => {
      const expiredToken = {
        identifier: 'test@test.com',
        token,
        expires: new Date(Date.now() - 1000),
      }

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        expiredToken,
      )
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await expect(authService.verifyEmail(token)).rejects.toThrow(ApiError)
      await expect(authService.verifyEmail(token)).rejects.toThrow(
        'Verification token expired',
      )
      expect(mockRepository.deleteVerificationToken).toHaveBeenCalledWith(token)
    })

    it('should throw error if user not found', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      await expect(authService.verifyEmail(token)).rejects.toThrow(ApiError)
      await expect(authService.verifyEmail(token)).rejects.toThrow(
        'User not found',
      )
    })
  })

  describe('requestPasswordReset', () => {
    const email = 'test@test.com'

    it('should create reset token and send email', async () => {
      const mockUser = {
        id: '1',
        email,
        name: 'Test User',
        password: 'hashed',
        role: 'user',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined)

      const result = await authService.requestPasswordReset(email)

      expect(result).toBeDefined()
      expect(mockRepository.findUserByEmail).toHaveBeenCalledWith(email)
      expect(mockRepository.createVerificationToken).toHaveBeenCalled()
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        email,
        expect.any(String),
      )
    })

    it('should return ok even if user not found (security)', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      const result = await authService.requestPasswordReset(email)

      expect(result).toBe('ok')
      expect(mockRepository.createVerificationToken).not.toHaveBeenCalled()
      expect(sendPasswordResetEmail).not.toHaveBeenCalled()
    })
  })

  describe('resetPassword', () => {
    const token = 'valid_token'
    const newPassword = 'NewPass123!@#'

    it('should reset password successfully', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      }

      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        password: 'old_hashed',
        role: 'user',
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(hashPassword).mockResolvedValue('new_hashed')
      vi.mocked(mockRepository.updatePassword).mockResolvedValue({
        ...mockUser,
        password: 'new_hashed',
      })
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await authService.resetPassword(token, newPassword)

      expect(mockRepository.findVerificationToken).toHaveBeenCalledWith(token)
      expect(hashPassword).toHaveBeenCalledWith(newPassword)
      expect(mockRepository.updatePassword).toHaveBeenCalledWith(
        mockUser.id,
        'new_hashed',
      )
      expect(mockRepository.deleteVerificationToken).toHaveBeenCalledWith(token)
    })

    it('should throw error if token not found', async () => {
      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(null)

      await expect(
        authService.resetPassword(token, newPassword),
      ).rejects.toThrow(ApiError)
      await expect(
        authService.resetPassword(token, newPassword),
      ).rejects.toThrow('Invalid reset token')
    })

    it('should throw error if token expired', async () => {
      const expiredToken = {
        identifier: 'test@test.com',
        token,
        expires: new Date(Date.now() - 1000),
      }

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        expiredToken,
      )
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await expect(
        authService.resetPassword(token, newPassword),
      ).rejects.toThrow(ApiError)
      await expect(
        authService.resetPassword(token, newPassword),
      ).rejects.toThrow('Reset token expired')
    })

    it('should throw error if user not found', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      }

      vi.mocked(mockRepository.findVerificationToken).mockResolvedValue(
        mockToken,
      )
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      await expect(
        authService.resetPassword(token, newPassword),
      ).rejects.toThrow(ApiError)
      await expect(
        authService.resetPassword(token, newPassword),
      ).rejects.toThrow('User not found')
    })
  })
})
