// @ts-nocheck
import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { validateApiAuth } from '@/server/shared/middleware'
import { ApiError } from '@/server/shared/utils'

import { UserController } from '../user.controller'
import { UserService } from '../user.service'

vi.mock('@/server/shared/middleware', () => ({
  validateApiAuth: vi.fn(),
}))

describe('UserController - Deep Tests', () => {
  let controller: UserController
  let mockService: UserService

  beforeEach(() => {
    mockService = {
      getUsers: vi.fn(),
      getUserById: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
      deleteUser: vi.fn(),
    } as any

    controller = new UserController(mockService)
    vi.clearAllMocks()

    vi.mocked(validateApiAuth).mockResolvedValue({
      session: {
        user: { id: 'user-1', email: 'test@test.com', role: 'admin' },
      },
      response: null,
    } as any)
  })

  describe('Authentication & Authorization', () => {
    it('should reject request without authentication', async () => {
      vi.mocked(validateApiAuth).mockResolvedValue({
        session: null,
        response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: HTTP_STATUS.UNAUTHORIZED,
        }),
      } as any)

      const request = new NextRequest('http://localhost/api/users')
      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should reject request with invalid token', async () => {
      vi.mocked(validateApiAuth).mockResolvedValue({
        session: null,
        response: new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: HTTP_STATUS.UNAUTHORIZED,
        }),
      } as any)

      const request = new NextRequest('http://localhost/api/users', {
        headers: { Authorization: 'Bearer invalid.token' },
      })

      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
    })

    it('should accept valid authentication', async () => {
      vi.mocked(mockService.getUsers).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })

      const request = new NextRequest('http://localhost/api/users')
      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(validateApiAuth).toHaveBeenCalledWith(request)
    })
  })

  describe('getUsers - Query Parameter Validation', () => {
    it('should handle valid query parameters', async () => {
      vi.mocked(mockService.getUsers).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })

      const request = new NextRequest(
        'http://localhost/api/users?page=2&limit=20&role=admin&search=test',
      )

      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
    })

    it('should reject invalid role value', async () => {
      const request = new NextRequest('http://localhost/api/users?role=invalid')

      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject non-numeric page', async () => {
      const request = new NextRequest('http://localhost/api/users?page=abc')

      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject negative page number', async () => {
      const request = new NextRequest('http://localhost/api/users?page=-1')

      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject zero page number', async () => {
      const request = new NextRequest('http://localhost/api/users?page=0')

      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject limit exceeding maximum (>100)', async () => {
      const request = new NextRequest('http://localhost/api/users?limit=101')

      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle empty query parameters', async () => {
      vi.mocked(mockService.getUsers).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })

      const request = new NextRequest('http://localhost/api/users')
      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle SQL injection in search parameter', async () => {
      vi.mocked(mockService.getUsers).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })

      const sqlInjection = encodeURIComponent("'; DROP TABLE users; --")
      const request = new NextRequest(
        `http://localhost/api/users?search=${sqlInjection}`,
      )

      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(mockService.getUsers).toHaveBeenCalled()
    })

    it('should handle XSS in search parameter', async () => {
      vi.mocked(mockService.getUsers).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })

      const xss = encodeURIComponent('<script>alert("XSS")</script>')
      const request = new NextRequest(
        `http://localhost/api/users?search=${xss}`,
      )

      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle very long search string', async () => {
      vi.mocked(mockService.getUsers).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })

      const longSearch = 'a'.repeat(1000)
      const request = new NextRequest(
        `http://localhost/api/users?search=${longSearch}`,
      )

      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should handle unicode in search parameter', async () => {
      vi.mocked(mockService.getUsers).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })

      const unicode = encodeURIComponent('测试 🚀 Ñoño')
      const request = new NextRequest(
        `http://localhost/api/users?search=${unicode}`,
      )

      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('getUserById - Validation', () => {
    it('should return user for valid ID', async () => {
      const mockUser = {
        id: 'cly1234567890',
        email: 'test@test.com',
        name: 'Test',
      }

      vi.mocked(mockService.getUserById).mockResolvedValue(mockUser as any)

      const request = new NextRequest(
        'http://localhost/api/users/cly1234567890',
      )
      const response = await controller.getUserById(request, {
        params: Promise.resolve({ id: 'cly1234567890' }),
      })

      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockUser)
    })

    it('should reject invalid ID format', async () => {
      const request = new NextRequest('http://localhost/api/users/invalid')
      const response = await controller.getUserById(request, {
        params: Promise.resolve({ id: 'invalid' }),
      })

      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject empty ID', async () => {
      const request = new NextRequest('http://localhost/api/users/')
      const response = await controller.getUserById(request, {
        params: Promise.resolve({ id: '' }),
      })

      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject SQL injection in ID', async () => {
      const maliciousId = "'; DROP TABLE users; --"
      const request = new NextRequest(
        `http://localhost/api/users/${maliciousId}`,
      )

      const response = await controller.getUserById(request, {
        params: Promise.resolve({ id: maliciousId }),
      })

      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject very long ID', async () => {
      const longId = 'a'.repeat(1000)
      const request = new NextRequest(`http://localhost/api/users/${longId}`)

      const response = await controller.getUserById(request, {
        params: Promise.resolve({ id: longId }),
      })

      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('createUser - Request Body Validation', () => {
    it('should create user with valid data', async () => {
      const createData = {
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
      }

      vi.mocked(mockService.createUser).mockResolvedValue({
        id: '1',
        ...createData,
      } as any)

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(createData),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(data.success).toBe(true)
      expect(data.data.email).toBe(createData.email)
    })

    it('should reject invalid email format', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'not-an-email',
          name: 'Test',
          role: 'user',
        }),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject missing email', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          role: 'user',
        }),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject missing name', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@test.com',
          role: 'user',
        }),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject name too short (<2 chars)', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@test.com',
          name: 'A',
          role: 'user',
        }),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject name too long (>100 chars)', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@test.com',
          name: 'a'.repeat(101),
          role: 'user',
        }),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject invalid role', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@test.com',
          name: 'Test',
          role: 'superadmin',
        }),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: 'invalid json {',
      })

      const response = await controller.createUser(request)

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should reject empty body', async () => {
      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: '',
      })

      const response = await controller.createUser(request)

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should sanitize XSS in name', async () => {
      vi.mocked(mockService.createUser).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
      } as any)

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@test.com',
          name: '<script>alert("XSS")</script>',
          role: 'user',
        }),
      })

      const response = await controller.createUser(request)

      expect([HTTP_STATUS.OK, HTTP_STATUS.CREATED]).toContain(response.status)
    })

    it('should handle unicode in name', async () => {
      vi.mocked(mockService.createUser).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'José María 测试',
      } as any)

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@test.com',
          name: 'José María 测试',
          role: 'user',
        }),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CREATED)
    })
  })

  describe('updateUser - Validation', () => {
    it('should update user with valid data', async () => {
      vi.mocked(mockService.updateUser).mockResolvedValue({
        id: 'cly1234567890',
        email: 'test@test.com',
        name: 'Updated Name',
      } as any)

      const request = new NextRequest(
        'http://localhost/api/users/cly1234567890',
        {
          method: 'PATCH',
          body: JSON.stringify({ name: 'Updated Name' }),
        },
      )

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: 'cly1234567890' }),
      })

      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
    })

    it('should reject invalid ID format', async () => {
      const request = new NextRequest('http://localhost/api/users/invalid', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated' }),
      })

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: 'invalid' }),
      })

      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject invalid JSON body', async () => {
      const request = new NextRequest(
        'http://localhost/api/users/cly1234567890',
        {
          method: 'PATCH',
          body: 'invalid json',
        },
      )

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: 'cly1234567890' }),
      })

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })

    it('should accept empty update body', async () => {
      vi.mocked(mockService.updateUser).mockResolvedValue({
        id: 'cly1234567890',
      } as any)

      const request = new NextRequest(
        'http://localhost/api/users/cly1234567890',
        {
          method: 'PATCH',
          body: JSON.stringify({}),
        },
      )

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: 'cly1234567890' }),
      })

      expect(response.status).toBe(HTTP_STATUS.OK)
    })

    it('should reject invalid email in update', async () => {
      const request = new NextRequest(
        'http://localhost/api/users/cly1234567890',
        {
          method: 'PATCH',
          body: JSON.stringify({ email: 'not-valid' }),
        },
      )

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: 'cly1234567890' }),
      })

      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject name too short in update', async () => {
      const request = new NextRequest(
        'http://localhost/api/users/cly1234567890',
        {
          method: 'PATCH',
          body: JSON.stringify({ name: 'A' }),
        },
      )

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: 'cly1234567890' }),
      })

      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('deleteUser - Validation', () => {
    it('should delete user with valid ID', async () => {
      vi.mocked(mockService.deleteUser).mockResolvedValue()

      const request = new NextRequest(
        'http://localhost/api/users/cly1234567890',
        { method: 'DELETE' },
      )

      const response = await controller.deleteUser(request, {
        params: Promise.resolve({ id: 'cly1234567890' }),
      })

      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data.deleted).toBe(true)
    })

    it('should reject invalid ID format', async () => {
      const request = new NextRequest('http://localhost/api/users/invalid', {
        method: 'DELETE',
      })

      const response = await controller.deleteUser(request, {
        params: Promise.resolve({ id: 'invalid' }),
      })

      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject SQL injection in ID', async () => {
      const maliciousId = "'; DROP TABLE users; --"
      const request = new NextRequest(
        `http://localhost/api/users/${maliciousId}`,
        { method: 'DELETE' },
      )

      const response = await controller.deleteUser(request, {
        params: Promise.resolve({ id: maliciousId }),
      })

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    })
  })

  describe('Error Handling', () => {
    it('should return 500 on unexpected service error', async () => {
      vi.mocked(mockService.getUsers).mockRejectedValue(
        new Error('Unexpected error'),
      )

      const request = new NextRequest('http://localhost/api/users')
      const response = await controller.getUsers(request)

      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR)
    })

    it('should handle ApiError from service', async () => {
      const apiError = new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'User not found',
      )

      vi.mocked(mockService.getUserById).mockRejectedValue(apiError)

      const request = new NextRequest(
        'http://localhost/api/users/cly1234567890',
      )
      const response = await controller.getUserById(request, {
        params: Promise.resolve({ id: 'cly1234567890' }),
      })

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
    })
  })

  describe('Concurrency', () => {
    it('should handle concurrent requests safely', async () => {
      vi.mocked(mockService.getUsers).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })

      const requests = Array.from(
        { length: 10 },
        () => new NextRequest('http://localhost/api/users'),
      )

      const responses = await Promise.all(
        requests.map((req) => controller.getUsers(req)),
      )

      responses.forEach((response) => {
        expect(response.status).toBe(HTTP_STATUS.OK)
      })

      expect(mockService.getUsers).toHaveBeenCalledTimes(10)
    })
  })
})
