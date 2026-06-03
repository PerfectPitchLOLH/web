import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'

import { AdminRepository } from '../admin.repository'
import { createMockUser } from './test-utils'

vi.mock('@/server/lib/database', () => ({
  db: {
    user: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('AdminRepository - Deep Tests', () => {
  let repository: AdminRepository

  beforeEach(() => {
    repository = new AdminRepository()
    vi.clearAllMocks()
  })

  describe('Edge Cases - Boundary Values', () => {
    describe('getUsersWithFilters - Search', () => {
      it('should handle empty string in search', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({ search: '' })

        expect(result).toBeDefined()
        expect(result.users).toEqual([])
        expect(db.user.findMany).toHaveBeenCalledWith({
          where: {},
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      })

      it('should handle very long search strings (>1000 chars)', async () => {
        const longString = 'a'.repeat(1001)

        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          search: longString,
        })

        expect(result).toBeDefined()
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                { email: { contains: longString, mode: 'insensitive' } },
                { name: { contains: longString, mode: 'insensitive' } },
              ]),
            }),
          }),
        )
      })

      it('should handle special characters in search (SQL injection attempt)', async () => {
        const specialChars = `'; DROP TABLE users; --`

        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          search: specialChars,
        })

        expect(result).toBeDefined()
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                { email: { contains: specialChars, mode: 'insensitive' } },
                { name: { contains: specialChars, mode: 'insensitive' } },
              ]),
            }),
          }),
        )
      })

      it('should handle unicode and emojis in search', async () => {
        const unicode = '测试 🚀 Ñoño José María'

        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({ search: unicode })

        expect(result).toBeDefined()
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.arrayContaining([
                { email: { contains: unicode, mode: 'insensitive' } },
                { name: { contains: unicode, mode: 'insensitive' } },
              ]),
            }),
          }),
        )
      })

      it('should handle null characters in search', async () => {
        const nullChars = 'test\0null\0chars'

        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          search: nullChars,
        })

        expect(result).toBeDefined()
      })

      it('should handle whitespace-only search', async () => {
        const whitespace = '   \t\n   '

        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          search: whitespace,
        })

        expect(result).toBeDefined()
      })

      it('should handle regex special characters', async () => {
        const regexChars = '.*+?^${}()|[]\\test@example.com'

        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          search: regexChars,
        })

        expect(result).toBeDefined()
      })
    })

    describe('getUsersWithFilters - Pagination', () => {
      it('should handle negative page number', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          page: -1,
          limit: 10,
        })

        expect(result).toBeDefined()
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: -20,
          }),
        )
      })

      it('should handle zero page number', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          page: 0,
          limit: 10,
        })

        expect(result).toBeDefined()
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: -10,
          }),
        )
      })

      it('should handle negative limit', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          page: 1,
          limit: -10,
        })

        expect(result).toBeDefined()
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: -10,
          }),
        )
      })

      it('should handle zero limit', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          page: 1,
          limit: 0,
        })

        expect(result).toBeDefined()
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 0,
          }),
        )
      })

      it('should handle excessively large limit (>1000)', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          page: 1,
          limit: 10000,
        })

        expect(result).toBeDefined()
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 10000,
          }),
        )
      })

      it('should handle page overflow (page * limit > MAX_SAFE_INTEGER)', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          page: Number.MAX_SAFE_INTEGER,
          limit: 100,
        })

        expect(result).toBeDefined()
      })

      it('should handle fractional page numbers', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          page: 1.5,
          limit: 10,
        })

        expect(result).toBeDefined()
        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 5,
          }),
        )
      })

      it('should calculate totalPages correctly with zero total', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          page: 1,
          limit: 10,
        })

        expect(result.totalPages).toBe(0)
      })

      it('should calculate totalPages correctly with exact division', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(100)

        const result = await repository.getUsersWithFilters({
          page: 1,
          limit: 10,
        })

        expect(result.totalPages).toBe(10)
      })

      it('should calculate totalPages correctly with remainder', async () => {
        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(105)

        const result = await repository.getUsersWithFilters({
          page: 1,
          limit: 10,
        })

        expect(result.totalPages).toBe(11)
      })
    })

    describe('getAuditLogs - Date Range', () => {
      it('should handle invalid date objects', async () => {
        vi.mocked(db.auditLog.findMany).mockResolvedValue([])
        vi.mocked(db.auditLog.count).mockResolvedValue(0)

        const invalidDate = new Date('invalid')

        const result = await repository.getAuditLogs({
          startDate: invalidDate,
        })

        expect(result).toBeDefined()
        expect(db.auditLog.findMany).toHaveBeenCalled()
      })

      it('should handle startDate > endDate', async () => {
        vi.mocked(db.auditLog.findMany).mockResolvedValue([])
        vi.mocked(db.auditLog.count).mockResolvedValue(0)

        const result = await repository.getAuditLogs({
          startDate: new Date('2024-12-31'),
          endDate: new Date('2024-01-01'),
        })

        expect(result).toBeDefined()
        expect(db.auditLog.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              timestamp: {
                gte: new Date('2024-12-31'),
                lte: new Date('2024-01-01'),
              },
            }),
          }),
        )
      })

      it('should handle very old dates (1900)', async () => {
        vi.mocked(db.auditLog.findMany).mockResolvedValue([])
        vi.mocked(db.auditLog.count).mockResolvedValue(0)

        const result = await repository.getAuditLogs({
          startDate: new Date('1900-01-01'),
        })

        expect(result).toBeDefined()
      })

      it('should handle future dates', async () => {
        vi.mocked(db.auditLog.findMany).mockResolvedValue([])
        vi.mocked(db.auditLog.count).mockResolvedValue(0)

        const result = await repository.getAuditLogs({
          startDate: new Date('2099-12-31'),
        })

        expect(result).toBeDefined()
      })

      it('should handle same startDate and endDate', async () => {
        vi.mocked(db.auditLog.findMany).mockResolvedValue([])
        vi.mocked(db.auditLog.count).mockResolvedValue(0)

        const sameDate = new Date('2024-06-15')

        const result = await repository.getAuditLogs({
          startDate: sameDate,
          endDate: sameDate,
        })

        expect(result).toBeDefined()
      })
    })
  })

  describe('Database Errors', () => {
    it('should handle database connection timeout', async () => {
      vi.mocked(db.user.findMany).mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 100),
          ) as any,
      )

      await expect(repository.getUsersWithFilters({})).rejects.toThrow(
        'Connection timeout',
      )
    })

    it('should handle database deadlock on update', async () => {
      vi.mocked(db.user.update).mockRejectedValue(
        new Error('Deadlock detected'),
      )

      await expect(repository.updateUserRole('1', 'admin')).rejects.toThrow(
        'Deadlock detected',
      )
    })

    it('should handle connection lost during query', async () => {
      vi.mocked(db.user.count).mockRejectedValue(
        new Error('Connection lost to database'),
      )

      await expect(repository.getUserStats()).rejects.toThrow(
        'Connection lost to database',
      )
    })

    it('should handle query timeout', async () => {
      vi.mocked(db.auditLog.findMany).mockRejectedValue(
        new Error('Query timeout'),
      )

      await expect(repository.getAuditLogs({})).rejects.toThrow('Query timeout')
    })

    it('should handle unique constraint violation on update', async () => {
      vi.mocked(db.user.update).mockRejectedValue(
        new Error('Unique constraint failed'),
      )

      await expect(repository.updateUserRole('1', 'admin')).rejects.toThrow(
        'Unique constraint',
      )
    })

    it('should handle foreign key constraint violation', async () => {
      vi.mocked(db.user.update).mockRejectedValue(
        new Error('Foreign key constraint failed'),
      )

      await expect(repository.suspendUser('1')).rejects.toThrow(
        'Foreign key constraint',
      )
    })

    it('should handle invalid UUID format', async () => {
      vi.mocked(db.user.findUnique).mockRejectedValue(
        new Error('Invalid UUID format'),
      )

      await expect(repository.getUserById('invalid-uuid')).rejects.toThrow(
        'Invalid UUID',
      )
    })

    it('should handle out of memory error', async () => {
      vi.mocked(db.user.findMany).mockRejectedValue(new Error('Out of memory'))

      await expect(
        repository.getUsersWithFilters({ limit: 1000000 }),
      ).rejects.toThrow('Out of memory')
    })
  })

  describe('Data Integrity', () => {
    it('should handle null in required fields gracefully', async () => {
      const userWithNulls = createMockUser({
        name: null,
        email: null,
      })

      vi.mocked(db.user.findMany).mockResolvedValue([userWithNulls])
      vi.mocked(db.user.count).mockResolvedValue(1)

      const result = await repository.getUsersWithFilters({})

      expect(result.users).toHaveLength(1)
      expect(result.users[0].name).toBeNull()
    })

    it('should handle malformed date objects', async () => {
      const userWithBadDate = createMockUser({
        createdAt: 'not-a-date' as any,
      })

      vi.mocked(db.user.findMany).mockResolvedValue([userWithBadDate])
      vi.mocked(db.user.count).mockResolvedValue(1)

      const result = await repository.getUsersWithFilters({})

      expect(result.users).toHaveLength(1)
    })

    it('should handle very long string values in database', async () => {
      const userWithLongStrings = createMockUser({
        email: 'a'.repeat(10000) + '@test.com',
        name: 'b'.repeat(10000),
      })

      vi.mocked(db.user.findMany).mockResolvedValue([userWithLongStrings])
      vi.mocked(db.user.count).mockResolvedValue(1)

      const result = await repository.getUsersWithFilters({})

      expect(result.users).toHaveLength(1)
      expect(result.users[0].email.length).toBeGreaterThan(10000)
    })

    it('should handle special characters in role field', async () => {
      vi.mocked(db.user.update).mockResolvedValue(
        createMockUser({ role: '<script>alert(1)</script>' }),
      )

      const result = await repository.updateUserRole(
        '1',
        '<script>alert(1)</script>',
      )

      expect(result.role).toBe('<script>alert(1)</script>')
    })
  })

  describe('Concurrency', () => {
    it('should handle multiple concurrent getUserStats calls', async () => {
      vi.mocked(db.user.count)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(25)

      vi.mocked(db.user.groupBy).mockResolvedValue([
        { role: 'admin', _count: { _all: 10 } },
        { role: 'user', _count: { _all: 90 } },
      ] as any)

      const [result1, result2] = await Promise.all([
        repository.getUserStats(),
        repository.getUserStats(),
      ])

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
    })

    it('should handle concurrent updates to same user', async () => {
      vi.mocked(db.user.update)
        .mockResolvedValueOnce(createMockUser({ role: 'admin' }))
        .mockResolvedValueOnce(createMockUser({ status: 'suspended' }))

      const [result1, result2] = await Promise.all([
        repository.updateUserRole('1', 'admin'),
        repository.suspendUser('1'),
      ])

      expect(result1.role).toBe('admin')
      expect(result2.status).toBe('suspended')
    })

    it('should handle concurrent audit log creation', async () => {
      vi.mocked(db.auditLog.create).mockResolvedValue({
        id: 'log1',
        timestamp: new Date(),
        userId: '1',
        userName: 'Admin',
        action: 'user_role_updated',
        resource: 'user:2',
        details: null,
        ipAddress: null,
        userAgent: null,
      })

      const promises = Array.from({ length: 10 }, (_, i) =>
        repository.createAuditLog(
          `user${i}`,
          `User ${i}`,
          'user_role_updated',
          `resource:${i}`,
          null,
          null,
          null,
        ),
      )

      await expect(Promise.all(promises)).resolves.toBeDefined()
      expect(db.auditLog.create).toHaveBeenCalledTimes(10)
    })
  })

  describe('Performance Edge Cases', () => {
    it('should handle large result sets efficiently', async () => {
      const largeUserSet = Array.from({ length: 1000 }, (_, i) =>
        createMockUser({ id: `user${i}`, email: `user${i}@test.com` }),
      )

      vi.mocked(db.user.findMany).mockResolvedValue(largeUserSet)
      vi.mocked(db.user.count).mockResolvedValue(1000)

      const start = Date.now()
      const result = await repository.getUsersWithFilters({ limit: 1000 })
      const duration = Date.now() - start

      expect(result.users).toHaveLength(1000)
      expect(duration).toBeLessThan(5000)
    })

    it('should handle groupBy with many roles', async () => {
      const manyRoles = Array.from({ length: 100 }, (_, i) => ({
        role: `role${i}`,
        _count: { _all: i + 1 },
      }))

      vi.mocked(db.user.count).mockResolvedValue(5050)
      vi.mocked(db.user.groupBy).mockResolvedValue(manyRoles as any)

      const result = await repository.getUserStats()

      expect(Object.keys(result.usersByRole)).toHaveLength(100)
    })

    it('should handle audit logs with complex filters', async () => {
      vi.mocked(db.auditLog.findMany).mockResolvedValue([])
      vi.mocked(db.auditLog.count).mockResolvedValue(0)

      const complexFilters = {
        userId: 'user123',
        action: 'user_role_updated',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        page: 10,
        limit: 100,
      }

      const result = await repository.getAuditLogs(complexFilters)

      expect(result).toBeDefined()
      expect(db.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user123',
            action: 'user_role_updated',
            timestamp: {
              gte: complexFilters.startDate,
              lte: complexFilters.endDate,
            },
          },
        }),
      )
    })
  })

  describe('Edge Cases - Status Updates', () => {
    it('should handle suspending already suspended user', async () => {
      const suspendedUser = createMockUser({
        status: 'suspended',
        suspendedAt: new Date(),
      })

      vi.mocked(db.user.update).mockResolvedValue(suspendedUser)

      const result = await repository.suspendUser('1')

      expect(result.status).toBe('suspended')
      expect(result.suspendedAt).toBeDefined()
    })

    it('should handle unsuspending never-suspended user', async () => {
      const activeUser = createMockUser({
        status: 'active',
        suspendedAt: null,
      })

      vi.mocked(db.user.update).mockResolvedValue(activeUser)

      const result = await repository.unsuspendUser('1')

      expect(result.status).toBe('active')
      expect(result.suspendedAt).toBeNull()
    })

    it('should handle deleting already deleted user', async () => {
      const deletedUser = createMockUser({
        status: 'deleted',
        deletedAt: new Date(),
      })

      vi.mocked(db.user.update).mockResolvedValue(deletedUser)

      const result = await repository.deleteUser('1')

      expect(result.status).toBe('deleted')
      expect(result.deletedAt).toBeDefined()
    })

    it('should preserve other user fields during status update', async () => {
      const originalUser = createMockUser({
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'admin',
      })

      vi.mocked(db.user.update).mockResolvedValue({
        ...originalUser,
        status: 'suspended',
        suspendedAt: new Date(),
      })

      const result = await repository.suspendUser('1')

      expect(result.email).toBe('test@test.com')
      expect(result.name).toBe('Test User')
      expect(result.role).toBe('admin')
      expect(result.status).toBe('suspended')
    })
  })

  describe('Edge Cases - Combined Filters', () => {
    it('should handle all filters combined', async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([])
      vi.mocked(db.user.count).mockResolvedValue(0)

      await repository.getUsersWithFilters({
        role: 'admin',
        search: 'test',
        emailVerified: true,
        page: 5,
        limit: 20,
      })

      expect(db.user.findMany).toHaveBeenCalledWith({
        where: {
          role: 'admin',
          OR: [
            { email: { contains: 'test', mode: 'insensitive' } },
            { name: { contains: 'test', mode: 'insensitive' } },
          ],
          emailVerified: { not: null },
        },
        skip: 80,
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should handle emailVerified false', async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([])
      vi.mocked(db.user.count).mockResolvedValue(0)

      await repository.getUsersWithFilters({ emailVerified: false })

      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { emailVerified: null },
        }),
      )
    })

    it('should handle undefined filters gracefully', async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([])
      vi.mocked(db.user.count).mockResolvedValue(0)

      await repository.getUsersWithFilters({
        role: undefined,
        search: undefined,
        emailVerified: undefined,
      })

      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      )
    })
  })
})
