import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { UserController } from '../user.controller'
import { UserService } from '../user.service'

vi.mock('@/server/shared/middleware', () => ({
  validateApiAuth: vi.fn().mockResolvedValue({
    ok: true,
    session: {
      user: { id: 'auth-user-id', email: 'auth@test.com', role: 'user' },
    },
    response: null,
  }),
  requireAdminAuth: vi.fn().mockResolvedValue({
    user: { id: 'admin-user-id', email: 'admin@test.com', role: 'admin' },
  }),
}))

const createMockUser = (overrides: any = {}) => ({
  id: '1',
  email: 'test@test.com',
  name: 'Test User',
  password: null,
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

describe('UserController', () => {
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
  })

  describe('getUsers', () => {
    it('should return users list with default pagination', async () => {
      const mockData = {
        items: [
          createMockUser({
            id: 'user1',
            email: 'user1@test.com',
            name: 'User One',
            role: 'user',
          }),
          createMockUser({
            id: 'user2',
            email: 'user2@test.com',
            name: 'User Two',
            role: 'admin',
          }),
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      }

      vi.mocked(mockService.getUsers).mockResolvedValue(mockData)

      const request = new NextRequest('http://localhost/api/users')
      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data.items).toHaveLength(2)
      expect(data.data.items[0]).toMatchObject({
        id: 'user1',
        email: 'user1@test.com',
        name: 'User One',
        role: 'user',
      })
      expect(data.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      })
      expect(mockService.getUsers).toHaveBeenCalledWith(
        { role: undefined, search: undefined },
        { page: 1, limit: 10 },
      )
    })

    it('should return users with query parameters', async () => {
      const mockData = {
        items: [
          createMockUser({
            id: 'admin1',
            email: 'admin@test.com',
            name: 'Admin User',
            role: 'admin',
          }),
        ],
        pagination: {
          page: 2,
          limit: 5,
          total: 10,
          totalPages: 2,
        },
      }

      vi.mocked(mockService.getUsers).mockResolvedValue(mockData)

      const request = new NextRequest(
        'http://localhost/api/users?role=admin&search=admin&page=2&limit=5',
      )
      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data.items[0]).toMatchObject({
        id: 'admin1',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
      })
      expect(data.data.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 10,
        totalPages: 2,
      })
      expect(mockService.getUsers).toHaveBeenCalledWith(
        { role: 'admin', search: 'admin' },
        { page: 2, limit: 5 },
      )
    })

    it('should return validation error for invalid query parameters', async () => {
      const request = new NextRequest('http://localhost/api/users?page=invalid')
      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid query parameters')
      expect(mockService.getUsers).not.toHaveBeenCalled()
    })

    it('should return validation error for invalid role', async () => {
      const request = new NextRequest('http://localhost/api/users?role=invalid')
      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return validation error for limit exceeding max', async () => {
      const request = new NextRequest('http://localhost/api/users?limit=200')
      const response = await controller.getUsers(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = createMockUser({
        id: 'cm9abc123xyz',
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
      })

      vi.mocked(mockService.getUserById).mockResolvedValue(mockUser)

      const request = new NextRequest('http://localhost/api/users/cm9abc123xyz')
      const response = await controller.getUserById(request, {
        params: Promise.resolve({ id: 'cm9abc123xyz' }),
      })
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        id: 'cm9abc123xyz',
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
      })
      expect(mockService.getUserById).toHaveBeenCalledWith('cm9abc123xyz')
    })

    it('should return validation error for invalid user ID', async () => {
      const request = new NextRequest('http://localhost/api/users/invalid-id')
      const response = await controller.getUserById(request, {
        params: Promise.resolve({ id: 'invalid-id' }),
      })
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid user ID')
      expect(mockService.getUserById).not.toHaveBeenCalled()
    })

    it('should return NOT_FOUND error if user does not exist', async () => {
      vi.mocked(mockService.getUserById).mockRejectedValue(
        new ApiError(
          'NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'User with id cm9abc123xyz not found',
        ),
      )

      const request = new NextRequest('http://localhost/api/users/cm9abc123xyz')
      const response = await controller.getUserById(request, {
        params: Promise.resolve({ id: 'cm9abc123xyz' }),
      })
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
    })
  })

  describe('createUser', () => {
    it('should create new user', async () => {
      const createData = {
        email: 'newuser@test.com',
        name: 'New User',
        role: 'user' as const,
      }

      const mockCreated = createMockUser({
        id: 'cm9newuser123',
        ...createData,
      })

      vi.mocked(mockService.createUser).mockResolvedValue(mockCreated)

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(createData),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CREATED)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        id: 'cm9newuser123',
        email: 'newuser@test.com',
        name: 'New User',
        role: 'user',
      })
      expect(mockService.createUser).toHaveBeenCalledWith(createData)
    })

    it('should return validation error for invalid email', async () => {
      const invalidData = {
        email: 'invalid-email',
        name: 'New User',
      }

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid user data')
      expect(mockService.createUser).not.toHaveBeenCalled()
    })

    it('should return validation error for name too short', async () => {
      const invalidData = {
        email: 'test@test.com',
        name: 'x',
      }

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return validation error for missing required fields', async () => {
      const invalidData = {
        name: 'New User',
      }

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return CONFLICT error if email already exists', async () => {
      const createData = {
        email: 'existing@test.com',
        name: 'New User',
      }

      vi.mocked(mockService.createUser).mockRejectedValue(
        new ApiError(
          'CONFLICT',
          HTTP_STATUS.CONFLICT,
          'User with this email already exists',
        ),
      )

      const request = new NextRequest('http://localhost/api/users', {
        method: 'POST',
        body: JSON.stringify(createData),
      })

      const response = await controller.createUser(request)
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CONFLICT)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('CONFLICT')
    })
  })

  describe('updateUser', () => {
    it('should update user', async () => {
      const updateData = { name: 'Updated Name' }
      const mockUpdated = createMockUser({
        id: 'cm9user123xyz',
        email: 'test@test.com',
        name: 'Updated Name',
        role: 'user',
      })

      vi.mocked(mockService.updateUser).mockResolvedValue(mockUpdated)

      const request = new NextRequest(
        'http://localhost/api/users/cm9user123xyz',
        {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        },
      )

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: 'cm9user123xyz' }),
      })
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data).toMatchObject({
        id: 'cm9user123xyz',
        email: 'test@test.com',
        name: 'Updated Name',
        role: 'user',
      })
      expect(mockService.updateUser).toHaveBeenCalledWith(
        'cm9user123xyz',
        updateData,
      )
    })

    it('should return validation error for invalid user ID', async () => {
      const updateData = { name: 'Updated Name' }

      const request = new NextRequest('http://localhost/api/users/invalid-id', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      })

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: 'invalid-id' }),
      })
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid request data')
      expect(mockService.updateUser).not.toHaveBeenCalled()
    })

    it('should return validation error for invalid update data', async () => {
      const invalidData = { email: 'invalid-email' }

      const request = new NextRequest(
        'http://localhost/api/users/cm9user123xyz',
        {
          method: 'PATCH',
          body: JSON.stringify(invalidData),
        },
      )

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: 'cm9user123xyz' }),
      })
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return NOT_FOUND error if user does not exist', async () => {
      const updateData = { name: 'Updated Name' }

      vi.mocked(mockService.updateUser).mockRejectedValue(
        new ApiError(
          'NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'User with id cm9user123xyz not found',
        ),
      )

      const request = new NextRequest(
        'http://localhost/api/users/cm9user123xyz',
        {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        },
      )

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: 'cm9user123xyz' }),
      })
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should return CONFLICT error if email is already taken', async () => {
      const updateData = { email: 'taken@test.com' }

      vi.mocked(mockService.updateUser).mockRejectedValue(
        new ApiError('CONFLICT', HTTP_STATUS.CONFLICT, 'Email already taken'),
      )

      const request = new NextRequest(
        'http://localhost/api/users/cm9user123xyz',
        {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        },
      )

      const response = await controller.updateUser(request, {
        params: Promise.resolve({ id: 'cm9user123xyz' }),
      })
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.CONFLICT)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('CONFLICT')
    })
  })

  describe('deleteUser', () => {
    it('should delete user', async () => {
      vi.mocked(mockService.deleteUser).mockResolvedValue()

      const request = new NextRequest(
        'http://localhost/api/users/cm9user123xyz',
        {
          method: 'DELETE',
        },
      )

      const response = await controller.deleteUser(request, {
        params: Promise.resolve({ id: 'cm9user123xyz' }),
      })
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.OK)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({ deleted: true })
      expect(mockService.deleteUser).toHaveBeenCalledWith('cm9user123xyz')
    })

    it('should return validation error for invalid user ID', async () => {
      const request = new NextRequest('http://localhost/api/users/invalid-id', {
        method: 'DELETE',
      })

      const response = await controller.deleteUser(request, {
        params: Promise.resolve({ id: 'invalid-id' }),
      })
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid user ID')
      expect(mockService.deleteUser).not.toHaveBeenCalled()
    })

    it('should return NOT_FOUND error if user does not exist', async () => {
      vi.mocked(mockService.deleteUser).mockRejectedValue(
        new ApiError(
          'NOT_FOUND',
          HTTP_STATUS.NOT_FOUND,
          'User with id cm9user123xyz not found',
        ),
      )

      const request = new NextRequest(
        'http://localhost/api/users/cm9user123xyz',
        {
          method: 'DELETE',
        },
      )

      const response = await controller.deleteUser(request, {
        params: Promise.resolve({ id: 'cm9user123xyz' }),
      })
      const data = await response.json()

      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
    })
  })
})
