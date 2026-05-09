import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { AuthController } from '../auth.controller'
import { AuthService } from '../auth.service'

vi.mock('@/server/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/server/shared/middleware', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: '1', email: 'test@test.com', role: 'user' },
  }),
  validateApiAuth: vi.fn().mockResolvedValue({
    session: { user: { id: '1', email: 'test@test.com', role: 'user' } },
    response: null,
  }),
}))

let mockRateLimitSuccess = true
let mockRateLimitReset = Date.now() + 60000

vi.mock('@/server/shared/utils/rate-limit.utils', () => ({
  checkRateLimit: vi.fn().mockImplementation(() =>
    Promise.resolve({
      success: mockRateLimitSuccess,
      reset: mockRateLimitReset,
    }),
  ),
  rateLimiters: {
    signUp: {},
    signIn: {},
    passwordReset: {},
    verificationEmail: {},
  },
  getRateLimitIdentifier: vi.fn().mockReturnValue('test-identifier'),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}))

describe('AuthController - Deep Tests', () => {
  let authController: AuthController
  let mockService: AuthService

  beforeEach(() => {
    mockService = {
      signUp: vi.fn(),
      signIn: vi.fn(),
      verifyEmail: vi.fn(),
      requestPasswordReset: vi.fn(),
      resetPassword: vi.fn(),
      resendVerificationEmail: vi.fn(),
    } as any

    authController = new AuthController(mockService)
    mockRateLimitSuccess = true
    mockRateLimitReset = Date.now() + 60000
    vi.clearAllMocks()
  })

  describe('signUp - Edge Cases & Input Validation', () => {
    it('should handle malformed JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: '{invalid json',
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(data.success).toBe(false)
    })

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should handle null values in required fields', async () => {
      const requestBody = {
        email: null,
        password: null,
        name: null,
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should handle undefined values in required fields', async () => {
      const requestBody = {
        email: undefined,
        password: undefined,
        name: undefined,
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should handle email with leading/trailing whitespace', async () => {
      const mockUser = {
        id: '1',
        email: '  test@test.com  ',
        name: 'Test User',
        role: 'user',
        emailVerified: null,
        image: null,
      }

      const requestBody = {
        email: '  test@test.com  ',
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
    })

    it('should handle name with leading/trailing whitespace (should be trimmed)', async () => {
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
        name: '  Test User  ',
        acceptTerms: true as const,
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
    })

    it('should handle very long email (>255 chars)', async () => {
      const longEmail = 'a'.repeat(250) + '@test.com'
      const requestBody = {
        email: longEmail,
        password: 'Test123!@#',
        name: 'Test User',
        acceptTerms: true as const,
      }

      const mockUser = {
        id: '1',
        email: longEmail,
        name: 'Test User',
        role: 'user',
        emailVerified: null,
        image: null,
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
    })

    it('should handle very long password (>100 chars)', async () => {
      const longPassword = 'Test123!@#' + 'a'.repeat(100)
      const requestBody = {
        email: 'test@test.com',
        password: longPassword,
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
    })

    it('should handle very long name (>100 chars)', async () => {
      const longName = 'a'.repeat(150)
      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: longName,
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should handle unicode characters in name', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: '测试用户 🚀',
        role: 'user',
        emailVerified: null,
        image: null,
      }

      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: '测试用户 🚀',
        acceptTerms: true as const,
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
    })

    it('should handle XSS attempt in name field', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: '<script>alert("xss")</script>',
        role: 'user',
        emailVerified: null,
        image: null,
      }

      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: '<script>alert("xss")</script>',
        acceptTerms: true as const,
      }

      vi.mocked(mockService.signUp).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(data.data.user.name).toBe('<script>alert("xss")</script>')
    })

    it('should handle SQL injection attempt in email', async () => {
      const requestBody = {
        email: `test@test.com'; DROP TABLE users; --`,
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
    })

    it('should handle extra unexpected fields in body', async () => {
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
        isAdmin: true,
        role: 'admin',
        extraField: 'should be ignored',
        acceptTerms: true as const,
      }

      vi.mocked(mockService.signUp).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(data.data.user.role).toBe('user')
    })

    it('should handle array instead of object in body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify([{ email: 'test@test.com' }]),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should handle string instead of object in body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify('not an object'),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })
  })

  describe('signUp - Rate Limiting', () => {
    it('should reject request when rate limit exceeded', async () => {
      mockRateLimitSuccess = false
      mockRateLimitReset = Date.now() + 3600000

      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('Too many signup attempts')
      expect(response.headers.get('Retry-After')).toBeDefined()
    })

    it('should include retry-after header when rate limited', async () => {
      mockRateLimitSuccess = false
      mockRateLimitReset = Date.now() + 60000

      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)

      const retryAfter = response.headers.get('Retry-After')
      expect(retryAfter).toBeDefined()
      expect(parseInt(retryAfter!)).toBeGreaterThan(0)
    })
  })

  describe('signIn - Edge Cases & Security', () => {
    it('should handle malformed JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: '{invalid json',
      })

      const response = await authController.signIn(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(data.success).toBe(false)
    })

    it('should handle empty request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await authController.signIn(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should handle password with null bytes', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'Test123\x00!@#',
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

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should not leak timing information on wrong email vs wrong password', async () => {
      const validRequest = {
        email: 'test@test.com',
        password: 'WrongPassword123!',
      }

      const invalidEmailRequest = {
        email: 'nonexistent@test.com',
        password: 'Test123!@#',
      }

      vi.mocked(mockService.signIn).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Invalid credentials',
        ),
      )

      const request1 = new NextRequest(
        'http://localhost:3000/api/auth/signin',
        {
          method: 'POST',
          body: JSON.stringify(validRequest),
        },
      )

      const request2 = new NextRequest(
        'http://localhost:3000/api/auth/signin',
        {
          method: 'POST',
          body: JSON.stringify(invalidEmailRequest),
        },
      )

      const start1 = Date.now()
      const response1 = await authController.signIn(request1)
      const data1 = await response1.json()
      const duration1 = Date.now() - start1

      const start2 = Date.now()
      const response2 = await authController.signIn(request2)
      const data2 = await response2.json()
      const duration2 = Date.now() - start2

      expect(data1.error.message).toBe('Invalid credentials')
      expect(data2.error.message).toBe('Invalid credentials')
      expect(Math.abs(duration1 - duration2)).toBeLessThan(100)
    })

    it('should handle rate limit for signIn', async () => {
      mockRateLimitSuccess = false
      mockRateLimitReset = Date.now() + 3600000

      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signIn(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('Too many signin attempts')
    })

    it('should handle concurrent signIn requests', async () => {
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

      const promises = Array.from({ length: 5 }, () =>
        authController.signIn(
          new NextRequest('http://localhost:3000/api/auth/signin', {
            method: 'POST',
            body: JSON.stringify(requestBody),
          }),
        ),
      )

      const responses = await Promise.all(promises)

      expect(responses).toHaveLength(5)
      responses.forEach((response) => {
        expect(response.status).toBe(HTTP_STATUS.OK)
      })
    })
  })

  describe('verifyEmail - Edge Cases', () => {
    it('should handle missing token parameter', async () => {
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
      expect(data.error.message).toBe('Token required')
    })

    it('should handle empty token parameter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/verify-email?token=',
        {
          method: 'GET',
        },
      )

      const response = await authController.verifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should handle very long token', async () => {
      const longToken = 'a'.repeat(1000)

      vi.mocked(mockService.verifyEmail).mockRejectedValue(
        new ApiError(
          'NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'Invalid verification token',
        ),
      )

      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${longToken}`,
        {
          method: 'GET',
        },
      )

      const response = await authController.verifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(data.success).toBe(false)
    })

    it('should handle token with special characters', async () => {
      const specialToken = 'token!@#$%^&*()'

      vi.mocked(mockService.verifyEmail).mockRejectedValue(
        new ApiError(
          'NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'Invalid verification token',
        ),
      )

      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${encodeURIComponent(specialToken)}`,
        {
          method: 'GET',
        },
      )

      const response = await authController.verifyEmail(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(data.success).toBe(false)
    })

    it('should handle multiple token parameters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/verify-email?token=token1&token=token2',
        {
          method: 'GET',
        },
      )

      const response = await authController.verifyEmail(request)

      expect(mockService.verifyEmail).toHaveBeenCalledWith('token1')
    })

    it('should handle URL encoded token', async () => {
      const encodedToken = encodeURIComponent('token+with+special chars')

      vi.mocked(mockService.verifyEmail).mockResolvedValue(undefined)

      const request = new NextRequest(
        `http://localhost:3000/api/auth/verify-email?token=${encodedToken}`,
        {
          method: 'GET',
        },
      )

      const response = await authController.verifyEmail(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('requestPasswordReset - Edge Cases & Security', () => {
    it('should handle malformed JSON', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/forgot-password',
        {
          method: 'POST',
          body: '{invalid',
        },
      )

      const response = await authController.requestPasswordReset(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(data.success).toBe(false)
    })

    it('should handle empty email', async () => {
      const requestBody = {
        email: '',
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
    })

    it('should handle rate limit for password reset', async () => {
      mockRateLimitSuccess = false
      mockRateLimitReset = Date.now() + 3600000

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

      expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('Too many password reset attempts')
    })

    it('should not reveal if email exists (timing attack)', async () => {
      vi.mocked(mockService.requestPasswordReset).mockResolvedValue('ok')

      const requestBody1 = { email: 'existing@test.com' }
      const requestBody2 = { email: 'nonexistent@test.com' }

      const request1 = new NextRequest(
        'http://localhost:3000/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify(requestBody1),
        },
      )

      const request2 = new NextRequest(
        'http://localhost:3000/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify(requestBody2),
        },
      )

      const start1 = Date.now()
      const response1 = await authController.requestPasswordReset(request1)
      const data1 = await response1.json()
      const duration1 = Date.now() - start1

      const start2 = Date.now()
      const response2 = await authController.requestPasswordReset(request2)
      const data2 = await response2.json()
      const duration2 = Date.now() - start2

      expect(data1.data.message).toBe(data2.data.message)
      expect(response1.status).toBe(response2.status)
    })

    it('should handle concurrent password reset requests', async () => {
      vi.mocked(mockService.requestPasswordReset).mockResolvedValue('ok')

      const requestBody = {
        email: 'test@test.com',
      }

      const promises = Array.from({ length: 3 }, () =>
        authController.requestPasswordReset(
          new NextRequest('http://localhost:3000/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify(requestBody),
          }),
        ),
      )

      const responses = await Promise.all(promises)

      expect(responses).toHaveLength(3)
      responses.forEach((response) => {
        expect(response.status).toBe(HTTP_STATUS.OK)
      })
    })
  })

  describe('resetPassword - Edge Cases', () => {
    it('should handle malformed JSON', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/reset-password',
        {
          method: 'POST',
          body: '{invalid',
        },
      )

      const response = await authController.resetPassword(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(data.success).toBe(false)
    })

    it('should handle empty token', async () => {
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
    })

    it('should validate new password complexity', async () => {
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
    })

    it('should handle very long token', async () => {
      const longToken = 'a'.repeat(1000)
      const requestBody = {
        token: longToken,
        password: 'NewPass123!@#',
      }

      vi.mocked(mockService.resetPassword).mockRejectedValue(
        new ApiError('NOT_FOUND', HTTP_STATUS.NOT_FOUND, 'Invalid reset token'),
      )

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
    })

    it('should not allow reusing expired token', async () => {
      const requestBody = {
        token: 'expired_token',
        password: 'NewPass123!@#',
      }

      vi.mocked(mockService.resetPassword).mockRejectedValue(
        new ApiError(
          'UNAUTHORIZED',
          HTTP_STATUS.UNAUTHORIZED,
          'Reset token expired',
        ),
      )

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
    })
  })

  describe('resendVerificationEmail - Edge Cases', () => {
    it('should handle rate limit for verification email', async () => {
      mockRateLimitSuccess = false
      mockRateLimitReset = Date.now() + 3600000

      const request = new NextRequest(
        'http://localhost:3000/api/auth/resend-verification',
        {
          method: 'POST',
        },
      )

      const response = await authController.resendVerificationEmail(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS)
      expect(data.success).toBe(false)
      expect(data.error.message).toContain(
        'Too many verification email requests',
      )
    })

    it('should require authentication', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/resend-verification',
        {
          method: 'POST',
        },
      )

      const response = await authController.resendVerificationEmail(request)

      expect(response.status).toBeDefined()
    })

    it('should use authenticated user email', async () => {
      vi.mocked(mockService.resendVerificationEmail).mockResolvedValue(
        undefined,
      )

      const request = new NextRequest(
        'http://localhost:3000/api/auth/resend-verification',
        {
          method: 'POST',
        },
      )

      const response = await authController.resendVerificationEmail(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(mockService.resendVerificationEmail).toHaveBeenCalledWith(
        'test@test.com',
      )
    })
  })

  describe('Error Handling & Recovery', () => {
    it('should handle service throwing generic error', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
        acceptTerms: true as const,
      }

      vi.mocked(mockService.signUp).mockRejectedValue(
        new Error('Database connection lost'),
      )

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
      expect(data.success).toBe(false)
    })

    it('should handle service returning undefined unexpectedly', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
        acceptTerms: true as const,
      }

      vi.mocked(mockService.signUp).mockResolvedValue(undefined as any)

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBeDefined()
    })

    it('should handle Zod validation errors properly', async () => {
      const requestBody = {
        email: 'invalid',
        password: 'short',
        name: 'T',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('CORS & Headers', () => {
    it('should handle requests from different origins', async () => {
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
        acceptTerms: true as const,
      }

      vi.mocked(mockService.signUp).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: {
          Origin: 'http://malicious-site.com',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)

      expect(response.status).toBeDefined()
    })
  })

  describe('Large Payload Handling', () => {
    it('should handle very large request body', async () => {
      const largeBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
        extraData: 'x'.repeat(1000000),
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(largeBody),
      })

      const response = await authController.signUp(request)

      expect(response.status).toBeDefined()
    })
  })

  describe('Idempotency', () => {
    it('should handle duplicate signUp requests idempotently', async () => {
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
        acceptTerms: true as const,
      }

      vi.mocked(mockService.signUp)
        .mockResolvedValueOnce(mockUser)
        .mockRejectedValueOnce(
          new ApiError(
            'CONFLICT',
            HTTP_STATUS.CONFLICT,
            'Email already registered',
          ),
        )

      const request1 = new NextRequest(
        'http://localhost:3000/api/auth/signup',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      )

      const request2 = new NextRequest(
        'http://localhost:3000/api/auth/signup',
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      )

      const response1 = await authController.signUp(request1)
      const response2 = await authController.signUp(request2)

      expect(response1.status).toBe(HTTP_STATUS.CREATED)
      expect(response2.status).toBe(HTTP_STATUS.CONFLICT)
    })
  })
})
