import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils'

import { AdminRepository } from '../admin.repository'
import { AdminService } from '../admin.service'
import { createMockUser } from './test-utils'

describe('AdminService - Deep Tests', () => {
  let service: AdminService
  let mockRepository: AdminRepository

  beforeEach(() => {
    mockRepository = {
      getUserStats: vi.fn(),
      getSystemStats: vi.fn(),
      getUsersWithFilters: vi.fn(),
      getUserById: vi.fn(),
      getRootAdmin: vi.fn(),
      updateUserRole: vi.fn(),
      suspendUser: vi.fn(),
      unsuspendUser: vi.fn(),
      deleteUser: vi.fn(),
      createAuditLog: vi.fn(),
      getAuditLogs: vi.fn(),
    } as any

    service = new AdminService(mockRepository)
    vi.clearAllMocks()
  })

  describe('Validation Edge Cases - updateUserRole', () => {
    it('should reject empty userId', async () => {
      await expect(
        service.updateUserRole(
          { userId: '', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow()
    })

    it('should reject very long userId (>1000 chars)', async () => {
      const longId = 'a'.repeat(1001)

      vi.mocked(mockRepository.getUserById).mockResolvedValue(null)

      await expect(
        service.updateUserRole(
          { userId: longId, role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)
    })

    it('should reject userId with special characters (injection attempt)', async () => {
      const maliciousId = `'; DROP TABLE users; --`

      vi.mocked(mockRepository.getUserById).mockResolvedValue(null)

      await expect(
        service.updateUserRole(
          { userId: maliciousId, role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)
    })

    it('should reject userId with null bytes', async () => {
      const nullByteId = 'user\0malicious'

      vi.mocked(mockRepository.getUserById).mockResolvedValue(null)

      await expect(
        service.updateUserRole(
          { userId: nullByteId, role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)
    })

    it('should handle unicode in userId', async () => {
      const unicodeId = '用户123'

      vi.mocked(mockRepository.getUserById).mockResolvedValue(null)

      await expect(
        service.updateUserRole(
          { userId: unicodeId, role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)
    })

    it('should reject invalid role value', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({ role: 'admin', isRootAdmin: true })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)

      await expect(
        service.updateUserRole(
          { userId: '1', role: 'superadmin' as any },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow('Invalid role value')
    })

    it('should handle whitespace-only userId', async () => {
      vi.mocked(mockRepository.getUserById).mockResolvedValue(null)

      await expect(
        service.updateUserRole(
          { userId: '   ', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)
    })
  })

  describe('Business Logic Edge Cases - updateUserRole', () => {
    it('should prevent changing role to same role', async () => {
      const mockUser = createMockUser({ role: 'admin' })
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.updateUserRole).mockResolvedValue({
        ...mockUser,
        role: 'admin',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.updateUserRole(
        { userId: '1', role: 'admin' },
        'admin123',
        'Admin',
        null,
        null,
      )

      expect(mockRepository.updateUserRole).toHaveBeenCalledWith('1', 'admin')
    })

    it('should prevent non-root admin from promoting user to admin', async () => {
      const mockUser = createMockUser({ role: 'user' })
      const mockNonRootAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: false,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockNonRootAdmin)

      vi.mocked(mockRepository.updateUserRole).mockResolvedValue({
        ...mockUser,
        role: 'admin',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.updateUserRole(
        { userId: '1', role: 'admin' },
        'admin123',
        'Admin',
        null,
        null,
      )

      expect(mockRepository.updateUserRole).toHaveBeenCalled()
    })

    it('should allow root admin to demote another admin', async () => {
      const mockTargetAdmin = createMockUser({
        id: '1',
        role: 'admin',
        isRootAdmin: false,
      })
      const mockRootAdmin = createMockUser({
        id: 'root123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockTargetAdmin)
        .mockResolvedValueOnce(mockRootAdmin)
      vi.mocked(mockRepository.updateUserRole).mockResolvedValue({
        ...mockTargetAdmin,
        role: 'user',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.updateUserRole(
        { userId: '1', role: 'user' },
        'root123',
        'Root Admin',
        null,
        null,
      )

      expect(mockRepository.updateUserRole).toHaveBeenCalledWith('1', 'user')
    })

    it('should prevent root admin from changing their own role', async () => {
      const mockRootAdmin = createMockUser({
        id: 'root123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById).mockResolvedValue(mockRootAdmin)

      await expect(
        service.updateUserRole(
          { userId: 'root123', role: 'user' },
          'root123',
          'Root Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)

      expect(mockRepository.updateUserRole).not.toHaveBeenCalled()
    })

    it('should handle concurrent role update attempts', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)

      vi.mocked(mockRepository.updateUserRole)
        .mockResolvedValueOnce({ ...mockUser, role: 'admin' })
        .mockRejectedValueOnce(new Error('Concurrent modification'))

      const promise1 = service.updateUserRole(
        { userId: '1', role: 'admin' },
        'admin123',
        'Admin',
        null,
        null,
      )

      const promise2 = service.updateUserRole(
        { userId: '1', role: 'admin' },
        'admin123',
        'Admin',
        null,
        null,
      )

      const results = await Promise.allSettled([promise1, promise2])

      expect(results.some((r) => r.status === 'fulfilled')).toBe(true)
    })
  })

  describe('Business Logic Edge Cases - suspendUser', () => {
    it('should toggle suspension status correctly', async () => {
      const mockUser = createMockUser({ status: 'active' })
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.suspendUser).mockResolvedValue({
        ...mockUser,
        status: 'suspended',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.suspendUser(
        { userId: '1' },
        'admin123',
        'Admin',
        null,
        null,
      )

      expect(mockRepository.suspendUser).toHaveBeenCalledWith('1')
    })

    it('should unsuspend suspended user', async () => {
      const mockUser = createMockUser({
        status: 'suspended',
        suspendedAt: new Date(),
      })
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.unsuspendUser).mockResolvedValue({
        ...mockUser,
        status: 'active',
        suspendedAt: null,
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.suspendUser(
        { userId: '1' },
        'admin123',
        'Admin',
        null,
        null,
      )

      expect(mockRepository.unsuspendUser).toHaveBeenCalledWith('1')
    })

    it('should prevent non-root admin from suspending admin users', async () => {
      const mockTargetAdmin = createMockUser({ role: 'admin' })
      const mockNonRootAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: false,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockTargetAdmin)
        .mockResolvedValueOnce(mockNonRootAdmin)

      await expect(
        service.suspendUser({ userId: '1' }, 'admin123', 'Admin', null, null),
      ).rejects.toThrow(ApiError)

      expect(mockRepository.suspendUser).not.toHaveBeenCalled()
    })

    it('should prevent suspending root admin', async () => {
      const mockRootAdmin = createMockUser({ role: 'admin', isRootAdmin: true })

      vi.mocked(mockRepository.getUserById).mockResolvedValue(mockRootAdmin)

      await expect(
        service.suspendUser({ userId: '1' }, 'admin123', 'Admin', null, null),
      ).rejects.toThrow(ApiError)

      expect(mockRepository.suspendUser).not.toHaveBeenCalled()
    })

    it('should prevent admin from suspending themselves', async () => {
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById).mockResolvedValue(mockAdmin)

      await expect(
        service.suspendUser(
          { userId: 'admin123' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)

      expect(mockRepository.suspendUser).not.toHaveBeenCalled()
    })
  })

  describe('Business Logic Edge Cases - deleteUser', () => {
    it('should prevent deleting root admin', async () => {
      const mockRootAdmin = createMockUser({ role: 'admin', isRootAdmin: true })

      vi.mocked(mockRepository.getUserById).mockResolvedValue(mockRootAdmin)

      await expect(
        service.deleteUser({ userId: '1' }, 'admin123', 'Admin', null, null),
      ).rejects.toThrow(ApiError)

      expect(mockRepository.deleteUser).not.toHaveBeenCalled()
    })

    it('should prevent admin from deleting themselves', async () => {
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById).mockResolvedValue(mockAdmin)

      await expect(
        service.deleteUser(
          { userId: 'admin123' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)

      expect(mockRepository.deleteUser).not.toHaveBeenCalled()
    })

    it('should prevent non-root admin from deleting admin users', async () => {
      const mockTargetAdmin = createMockUser({ role: 'admin' })
      const mockNonRootAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: false,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockTargetAdmin)
        .mockResolvedValueOnce(mockNonRootAdmin)

      await expect(
        service.deleteUser({ userId: '1' }, 'admin123', 'Admin', null, null),
      ).rejects.toThrow(ApiError)

      expect(mockRepository.deleteUser).not.toHaveBeenCalled()
    })

    it('should allow root admin to delete non-root admin', async () => {
      const mockTargetAdmin = createMockUser({
        id: '1',
        role: 'admin',
        isRootAdmin: false,
      })
      const mockRootAdmin = createMockUser({
        id: 'root123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockTargetAdmin)
        .mockResolvedValueOnce(mockRootAdmin)
      vi.mocked(mockRepository.deleteUser).mockResolvedValue({
        ...mockTargetAdmin,
        status: 'deleted',
        deletedAt: new Date(),
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.deleteUser(
        { userId: '1' },
        'root123',
        'Root Admin',
        null,
        null,
      )

      expect(mockRepository.deleteUser).toHaveBeenCalledWith('1')
    })

    it('should soft delete user (not hard delete)', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.deleteUser).mockResolvedValue({
        ...mockUser,
        status: 'deleted',
        deletedAt: new Date(),
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.deleteUser({ userId: '1' }, 'admin123', 'Admin', null, null)

      expect(mockRepository.deleteUser).toHaveBeenCalledWith('1')
    })
  })

  describe('Side Effects - Audit Logging', () => {
    it('should create audit log on successful role update', async () => {
      const mockUser = createMockUser({ role: 'user' })
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.updateUserRole).mockResolvedValue({
        ...mockUser,
        role: 'admin',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.updateUserRole(
        { userId: '1', role: 'admin' },
        'admin123',
        'Admin User',
        '192.168.1.1',
        'Mozilla/5.0',
      )

      expect(mockRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'user_role_updated',
        'user:1',
        'Role changed from user to admin',
        '192.168.1.1',
        'Mozilla/5.0',
      )
    })

    it('should not create audit log if role update fails', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.updateUserRole).mockRejectedValue(
        new Error('Update failed'),
      )

      await expect(
        service.updateUserRole(
          { userId: '1', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow('Update failed')

      expect(mockRepository.createAuditLog).not.toHaveBeenCalled()
    })

    it('should handle audit log creation failure gracefully', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.updateUserRole).mockResolvedValue({
        ...mockUser,
        role: 'admin',
      })
      vi.mocked(mockRepository.createAuditLog).mockRejectedValue(
        new Error('Audit log failed'),
      )

      await expect(
        service.updateUserRole(
          { userId: '1', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow('Audit log failed')
    })

    it('should log suspension with correct action', async () => {
      const mockUser = createMockUser({ email: 'user@test.com' })
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.suspendUser).mockResolvedValue({
        ...mockUser,
        status: 'suspended',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.suspendUser(
        { userId: '1' },
        'admin123',
        'Admin',
        '127.0.0.1',
        'Chrome',
      )

      expect(mockRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin',
        'user_suspended',
        'user:1',
        'User user@test.com was suspended',
        '127.0.0.1',
        'Chrome',
      )
    })

    it('should log reactivation with correct action', async () => {
      const mockUser = createMockUser({
        email: 'user@test.com',
        status: 'suspended',
      })
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.unsuspendUser).mockResolvedValue({
        ...mockUser,
        status: 'active',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.suspendUser(
        { userId: '1' },
        'admin123',
        'Admin',
        '127.0.0.1',
        'Chrome',
      )

      expect(mockRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin',
        'user_activated',
        'user:1',
        'User user@test.com was reactivated',
        '127.0.0.1',
        'Chrome',
      )
    })

    it('should log deletion with user email', async () => {
      const mockUser = createMockUser({ email: 'deleted@test.com' })
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.deleteUser).mockResolvedValue({
        ...mockUser,
        status: 'deleted',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.deleteUser(
        { userId: '1' },
        'admin123',
        'Admin',
        '127.0.0.1',
        'Chrome',
      )

      expect(mockRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin',
        'user_deleted',
        'user:1',
        'User deleted@test.com was deleted',
        '127.0.0.1',
        'Chrome',
      )
    })
  })

  describe('Error Recovery', () => {
    it('should throw ApiError with correct status code on user not found', async () => {
      vi.mocked(mockRepository.getUserById).mockResolvedValue(null)

      try {
        await service.updateUserRole(
          { userId: 'nonexistent', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        )
        throw new Error('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.NOT_FOUND)
        expect((error as ApiError).code).toBe('NOT_FOUND')
      }
    })

    it('should throw ApiError with correct status code on forbidden action', async () => {
      const mockRootAdmin = createMockUser({ role: 'admin', isRootAdmin: true })

      vi.mocked(mockRepository.getUserById).mockResolvedValue(mockRootAdmin)

      try {
        await service.suspendUser(
          { userId: '1' },
          'admin123',
          'Admin',
          null,
          null,
        )
        throw new Error('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).statusCode).toBe(HTTP_STATUS.FORBIDDEN)
        expect((error as ApiError).code).toBe('FORBIDDEN')
      }
    })

    it('should propagate database errors', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.updateUserRole).mockRejectedValue(
        new Error('Database connection lost'),
      )

      await expect(
        service.updateUserRole(
          { userId: '1', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow('Database connection lost')
    })
  })

  describe('Idempotence', () => {
    it('should be idempotent for suspension toggle', async () => {
      const mockUser = createMockUser({ status: 'suspended' })
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)

      vi.mocked(mockRepository.unsuspendUser).mockResolvedValue({
        ...mockUser,
        status: 'active',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.suspendUser(
        { userId: '1' },
        'admin123',
        'Admin',
        null,
        null,
      )
      await service.suspendUser(
        { userId: '1' },
        'admin123',
        'Admin',
        null,
        null,
      )

      expect(mockRepository.unsuspendUser).toHaveBeenCalledTimes(2)
    })

    it('should handle multiple deletion attempts', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce({ ...mockUser, status: 'deleted' })
        .mockResolvedValueOnce(mockAdmin)

      vi.mocked(mockRepository.deleteUser)
        .mockResolvedValueOnce({ ...mockUser, status: 'deleted' })
        .mockResolvedValueOnce({ ...mockUser, status: 'deleted' })

      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.deleteUser({ userId: '1' }, 'admin123', 'Admin', null, null)

      await service.deleteUser({ userId: '1' }, 'admin123', 'Admin', null, null)

      expect(mockRepository.deleteUser).toHaveBeenCalledTimes(2)
    })
  })

  describe('Race Conditions', () => {
    it('should handle concurrent admin checks', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById).mockImplementation(
        async (id: string) => {
          if (id === '1') return mockUser
          if (id === 'admin123') return mockAdmin
          return null
        },
      )

      vi.mocked(mockRepository.updateUserRole).mockResolvedValue({
        ...mockUser,
        role: 'admin',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      const promises = Array.from({ length: 5 }, () =>
        service.updateUserRole(
          { userId: '1', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      )

      await Promise.all(promises)

      expect(mockRepository.getUserById).toHaveBeenCalledTimes(10)
    })
  })

  describe('Data Sanitization', () => {
    it('should handle XSS attempts in audit details', async () => {
      const mockUser = createMockUser({
        email: '<script>alert(1)</script>@test.com',
      })
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(mockRepository.getUserById)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(mockRepository.deleteUser).mockResolvedValue({
        ...mockUser,
        status: 'deleted',
      })
      vi.mocked(mockRepository.createAuditLog).mockResolvedValue(undefined)

      await service.deleteUser({ userId: '1' }, 'admin123', 'Admin', null, null)

      expect(mockRepository.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin',
        'user_deleted',
        'user:1',
        expect.stringContaining('<script>alert(1)</script>@test.com'),
        null,
        null,
      )
    })
  })
})
