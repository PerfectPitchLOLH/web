import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { AuthController } from '../auth.controller'
import { AuthService } from '../auth.service'

describe('AuthController', () => {
  let authController: AuthController
  let mockService: AuthService

  beforeEach(() => {
    mockService = {
      signUp: vi.fn(),
      signIn: vi.fn(),
      verifyEmail: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
    } as any

    authController = new AuthController(mockService)
    vi.clearAllMocks()
  })

  describe('signUp', () => {
    it('should create user successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
        emailVerified: null,
        image: null,
      }

      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
      }

      vi.mocked(mockService.signUp).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(data.success).toBe(true)
      expect(data.data.user).toEqual(mockUser)
      expect(data.data.message).toBe('Verification email sent')
    })

    it('should return validation error for invalid email', async () => {
      const requestBody = {
        email: 'invalid-email',
        password: 'Test123!@#',
        name: 'Test User',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should return validation error for weak password', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'weak',
        name: 'Test User',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should return conflict error for existing email', async () => {
      const requestBody = {
        email: 'existing@test.com',
        password: 'Test123!@#',
        name: 'Test User',
      }

      vi.mocked(mockService.signUp).mockRejectedValue(
        new ApiError(
          'CONFLICT',
          HTTP_STATUS.CONFLICT,
          'Email already registered',
        ),
      )

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CONFLICT)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Email already registered')
    })
  })

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
        emailVerified: null,
        image: null,
      }

      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
      }

      vi.mocked(mockService.signIn).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signIn(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockUser)
    })

    it('should return unauthorized for invalid credentials', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'WrongPassword123!',
      }

      vi.mocked(mockService.signIn).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Invalid credentials',
        ),
      )

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signIn(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Invalid credentials')
    })

    it('should return validation error for missing password', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: '',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signIn(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      vi.mocked(mockService.verifyEmail).mockResolvedValue(undefined)

      const request = new NextRequest(
        'http://localhost:3000/api/auth/verify-email?token=valid_token',
        {
          method: 'GET',
        },
      )

      const response = await authController.verifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data.message).toBe('Email verified successfully')
      expect(mockService.verifyEmail).toHaveBeenCalledWith('valid_token')
    })

    it('should return error for missing token', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/verify-email',
        {
          method: 'GET',
        },
      )

      const response = await authController.verifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should return error for invalid token', async () => {
      vi.mocked(mockService.verifyEmail).mockRejectedValue(
        new ApiError(
          'NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'Invalid verification token',
        ),
      )

      const request = new NextRequest(
        'http://localhost:3000/api/auth/verify-email?token=invalid_token',
        {
          method: 'GET',
        },
      )

      const response = await authController.verifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Invalid verification token')
    })

    it('should return error for expired token', async () => {
      vi.mocked(mockService.verifyEmail).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Verification token expired',
        ),
      )

      const request = new NextRequest(
        'http://localhost:3000/api/auth/verify-email?token=expired_token',
        {
          method: 'GET',
        },
      )

      const response = await authController.verifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Verification token expired')
    })
  })

  describe('requestPasswordReset', () => {
    it('should send reset email successfully', async () => {
      vi.mocked(mockService.requestPasswordReset).mockResolvedValue(
        'reset_token',
      )

      const requestBody = {
        email: 'test@test.com',
      }

      const request = new NextRequest(
        'http://localhost:3000/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      )

      const response = await authController.requestPasswordReset(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data.message).toBe('If email exists, reset link sent')
      expect(mockService.requestPasswordReset).toHaveBeenCalledWith(
        'test@test.com',
      )
    })

    it('should return validation error for invalid email', async () => {
      const requestBody = {
        email: 'invalid-email',
      }

      const request = new NextRequest(
        'http://localhost:3000/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      )

      const response = await authController.requestPasswordReset(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should return same message even for non-existent email (security)', async () => {
      vi.mocked(mockService.requestPasswordReset).mockResolvedValue('ok')

      const requestBody = {
        email: 'nonexistent@test.com',
      }

      const request = new NextRequest(
        'http://localhost:3000/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      )

      const response = await authController.requestPasswordReset(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data.message).toBe('If email exists, reset link sent')
    })
  })

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      vi.mocked(mockService.resetPassword).mockResolvedValue(undefined)

      const requestBody = {
        token: 'valid_token',
        password: 'NewPass123!@#',
      }

      const request = new NextRequest(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      )

      const response = await authController.resetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data.message).toBe('Password reset successfully')
      expect(mockService.resetPassword).toHaveBeenCalledWith(
        'valid_token',
        'NewPass123!@#',
      )
    })

    it('should return validation error for weak password', async () => {
      const requestBody = {
        token: 'valid_token',
        password: 'weak',
      }

      const request = new NextRequest(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      )

      const response = await authController.resetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should return error for invalid token', async () => {
      vi.mocked(mockService.resetPassword).mockRejectedValue(
        new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Invalid reset token'),
      )

      const requestBody = {
        token: 'invalid_token',
        password: 'NewPass123!@#',
      }

      const request = new NextRequest(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      )

      const response = await authController.resetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Invalid reset token')
    })

    it('should return error for expired token', async () => {
      vi.mocked(mockService.resetPassword).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Reset token expired',
        ),
      )

      const requestBody = {
        token: 'expired_token',
        password: 'NewPass123!@#',
      }

      const request = new NextRequest(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      )

      const response = await authController.resetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Reset token expired')
    })

    it('should return validation error for missing token', async () => {
      const requestBody = {
        token: '',
        password: 'NewPass123!@#',
      }

      const request = new NextRequest(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      )

      const response = await authController.resetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })
})
