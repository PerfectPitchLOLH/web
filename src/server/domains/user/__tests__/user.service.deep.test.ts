import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { UserRepository } from '../user.repository'
import { UserService } from '../user.service'

describe('UserService - Deep Tests', () => {
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

  describe('getUsers - Validation Edge Cases', () => {
    it('should handle negative page number gracefully', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      const result = await service.getUsers({}, { page: -1, limit: 10 })

      expect(result).toBeDefined()
      expect(result.pagination.page).toBe(-1)
    })

    it('should handle zero limit', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      const result = await service.getUsers({}, { page: 1, limit: 0 })

      expect(result.items).toEqual([])
      expect(result.pagination.limit).toBe(0)
    })

    it('should calculate totalPages with zero limit (division by zero)', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(10)

      const result = await service.getUsers({}, { page: 1, limit: 0 })

      expect(result.pagination.totalPages).toBe(Infinity)
    })

    it('should handle excessively large limit', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(50)

      const result = await service.getUsers({}, { page: 1, limit: 1000000 })

      expect(result.pagination.totalPages).toBe(1)
    })

    it('should handle undefined pagination params (use defaults)', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(100)

      const result = await service.getUsers({})

      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(10)
      expect(result.pagination.totalPages).toBe(10)
    })

    it('should handle search with SQL injection attempt', async () => {
      const sqlInjection = "'; DROP TABLE users; --"
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      const result = await service.getUsers({ search: sqlInjection })

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: sqlInjection }),
        expect.anything(),
      )
    })

    it('should handle search with XSS attempt', async () => {
      const xssAttempt = '<script>alert("XSS")</script>'
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      const result = await service.getUsers({ search: xssAttempt })

      expect(mockRepository.findAll).toHaveBeenCalled()
    })

    it('should filter by admin role', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([
        { id: '1', role: 'admin' } as any,
      ])
      vi.mocked(mockRepository.count).mockResolvedValue(1)

      const result = await service.getUsers({ role: 'admin' })

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin' }),
        expect.anything(),
      )
    })

    it('should combine multiple filters', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      await service.getUsers(
        { role: 'user', search: 'test' },
        { page: 2, limit: 20 },
      )

      expect(mockRepository.findAll).toHaveBeenCalledWith(
        { role: 'user', search: 'test' },
        { page: 2, limit: 20 },
      )
    })
  })

  describe('getUserById - Edge Cases', () => {
    it('should return user for valid ID', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test',
      }
      vi.mocked(mockRepository.findById).mockResolvedValue(mockUser as any)

      const result = await service.getUserById('1')

      expect(result).toEqual(mockUser)
    })

    it('should throw NOT_FOUND for non-existent ID', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.getUserById('nonexistent')).rejects.toThrow(ApiError)
      await expect(service.getUserById('nonexistent')).rejects.toThrow(
        'User with id nonexistent not found',
      )

      try {
        await service.getUserById('nonexistent')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
        expect((error as ApiError).code).toBe('NOT_FOUND')
      }
    })

    it('should handle empty string ID', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.getUserById('')).rejects.toThrow(ApiError)
    })

    it('should handle very long ID', async () => {
      const longId = 'a'.repeat(1000)
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.getUserById(longId)).rejects.toThrow(ApiError)
    })

    it('should handle special characters in ID', async () => {
      const specialId = "'; DROP TABLE users; --"
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.getUserById(specialId)).rejects.toThrow(ApiError)
    })
  })

  describe('createUser - Validation Edge Cases', () => {
    it('should create user with valid data', async () => {
      const createData = {
        email: 'test@test.com',
        name: 'Test User',
        role: 'user' as const,
        termsAcceptedAt: null,
      }

      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: '1',
        ...createData,
      } as any)

      const result = await service.createUser(createData)

      expect(result.email).toBe(createData.email)
      expect(mockRepository.findByEmail).toHaveBeenCalledWith(createData.email)
    })

    it('should throw CONFLICT when email already exists', async () => {
      const existingUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Existing',
      }

      vi.mocked(mockRepository.findByEmail).mockResolvedValue(
        existingUser as any,
      )

      await expect(
        service.createUser({
          email: 'test@test.com',
          name: 'New User',
          role: 'user',
          termsAcceptedAt: null,
        }),
      ).rejects.toThrow(ApiError)

      try {
        await service.createUser({
          email: 'test@test.com',
          name: 'New User',
          role: 'user',
          termsAcceptedAt: null,
        })
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.CONFLICT)
        expect((error as ApiError).code).toBe('CONFLICT')
        expect((error as ApiError).message).toContain('already exists')
      }
    })

    it('should handle email with uppercase letters', async () => {
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: '1',
        email: 'TEST@TEST.COM',
      } as any)

      const result = await service.createUser({
        email: 'TEST@TEST.COM',
        name: 'Test',
        role: 'user',
        termsAcceptedAt: null,
      })

      expect(mockRepository.findByEmail).toHaveBeenCalledWith('TEST@TEST.COM')
    })

    it('should handle email with plus addressing', async () => {
      const emailWithPlus = 'test+alias@example.com'
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: '1',
        email: emailWithPlus,
      } as any)

      const result = await service.createUser({
        email: emailWithPlus,
        name: 'Test',
        role: 'user',
        termsAcceptedAt: null,
      })

      expect(result.email).toBe(emailWithPlus)
    })

    it('should handle very long name', async () => {
      const longName = 'a'.repeat(500)
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: longName,
      } as any)

      const result = await service.createUser({
        email: 'test@test.com',
        name: longName,
        role: 'user',
        termsAcceptedAt: null,
      })

      expect(result.name).toBe(longName)
    })

    it('should handle name with unicode characters', async () => {
      const unicodeName = 'José María Ñoño 测试 🚀'
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: unicodeName,
      } as any)

      const result = await service.createUser({
        email: 'test@test.com',
        name: unicodeName,
        role: 'user',
        termsAcceptedAt: null,
      })

      expect(result.name).toBe(unicodeName)
    })

    it('should handle name with HTML/XSS attempt', async () => {
      const xssName = '<script>alert("XSS")</script>'
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.create).mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: xssName,
      } as any)

      const result = await service.createUser({
        email: 'test@test.com',
        name: xssName,
        role: 'user',
        termsAcceptedAt: null,
      })

      expect(mockRepository.create).toHaveBeenCalled()
    })
  })

  describe('updateUser - Edge Cases', () => {
    it('should update user with valid data', async () => {
      const existingUser = {
        id: '1',
        email: 'old@test.com',
        name: 'Old Name',
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser as any)
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...existingUser,
        name: 'New Name',
      } as any)

      const result = await service.updateUser('1', { name: 'New Name' })

      expect(result.name).toBe('New Name')
    })

    it('should throw NOT_FOUND when user does not exist', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(
        service.updateUser('nonexistent', { name: 'New Name' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.updateUser('nonexistent', { name: 'New Name' })
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }
    })

    it('should allow updating email to new unique email', async () => {
      const existingUser = {
        id: '1',
        email: 'old@test.com',
        name: 'Test',
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser as any)
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(null)
      vi.mocked(mockRepository.update).mockResolvedValue({
        ...existingUser,
        email: 'new@test.com',
      } as any)

      const result = await service.updateUser('1', { email: 'new@test.com' })

      expect(result.email).toBe('new@test.com')
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('new@test.com')
    })

    it('should throw CONFLICT when new email is already taken', async () => {
      const existingUser = {
        id: '1',
        email: 'old@test.com',
        name: 'Test',
      }

      const otherUser = {
        id: '2',
        email: 'taken@test.com',
        name: 'Other',
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser as any)
      vi.mocked(mockRepository.findByEmail).mockResolvedValue(otherUser as any)

      await expect(
        service.updateUser('1', { email: 'taken@test.com' }),
      ).rejects.toThrow(ApiError)

      try {
        await service.updateUser('1', { email: 'taken@test.com' })
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.CONFLICT)
        expect((error as ApiError).message).toContain('already taken')
      }
    })

    it('should allow updating email to same email (no change)', async () => {
      const existingUser = {
        id: '1',
        email: 'same@test.com',
        name: 'Test',
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser as any)
      vi.mocked(mockRepository.update).mockResolvedValue(existingUser as any)

      const result = await service.updateUser('1', { email: 'same@test.com' })

      expect(result.email).toBe('same@test.com')
      expect(mockRepository.findByEmail).not.toHaveBeenCalled()
    })

    it('should throw INTERNAL_ERROR when update returns null', async () => {
      const existingUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test',
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser as any)
      vi.mocked(mockRepository.update).mockResolvedValue(null)

      await expect(service.updateUser('1', { name: 'New' })).rejects.toThrow(
        ApiError,
      )

      try {
        await service.updateUser('1', { name: 'New' })
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        )
        expect((error as ApiError).message).toContain('Failed to update')
      }
    })

    it('should handle empty update data', async () => {
      const existingUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test',
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser as any)
      vi.mocked(mockRepository.update).mockResolvedValue(existingUser as any)

      const result = await service.updateUser('1', {})

      expect(result).toEqual(existingUser)
    })

    it('should handle concurrent updates', async () => {
      const existingUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Original',
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser as any)
      vi.mocked(mockRepository.update)
        .mockResolvedValueOnce({ ...existingUser, name: 'Update1' } as any)
        .mockResolvedValueOnce({ ...existingUser, name: 'Update2' } as any)

      const [result1, result2] = await Promise.all([
        service.updateUser('1', { name: 'Update1' }),
        service.updateUser('1', { name: 'Update2' }),
      ])

      expect(mockRepository.update).toHaveBeenCalledTimes(2)
    })
  })

  describe('deleteUser - Edge Cases', () => {
    it('should delete existing user', async () => {
      const existingUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test',
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser as any)
      vi.mocked(mockRepository.delete).mockResolvedValue(true)

      await service.deleteUser('1')

      expect(mockRepository.delete).toHaveBeenCalledWith('1')
    })

    it('should throw NOT_FOUND when user does not exist', async () => {
      vi.mocked(mockRepository.findById).mockResolvedValue(null)

      await expect(service.deleteUser('nonexistent')).rejects.toThrow(ApiError)

      try {
        await service.deleteUser('nonexistent')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }
    })

    it('should throw INTERNAL_ERROR when delete fails', async () => {
      const existingUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test',
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(existingUser as any)
      vi.mocked(mockRepository.delete).mockResolvedValue(false)

      await expect(service.deleteUser('1')).rejects.toThrow(ApiError)

      try {
        await service.deleteUser('1')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        )
        expect((error as ApiError).message).toContain('Failed to delete')
      }
    })

    it('should handle deletion of user with related data', async () => {
      const userWithRelations = {
        id: '1',
        email: 'test@test.com',
        name: 'Test',
      }

      vi.mocked(mockRepository.findById).mockResolvedValue(
        userWithRelations as any,
      )
      vi.mocked(mockRepository.delete).mockResolvedValue(true)

      await service.deleteUser('1')

      expect(mockRepository.delete).toHaveBeenCalledWith('1')
    })

    it('should be idempotent (multiple delete attempts)', async () => {
      vi.mocked(mockRepository.findById)
        .mockResolvedValueOnce({ id: '1' } as any)
        .mockResolvedValueOnce(null)

      vi.mocked(mockRepository.delete).mockResolvedValue(true)

      await service.deleteUser('1')

      await expect(service.deleteUser('1')).rejects.toThrow(ApiError)
    })
  })

  describe('Race Conditions', () => {
    it('should handle concurrent user creation with same email', async () => {
      vi.mocked(mockRepository.findByEmail)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      vi.mocked(mockRepository.create)
        .mockResolvedValueOnce({
          id: '1',
          email: 'test@test.com',
        } as any)
        .mockRejectedValueOnce(new Error('Unique constraint violation'))

      const promise1 = service.createUser({
        email: 'test@test.com',
        name: 'User1',
        role: 'user',
        termsAcceptedAt: null,
      })

      const promise2 = service.createUser({
        email: 'test@test.com',
        name: 'User2',
        role: 'user',
        termsAcceptedAt: null,
      })

      const results = await Promise.allSettled([promise1, promise2])

      const successful = results.filter((r) => r.status === 'fulfilled')
      const failed = results.filter((r) => r.status === 'rejected')

      expect(successful.length).toBeGreaterThanOrEqual(1)
      expect(failed.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Pagination Edge Cases', () => {
    it('should handle empty result set', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(0)

      const result = await service.getUsers()

      expect(result.items).toEqual([])
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })

    it('should handle single item result', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([{ id: '1' } as any])
      vi.mocked(mockRepository.count).mockResolvedValue(1)

      const result = await service.getUsers()

      expect(result.items.length).toBe(1)
      expect(result.pagination.totalPages).toBe(1)
    })

    it('should handle exact page boundary', async () => {
      const items = Array(10).fill({ id: '1' } as any)
      vi.mocked(mockRepository.findAll).mockResolvedValue(items)
      vi.mocked(mockRepository.count).mockResolvedValue(100)

      const result = await service.getUsers({}, { page: 1, limit: 10 })

      expect(result.items.length).toBe(10)
      expect(result.pagination.totalPages).toBe(10)
    })

    it('should handle page beyond total pages', async () => {
      vi.mocked(mockRepository.findAll).mockResolvedValue([])
      vi.mocked(mockRepository.count).mockResolvedValue(50)

      const result = await service.getUsers({}, { page: 100, limit: 10 })

      expect(result.items).toEqual([])
      expect(result.pagination.page).toBe(100)
      expect(result.pagination.totalPages).toBe(5)
    })
  })
})
