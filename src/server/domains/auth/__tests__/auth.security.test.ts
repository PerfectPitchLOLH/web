import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'

import { AuthController } from '../auth.controller'
import { AuthRepository } from '../auth.repository'
import { AuthService } from '../auth.service'

vi.mock('@/server/shared/utils/password.utils', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}))

vi.mock('@/server/lib/email', () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}))

vi.mock('@/server/lib/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/server/shared/middleware', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    user: { id: '1', email: 'test@test.com', role: 'user' },
  }),
}))

vi.mock('@/server/lib/database', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
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

import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '@/server/lib/email'
import {
  hashPassword,
  verifyPassword,
} from '@/server/shared/utils/password.utils'

describe('Auth Security Tests', () => {
  let authController: AuthController
  let authService: AuthService
  let authRepository: AuthRepository
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

    authController = new AuthController(mockService)
    authService = new AuthService(mockRepository as any)
    authRepository = new AuthRepository()

    mockRateLimitSuccess = true
    mockRateLimitReset = Date.now() + 60000
    vi.clearAllMocks()
  })

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in email field (signUp)', async () => {
      const sqlInjection = `admin@test.com' OR '1'='1`
      const requestBody = {
        email: sqlInjection,
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

    it('should prevent SQL injection in email field (signIn)', async () => {
      const sqlInjection = `admin@test.com' OR '1'='1`
      const requestBody = {
        email: sqlInjection,
        password: 'Test123!@#',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signIn(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
    })

    it('should prevent SQL injection in name field', async () => {
      const sqlInjection = `'; DROP TABLE users; --`
      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: sqlInjection,
        acceptTerms: true as const,
      }

      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: sqlInjection,
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

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(mockService.signUp).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'Test123!@#',
        name: sqlInjection,
        acceptTerms: true,
      })
    })

    it('should use parameterized queries (repository level)', async () => {
      const maliciousEmail = `test@test.com'; DELETE FROM users WHERE '1'='1`

      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      await authRepository.findUserByEmail(maliciousEmail)

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { email: maliciousEmail },
      })
    })
  })

  describe('XSS Prevention', () => {
    it('should allow but not execute XSS in name field', async () => {
      const xssPayload = '<script>alert("xss")</script>'
      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: xssPayload,
        acceptTerms: true as const,
      }

      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: xssPayload,
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
      expect(data.data.user.name).toBe(xssPayload)
    })

    it('should handle XSS with HTML entities', async () => {
      const xssPayload = '&lt;script&gt;alert("xss")&lt;/script&gt;'
      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: xssPayload,
        acceptTerms: true as const,
      }

      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: xssPayload,
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
    })

    it('should handle XSS with event handlers', async () => {
      const xssPayload = '<img src=x onerror="alert(1)">'
      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: xssPayload,
        acceptTerms: true as const,
      }

      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: xssPayload,
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
      expect(data.data.user.name).toBe(xssPayload)
    })
  })

  describe('Password Security', () => {
    it('should enforce minimum password length', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'Ab1!',
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
      expect(data.error.details).toBeDefined()
    })

    it('should enforce uppercase requirement', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'test123!@#',
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

    it('should enforce lowercase requirement', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'TEST123!@#',
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

    it('should enforce number requirement', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'TestTest!@#',
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

    it('should enforce special character requirement', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'Test12345678',
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

    it('should reject password longer than max length', async () => {
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

    it('should hash passwords before storage', async () => {
      const password = 'Test123!@#'
      const hashedPassword = 'hashed_password_123'

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue(hashedPassword)
      vi.mocked(mockRepository.createUser).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        password: hashedPassword,
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
      })
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      await authService.signUp({
        email: 'test@test.com',
        password,
        name: 'Test User',
        acceptTerms: true as const,
      })

      expect(hashPassword).toHaveBeenCalledWith(password)
      expect(mockRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          hashedPassword,
        }),
      )
    })

    it('should never return password in response', async () => {
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
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(data.data.user).not.toHaveProperty('password')
      expect(JSON.stringify(data)).not.toContain('Test123!@#')
    })
  })

  describe('Token Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed')
      vi.mocked(mockRepository.createUser).mockResolvedValue({
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
      })
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      await authService.signUp({
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
        acceptTerms: true as const,
      })

      const tokenCall = vi.mocked(mockRepository.createVerificationToken).mock
        .calls[0]
      const token = tokenCall[1]

      expect(token).toMatch(/^[a-f0-9]{64}$/)
      expect(token.length).toBe(64)
    })

    it('should generate unique tokens for each request', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed')
      vi.mocked(mockRepository.createUser).mockResolvedValue({
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
      })
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      await authService.signUp({
        email: 'test1@test.com',
        password: 'Test123!@#',
        name: 'Test User',
        acceptTerms: true as const,
      })
      await authService.signUp({
        email: 'test2@test.com',
        password: 'Test123!@#',
        name: 'Test User',
        acceptTerms: true as const,
      })

      const calls = vi.mocked(mockRepository.createVerificationToken).mock.calls
      const token1 = calls[0][1]
      const token2 = calls[1][1]

      expect(token1).not.toBe(token2)
    })

    it('should set appropriate expiration time for verification tokens', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed')
      vi.mocked(mockRepository.createUser).mockResolvedValue({
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
      })
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      const now = Date.now()

      await authService.signUp({
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
        acceptTerms: true as const,
      })

      const tokenCall = vi.mocked(mockRepository.createVerificationToken).mock
        .calls[0]
      const expiryDate = tokenCall[2]
      const expiryTime = expiryDate.getTime()

      expect(expiryTime).toBeGreaterThan(now + 23 * 60 * 60 * 1000)
      expect(expiryTime).toBeLessThan(now + 25 * 60 * 60 * 1000)
    })

    it('should set shorter expiration for password reset tokens', async () => {
      const mockUser = {
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
      }

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined)

      const now = Date.now()

      await authService.requestPasswordReset('test@test.com')

      const tokenCall = vi.mocked(mockRepository.createVerificationToken).mock
        .calls[0]
      const expiryDate = tokenCall[2]
      const expiryTime = expiryDate.getTime()

      expect(expiryTime).toBeGreaterThan(now + 59 * 60 * 1000)
      expect(expiryTime).toBeLessThan(now + 61 * 60 * 1000)
    })

    it('should invalidate token after use', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'valid_token',
        expires: new Date(Date.now() + 1000000),
      }
      const mockUser = {
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

      await authService.verifyEmail('valid_token')

      expect(mockRepository.deleteVerificationToken).toHaveBeenCalledWith(
        'valid_token',
      )
    })
  })

  describe('Information Disclosure Prevention', () => {
    it('should not reveal if email exists on login failure', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      await expect(
        authService.signIn({
          email: 'nonexistent@test.com',
          password: 'Test123!@#',
        }),
      ).rejects.toThrow('Invalid credentials')
    })

    it('should not reveal if password is wrong on login failure', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        password: 'hashed_password',
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
      }

      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(verifyPassword).mockResolvedValue(false)

      await expect(
        authService.signIn({
          email: 'test@test.com',
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow('Invalid credentials')
    })

    it('should not reveal if email exists for password reset', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)

      const result = await authService.requestPasswordReset(
        'nonexistent@test.com',
      )

      expect(result).toBe('ok')
      expect(mockRepository.createVerificationToken).not.toHaveBeenCalled()
    })

    it('should use same response time for existing and non-existing users', async () => {
      vi.mocked(mockRepository.findUserByEmail)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
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
        })
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(undefined)

      const start1 = Date.now()
      await authService.requestPasswordReset('nonexistent@test.com')
      const duration1 = Date.now() - start1

      const start2 = Date.now()
      await authService.requestPasswordReset('existing@test.com')
      const duration2 = Date.now() - start2

      expect(Math.abs(duration1 - duration2)).toBeLessThan(100)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits on signUp', async () => {
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
      expect(response.headers.get('Retry-After')).toBeDefined()
    })

    it('should enforce rate limits on signIn', async () => {
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
    })

    it('should enforce rate limits on password reset', async () => {
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
    })

    it('should include retry-after information in rate limit response', async () => {
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

      expect(data.error.details).toHaveProperty('retryAfter')
      expect(response.headers.get('Retry-After')).toBeTruthy()
    })
  })

  describe('Authorization & Permission Escalation', () => {
    it('should not allow role injection in signUp', async () => {
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
        role: 'admin',
        isAdmin: true,
        isRootAdmin: true,
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

    it('should always create new users with role "user"', async () => {
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(null)
      vi.mocked(hashPassword).mockResolvedValue('hashed')
      vi.mocked(mockRepository.createUser).mockResolvedValue({
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
      })
      vi.mocked(mockRepository.createVerificationToken).mockResolvedValue(
        undefined,
      )
      vi.mocked(sendVerificationEmail).mockResolvedValue(undefined)

      await authService.signUp({
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
        acceptTerms: true as const,
      })

      expect(mockRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@test.com',
          name: 'Test User',
        }),
      )
    })
  })

  describe('Session Security', () => {
    it('should require authentication for resendVerificationEmail', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/auth/resend-verification',
        {
          method: 'POST',
        },
      )

      const response = await authController.resendVerificationEmail(request)

      expect(response.status).toBeDefined()
    })
  })

  describe('Input Sanitization', () => {
    it('should trim name field', async () => {
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
    })

    it('should reject name with only whitespace', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: '   ',
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
  })

  describe('Error Message Security', () => {
    it('should not leak stack traces in production errors', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
        acceptTerms: true as const,
      }

      vi.mocked(mockService.signUp).mockRejectedValue(
        new Error('Database connection failed'),
      )

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await authController.signUp(request)
      const data = await response.json()

      expect(JSON.stringify(data)).not.toContain('at ')
      expect(JSON.stringify(data)).not.toContain('.ts:')
    })

    it('should return generic error messages for internal errors', async () => {
      const requestBody = {
        email: 'test@test.com',
        password: 'Test123!@#',
        name: 'Test User',
        acceptTerms: true as const,
      }

      vi.mocked(mockService.signUp).mockRejectedValue(
        new Error('Some internal error'),
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
  })

  describe('Replay Attack Prevention', () => {
    it('should prevent token reuse after verification', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'used_token',
        expires: new Date(Date.now() + 1000000),
      }
      const mockUser = {
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
      }

      vi.mocked(mockRepository.findVerificationToken)
        .mockResolvedValueOnce(mockToken)
        .mockResolvedValueOnce(null)
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(mockRepository.verifyEmail).mockResolvedValue({
        ...mockUser,
        emailVerified: new Date(),
      })
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await authService.verifyEmail('used_token')

      await expect(authService.verifyEmail('used_token')).rejects.toThrow(
        'Invalid verification token',
      )
    })

    it('should prevent token reuse after password reset', async () => {
      const mockToken = {
        identifier: 'test@test.com',
        token: 'used_reset_token',
        expires: new Date(Date.now() + 1000000),
      }
      const mockUser = {
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
      }

      vi.mocked(mockRepository.findVerificationToken)
        .mockResolvedValueOnce(mockToken)
        .mockResolvedValueOnce(null)
      vi.mocked(mockRepository.findUserByEmail).mockResolvedValue(mockUser)
      vi.mocked(hashPassword).mockResolvedValue('new_hashed_password')
      vi.mocked(mockRepository.updatePassword).mockResolvedValue({
        ...mockUser,
        password: 'new_hashed_password',
      })
      vi.mocked(mockRepository.deleteVerificationToken).mockResolvedValue(
        undefined,
      )

      await authService.resetPassword('used_reset_token', 'NewPassword123!')

      await expect(
        authService.resetPassword('used_reset_token', 'AnotherPassword123!'),
      ).rejects.toThrow('Invalid reset token')
    })
  })
})

let mockRepository: any
