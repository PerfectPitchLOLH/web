import { beforeEach, describe, expect, it, vi } from 'vitest'

import { UserRepository } from '../user.repository'
import { createMockUser } from './test-utils'

vi.mock('@/server/lib/database', () => ({
  db: {
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { db } from '@/server/lib/database'

const PUBLIC_USER_OMIT = {
  password: true,
  twoFactorSecret: true,
  twoFactorBackupCodes: true,
}

describe('UserRepository', () => {
  let repository: UserRepository

  beforeEach(() => {
    repository = new UserRepository()
    vi.clearAllMocks()
  })

  describe('findAll', () => {
    it('should return all users without filters', async () => {
      const mockUsers = [
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
      ]

      vi.mocked(db.user.findMany).mockResolvedValue(mockUsers)

      const result = await repository.findAll()

      expect(result).toEqual(mockUsers)
      expect(db.user.findMany).toHaveBeenCalledWith({
        omit: PUBLIC_USER_OMIT,
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should filter users by role', async () => {
      const mockAdmins = [
        createMockUser({
          id: 'admin1',
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'admin',
        }),
      ]

      vi.mocked(db.user.findMany).mockResolvedValue(mockAdmins)

      const result = await repository.findAll({ role: 'admin' })

      expect(result).toEqual(mockAdmins)
      expect(db.user.findMany).toHaveBeenCalledWith({
        omit: PUBLIC_USER_OMIT,
        where: { role: 'admin' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should filter users by search term', async () => {
      const mockUsers = [
        createMockUser({
          id: 'user1',
          email: 'john@test.com',
          name: 'John Doe',
          role: 'user',
        }),
      ]

      vi.mocked(db.user.findMany).mockResolvedValue(mockUsers)

      const result = await repository.findAll({ search: 'john' })

      expect(result).toEqual(mockUsers)
      expect(db.user.findMany).toHaveBeenCalledWith({
        omit: PUBLIC_USER_OMIT,
        where: {
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { name: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should apply pagination', async () => {
      const mockUsers = [
        createMockUser({
          id: 'user3',
          email: 'user3@test.com',
          name: 'User Three',
          role: 'user',
        }),
      ]

      vi.mocked(db.user.findMany).mockResolvedValue(mockUsers)

      const result = await repository.findAll(undefined, { page: 2, limit: 5 })

      expect(result).toEqual(mockUsers)
      expect(db.user.findMany).toHaveBeenCalledWith({
        omit: PUBLIC_USER_OMIT,
        where: {},
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should combine filters and pagination', async () => {
      const mockUsers = [
        createMockUser({
          id: 'admin1',
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'admin',
        }),
      ]

      vi.mocked(db.user.findMany).mockResolvedValue(mockUsers)

      const result = await repository.findAll(
        { role: 'admin', search: 'admin' },
        { page: 1, limit: 20 },
      )

      expect(result).toEqual(mockUsers)
      expect(db.user.findMany).toHaveBeenCalledWith({
        omit: PUBLIC_USER_OMIT,
        where: {
          role: 'admin',
          OR: [
            { email: { contains: 'admin', mode: 'insensitive' } },
            { name: { contains: 'admin', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('findById', () => {
    it('should return user by id', async () => {
      const mockUser = createMockUser({
        id: 'user123',
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
      })

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)

      const result = await repository.findById('user123')

      expect(result).toEqual(mockUser)
      expect(db.user.findUnique).toHaveBeenCalledWith({
        omit: PUBLIC_USER_OMIT,
        where: { id: 'user123' },
      })
    })

    it('should return null if user not found', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const result = await repository.findById('nonexistent')

      expect(result).toBeNull()
      expect(db.user.findUnique).toHaveBeenCalledWith({
        omit: PUBLIC_USER_OMIT,
        where: { id: 'nonexistent' },
      })
    })
  })

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const mockUser = createMockUser({
        id: 'user123',
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
      })

      vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)

      const result = await repository.findByEmail('test@test.com')

      expect(result).toEqual(mockUser)
      expect(db.user.findUnique).toHaveBeenCalledWith({
        omit: PUBLIC_USER_OMIT,
        where: { email: 'test@test.com' },
      })
    })

    it('should return null if email not found', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      const result = await repository.findByEmail('nonexistent@test.com')

      expect(result).toBeNull()
      expect(db.user.findUnique).toHaveBeenCalledWith({
        omit: PUBLIC_USER_OMIT,
        where: { email: 'nonexistent@test.com' },
      })
    })
  })

  describe('create', () => {
    it('should create new user', async () => {
      const createData = {
        email: 'newuser@test.com',
        name: 'New User',
        role: 'user' as const,
        termsAcceptedAt: null,
      }

      const mockCreated = createMockUser({
        id: 'newuser123',
        ...createData,
      })

      vi.mocked(db.user.create).mockResolvedValue(mockCreated)

      const result = await repository.create(createData)

      expect(result).toEqual(mockCreated)
      expect(db.user.create).toHaveBeenCalledWith({
        data: createData,
        omit: PUBLIC_USER_OMIT,
      })
    })

    it('should create user with optional fields', async () => {
      const createData = {
        email: 'newuser@test.com',
        name: 'New User',
        role: 'admin' as const,
        password: 'hashedpassword',
        emailVerified: new Date(),
        image: 'https://example.com/avatar.jpg',
        termsAcceptedAt: null,
      }

      const mockCreated = createMockUser({
        id: 'newuser123',
        ...createData,
      })

      vi.mocked(db.user.create).mockResolvedValue(mockCreated)

      const result = await repository.create(createData)

      expect(result).toEqual(mockCreated)
      expect(db.user.create).toHaveBeenCalledWith({
        data: createData,
        omit: PUBLIC_USER_OMIT,
      })
    })
  })

  describe('update', () => {
    it('should update user', async () => {
      const updateData = { name: 'Updated Name' }
      const mockUpdated = createMockUser({
        id: 'user123',
        email: 'test@test.com',
        name: 'Updated Name',
        role: 'user',
      })

      vi.mocked(db.user.update).mockResolvedValue(mockUpdated)

      const result = await repository.update('user123', updateData)

      expect(result).toEqual(mockUpdated)
      expect(db.user.update).toHaveBeenCalledWith({
        omit: PUBLIC_USER_OMIT,
        where: { id: 'user123' },
        data: updateData,
      })
    })

    it('should update multiple fields', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'newemail@test.com',
        role: 'admin' as const,
      }

      const mockUpdated = createMockUser({
        id: 'user123',
        ...updateData,
      })

      vi.mocked(db.user.update).mockResolvedValue(mockUpdated)

      const result = await repository.update('user123', updateData)

      expect(result).toEqual(mockUpdated)
      expect(db.user.update).toHaveBeenCalledWith({
        omit: PUBLIC_USER_OMIT,
        where: { id: 'user123' },
        data: updateData,
      })
    })
  })

  describe('delete', () => {
    it('should delete user', async () => {
      const mockDeleted = createMockUser({
        id: 'user123',
        email: 'test@test.com',
        name: 'Test User',
        role: 'user',
      })

      vi.mocked(db.user.delete).mockResolvedValue(mockDeleted)

      const result = await repository.delete('user123')

      expect(result).toBe(true)
      expect(db.user.delete).toHaveBeenCalledWith({
        where: { id: 'user123' },
      })
    })
  })

  describe('count', () => {
    it('should count all users without filters', async () => {
      vi.mocked(db.user.count).mockResolvedValue(42)

      const result = await repository.count()

      expect(result).toBe(42)
      expect(db.user.count).toHaveBeenCalledWith({
        where: {},
      })
    })

    it('should count users with role filter', async () => {
      vi.mocked(db.user.count).mockResolvedValue(5)

      const result = await repository.count({ role: 'admin' })

      expect(result).toBe(5)
      expect(db.user.count).toHaveBeenCalledWith({
        where: { role: 'admin' },
      })
    })

    it('should count users with search filter', async () => {
      vi.mocked(db.user.count).mockResolvedValue(3)

      const result = await repository.count({ search: 'john' })

      expect(result).toBe(3)
      expect(db.user.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { name: { contains: 'john', mode: 'insensitive' } },
          ],
        },
      })
    })

    it('should count users with combined filters', async () => {
      vi.mocked(db.user.count).mockResolvedValue(1)

      const result = await repository.count({ role: 'admin', search: 'alice' })

      expect(result).toBe(1)
      expect(db.user.count).toHaveBeenCalledWith({
        where: {
          role: 'admin',
          OR: [
            { email: { contains: 'alice', mode: 'insensitive' } },
            { name: { contains: 'alice', mode: 'insensitive' } },
          ],
        },
      })
    })
  })
})
