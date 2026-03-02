import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { UserRepository } from '../user.repository'
import { UserService } from '../user.service'

describe('UserService', () => {
  let service: UserService
  let mockRepository: UserRepository

  beforeEach(() => {
    mockRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    } as any

    service = new UserService(mockRepository)
    vi.clearAllMocks()
  })

  describe('getUsers', () => {
    it('should return paginated users with default pagination', async () => {
      const mockUsers = [
        {
          id: 'user1',
          email: 'user1@test.com',
          name: 'User One',
          role: 'user',
          password: null,
          emailVerified: null,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'user2',
          email: 'user2@test.com',
          name: 'User Two',
          role: 'admin',
          password: null,
          emailVerified: null,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.findAll).mockResolvedValue(mockUsers)
      vi.mocked(mockRepository.count).mockResolvedValue(25)

      const result = await service.getUsers()

      expect(result).toEqual({
        items: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      })
      expect(mockRepository.findAll).toHaveBeenCalledWith(undefined, {
        page: 1,
        limit: 10,
      })
      expect(mockRepository.count).toHaveBeenCalledWith(undefined)
    })

    it('should return paginated users with custom pagination', async () => {
      const mockUsers = [
        {
          id: 'user3',
          email: 'user3@test.com',
          name: 'User Three',
          role: 'user',
          password: null,
          emailVerified: null,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.findAll).mockResolvedValue(mockUsers)
      vi.mocked(mockRepository.count).mockResolvedValue(50)

      const result = await service.getUsers(undefined, { page: 2, limit: 20 })

      expect(result).toEqual({
        items: mockUsers,
        pagination: {
          page: 2,
          limit: 20,
          total: 50,
          totalPages: 3,
        },
      })
      expect(mockRepository.findAll).toHaveBeenCalledWith(undefined, {
        page: 2,
        limit: 20,
      })
      expect(mockRepository.count).toHaveBeenCalledWith(undefined)
    })

    it('should return paginated users with filters', async () => {
      const mockAdmins = [
        {
          id: 'admin1',
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'admin',
          password: null,
          emailVerified: null,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.findAll).mockResolvedValue(mockAdmins)
      vi.mocked(mockRepository.count).mockResolvedValue(5)

      const filters = { role: 'admin' as const, search: 'admin' }
      const result = await service.getUsers(filters, { page: 1, limit: 10 })

      expect(result).toEqual({
        items: mockAdmins,
        pagination: {
          page: 1,
          limit: 10,
          total: 5,
          totalPages: 1,
        },
      })
      expect(mockRepository.findAll).toHaveBeenCalledWith(filters, {
        page: 1,
        limit: 10,
      })
      expect(mockRepository.count).toHaveBeenCalledWith(filters)
    })

    it('should calculate totalPages correctly when total is divisible by limit', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(100)

      const result = await service.getUsers(undefined, { page: 1, limit: 10 })

      expect(result.pagination.totalPages).toBe(10)
    })

    it('should calculate totalPages correctly when total is not divisible by limit', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(95)

      const result = await service.getUsers(undefined, { page: 1, limit: 10 })

      expect(result.pagination.totalPages).toBe(10)
    })

    it('should handle empty results', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      const result = await service.getUsers()

      expect(result).toEqual({
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      })
    })
  })

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
        password: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(mockUser)

      const result = await service.getUserById('user123')

      expect(result).toEqual(mockUser)
      expect(mockRepository.findById).toHaveBeenCalledWith('user123')
    })

    it('should throw NOT_FOUND error if user does not exist', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.getUserById('nonexistent')).rejects.toThrow(ApiError)
      await expect(service.getUserById('nonexistent')).rejects.toThrow(
        'User with id nonexistent not found',
      )

      try {
        await service.getUserById('nonexistent')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('NOT_FOUND')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }
    })
  })

  describe('createUser', () => {
    it('should create new user', async () => {
      const createData = {
        email: 'newuser@test.com',
        name: 'New User',
        role: 'user' as const,
      }

      const mockCreated = {
        id: 'newuser123',
        ...createData,
        password: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue(mockCreated)

      const result = await service.createUser(createData)

      expect(result).toEqual(mockCreated)
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(
        'newuser@test.com',
      )
      expect(mockRepository.create).toHaveBeenCalledWith(createData)
    })

    it('should throw CONFLICT error if email already exists', async () => {
      const createData = {
        email: 'existing@test.com',
        name: 'New User',
        role: 'user' as const,
      }

      const existingUser = {
        id: 'existing123',
        email: 'existing@test.com',
        name: 'Existing User',
        role: 'user',
        password: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findByEmail).mockResolvedValue(existingUser)

      await expect(service.createUser(createData)).rejects.toThrow(ApiError)
      await expect(service.createUser(createData)).rejects.toThrow(
        'User with this email already exists',
      )

      try {
        await service.createUser(createData)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('CONFLICT')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.CONFLICT)
      }

      expect(mockRepository.create).not.toHaveBeenCalled()
    })
  })

  describe('updateUser', () => {
    it('should update existing user', async () => {
      const updateData = { name: 'Updated Name' }
      const existingUser = {
        id: 'user123',
        email: 'test@test.com',
        name: 'Old Name',
        role: 'user',
        password: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockUpdated = { ...existingUser, name: 'Updated Name' }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser)
      vi.mocked(mockRepository.update).mockResolvedValue(mockUpdated)

      const result = await service.updateUser('user123', updateData)

      expect(result).toEqual(mockUpdated)
      expect(mockRepository.findById).toHaveBeenCalledWith('user123')
      expect(mockRepository.update).toHaveBeenCalledWith('user123', updateData)
    })

    it('should throw NOT_FOUND if user does not exist', async () => {
      const updateData = { name: 'Updated Name' }

      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(
        service.updateUser('nonexistent', updateData),
      ).rejects.toThrow(ApiError)
      await expect(
        service.updateUser('nonexistent', updateData),
      ).rejects.toThrow('User with id nonexistent not found')

      try {
        await service.updateUser('nonexistent', updateData)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('NOT_FOUND')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }

      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('should update user with same email', async () => {
      const updateData = { email: 'test@test.com', name: 'Updated Name' }
      const existingUser = {
        id: 'user123',
        email: 'test@test.com',
        name: 'Old Name',
        role: 'user',
        password: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockUpdated = { ...existingUser, name: 'Updated Name' }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser)
      vi.mocked(mockRepository.update).mockResolvedValue(mockUpdated)

      const result = await service.updateUser('user123', updateData)

      expect(result).toEqual(mockUpdated)
      expect(mockRepository.findByEmail).not.toHaveBeenCalled()
    })

    it('should throw CONFLICT if new email is already taken', async () => {
      const updateData = { email: 'taken@test.com' }
      const existingUser = {
        id: 'user123',
        email: 'old@test.com',
        name: 'User',
        role: 'user',
        password: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const otherUser = {
        id: 'other123',
        email: 'taken@test.com',
        name: 'Other User',
        role: 'user',
        password: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser)
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(otherUser)

      await expect(service.updateUser('user123', updateData)).rejects.toThrow(
        ApiError,
      )
      await expect(service.updateUser('user123', updateData)).rejects.toThrow(
        'Email already taken',
      )

      try {
        await service.updateUser('user123', updateData)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('CONFLICT')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.CONFLICT)
      }

      expect(mockRepository.update).not.toHaveBeenCalled()
    })

    it('should throw INTERNAL_ERROR if update fails', async () => {
      const updateData = { name: 'Updated Name' }
      const existingUser = {
        id: 'user123',
        email: 'test@test.com',
        name: 'Old Name',
        role: 'user',
        password: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser)
      vi.mocked(mockRepository.update).mockResolvedValue(null)

      await expect(service.updateUser('user123', updateData)).rejects.toThrow(
        ApiError,
      )
      await expect(service.updateUser('user123', updateData)).rejects.toThrow(
        'Failed to update user',
      )

      try {
        await service.updateUser('user123', updateData)
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('INTERNAL_ERROR')
        expect((error as ApiError).statusCode).toBe(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        )
      }
    })
  })

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const existingUser = {
        id: 'user123',
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
        password: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser)
      vi.mocked(mockRepository.delete).mockResolvedValue(true)

      await service.deleteUser('user123')

      expect(mockRepository.findById).toHaveBeenCalledWith('user123')
      expect(mockRepository.delete).toHaveBeenCalledWith('user123')
    })

    it('should throw NOT_FOUND if user does not exist', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.deleteUser('nonexistent')).rejects.toThrow(ApiError)
      await expect(service.deleteUser('nonexistent')).rejects.toThrow(
        'User with id nonexistent not found',
      )

      try {
        await service.deleteUser('nonexistent')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('NOT_FOUND')
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }

      expect(mockRepository.delete).not.toHaveBeenCalled()
    })

    it('should throw INTERNAL_ERROR if delete fails', async () => {
      const existingUser = {
        id: 'user123',
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
        password: null,
        emailVerified: null,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser)
      vi.mocked(mockRepository.delete).mockResolvedValue(false)

      await expect(service.deleteUser('user123')).rejects.toThrow(ApiError)
      await expect(service.deleteUser('user123')).rejects.toThrow(
        'Failed to delete user',
      )

      try {
        await service.deleteUser('user123')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe('INTERNAL_ERROR')
        expect((error as ApiError).statusCode).toBe(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        )
      }
    })
  })
})
