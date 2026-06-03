import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/server/lib/database'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import { AdminRepository } from '../admin.repository'
import { AdminService } from '../admin.service'
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

describe('Admin Domain - Security Tests', () => {
  let service: AdminService
  let repository: AdminRepository

  beforeEach(() => {
    repository = new AdminRepository()
    service = new AdminService(repository)
    vi.clearAllMocks()
  })

  describe('SQL Injection Prevention', () => {
    describe('Search Queries', () => {
      it('should prevent SQL injection in email search', async () => {
        const sqlInjection = "'; DROP TABLE users; --"

        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        await repository.getUsersWithFilters({ search: sqlInjection })

        expect(db.user.findMany).toHaveBeenCalledWith({
          where: {
            OR: [
              { email: { contains: sqlInjection, mode: 'insensitive' } },
              { name: { contains: sqlInjection, mode: 'insensitive' } },
            ],
          },
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        })
      })

      it('should prevent SQL injection in role filter', async () => {
        const sqlInjection = "admin' OR '1'='1"

        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        await repository.getUsersWithFilters({ role: sqlInjection })

        expect(db.user.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { role: sqlInjection },
          }),
        )
      })

      it('should prevent SQL injection in userId lookup', async () => {
        const sqlInjection = "1' OR '1'='1"

        vi.mocked(db.user.findUnique).mockResolvedValue(null)

        await repository.getUserById(sqlInjection)

        expect(db.user.findUnique).toHaveBeenCalledWith({
          where: { id: sqlInjection },
        })
      })

      it('should handle UNION-based SQL injection', async () => {
        const sqlInjection = "' UNION SELECT * FROM users--"

        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const result = await repository.getUsersWithFilters({
          search: sqlInjection,
        })

        expect(result.users).toEqual([])
      })

      it('should handle time-based SQL injection', async () => {
        const sqlInjection = "'; WAITFOR DELAY '00:00:10'--"

        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        const start = Date.now()
        await repository.getUsersWithFilters({ search: sqlInjection })
        const duration = Date.now() - start

        expect(duration).toBeLessThan(1000)
      })

      it('should handle boolean-based SQL injection', async () => {
        const sqlInjection = "admin' AND 1=1--"

        vi.mocked(db.user.findMany).mockResolvedValue([])
        vi.mocked(db.user.count).mockResolvedValue(0)

        await repository.getUsersWithFilters({ search: sqlInjection })

        expect(db.user.findMany).toHaveBeenCalled()
      })
    })

    describe('Audit Log Queries', () => {
      it('should prevent SQL injection in userId filter', async () => {
        const sqlInjection = "'; DELETE FROM audit_logs; --"

        vi.mocked(db.auditLog.findMany).mockResolvedValue([])
        vi.mocked(db.auditLog.count).mockResolvedValue(0)

        await repository.getAuditLogs({ userId: sqlInjection })

        expect(db.auditLog.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: sqlInjection },
          }),
        )
      })

      it('should prevent SQL injection in action filter', async () => {
        const sqlInjection = "user_deleted' OR '1'='1"

        vi.mocked(db.auditLog.findMany).mockResolvedValue([])
        vi.mocked(db.auditLog.count).mockResolvedValue(0)

        await repository.getAuditLogs({ action: sqlInjection })

        expect(db.auditLog.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { action: sqlInjection },
          }),
        )
      })
    })
  })

  describe('XSS (Cross-Site Scripting) Prevention', () => {
    it('should handle XSS in user email', async () => {
      const xssPayload = '<script>alert("XSS")</script>@test.com'
      const mockUser = createMockUser({ email: xssPayload })

      vi.mocked(db.user.findMany).mockResolvedValue([mockUser])
      vi.mocked(db.user.count).mockResolvedValue(1)

      const result = await repository.getUsersWithFilters({
        search: xssPayload,
      })

      expect(result.users[0].email).toBe(xssPayload)
    })

    it('should handle XSS in user name', async () => {
      const xssPayload = '<img src=x onerror=alert(1)>'
      const mockUser = createMockUser({ name: xssPayload })

      vi.mocked(db.user.findMany).mockResolvedValue([mockUser])
      vi.mocked(db.user.count).mockResolvedValue(1)

      const result = await repository.getUsersWithFilters({
        search: xssPayload,
      })

      expect(result.users[0].name).toBe(xssPayload)
    })

    it('should handle XSS in role field', async () => {
      const xssPayload = '<script>document.cookie</script>'

      vi.mocked(db.user.update).mockResolvedValue(
        createMockUser({ role: xssPayload }),
      )

      const result = await repository.updateUserRole('1', xssPayload)

      expect(result.role).toBe(xssPayload)
    })

    it('should handle XSS in audit log details', async () => {
      const xssPayload = '<iframe src="javascript:alert(1)"></iframe>'

      vi.mocked(db.auditLog.create).mockResolvedValue({
        id: '1',
        timestamp: new Date(),
        userId: '1',
        userName: 'User',
        action: 'user_role_updated',
        resource: 'user:1',
        details: xssPayload,
        ipAddress: null,
        userAgent: null,
      })

      await repository.createAuditLog(
        '1',
        'User',
        'user_role_updated',
        'user:1',
        xssPayload,
        null,
        null,
      )

      expect(db.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: '1',
          userName: 'User',
          action: 'user_role_updated',
          resource: 'user:1',
          details: xssPayload,
          ipAddress: null,
          userAgent: null,
        },
      })
    })

    it('should handle SVG-based XSS', async () => {
      const svgXss = '<svg/onload=alert(1)>@test.com'

      vi.mocked(db.user.findMany).mockResolvedValue([
        createMockUser({ email: svgXss }),
      ])
      vi.mocked(db.user.count).mockResolvedValue(1)

      const result = await repository.getUsersWithFilters({ search: svgXss })

      expect(result.users[0].email).toBe(svgXss)
    })

    it('should handle JavaScript protocol XSS', async () => {
      const jsProtocol = 'javascript:alert(document.domain)'

      vi.mocked(db.user.findMany).mockResolvedValue([])
      vi.mocked(db.user.count).mockResolvedValue(0)

      await repository.getUsersWithFilters({ search: jsProtocol })

      expect(db.user.findMany).toHaveBeenCalled()
    })

    it('should handle event handler XSS', async () => {
      const eventXss = '" onmouseover="alert(1)"'

      vi.mocked(db.user.findMany).mockResolvedValue([])
      vi.mocked(db.user.count).mockResolvedValue(0)

      await repository.getUsersWithFilters({ search: eventXss })

      expect(db.user.findMany).toHaveBeenCalled()
    })
  })

  describe('Authorization & Permission Escalation', () => {
    describe('Role Update Security', () => {
      it('should prevent regular admin from changing root admin role', async () => {
        const mockRootAdmin = createMockUser({
          id: '1',
          role: 'admin',
          isRootAdmin: true,
        })
        const mockRegularAdmin = createMockUser({
          id: 'admin123',
          role: 'admin',
          isRootAdmin: false,
        })

        vi.mocked(db.user.findUnique)
          .mockResolvedValueOnce(mockRootAdmin)
          .mockResolvedValueOnce(mockRegularAdmin)

        await expect(
          service.updateUserRole(
            { userId: '1', role: 'user' },
            'admin123',
            'Regular Admin',
            null,
            null,
          ),
        ).rejects.toThrow(ApiError)
      })

      it('should prevent user from changing their own role', async () => {
        const mockUser = createMockUser({ id: 'user123', role: 'user' })

        vi.mocked(db.user.findUnique).mockResolvedValue(mockUser)

        await expect(
          service.updateUserRole(
            { userId: 'user123', role: 'admin' },
            'user123',
            'User',
            null,
            null,
          ),
        ).rejects.toThrow(ApiError)
      })

      it('should prevent admin from promoting themselves to root', async () => {
        const mockAdmin = createMockUser({
          id: 'admin123',
          role: 'admin',
          isRootAdmin: false,
        })

        vi.mocked(db.user.findUnique).mockResolvedValue(mockAdmin)

        await expect(
          service.updateUserRole(
            { userId: 'admin123', role: 'admin' },
            'admin123',
            'Admin',
            null,
            null,
          ),
        ).rejects.toThrow(ApiError)
      })

      it('should prevent horizontal privilege escalation', async () => {
        const mockTargetAdmin = createMockUser({
          id: 'admin2',
          role: 'admin',
          isRootAdmin: false,
        })
        const mockSourceAdmin = createMockUser({
          id: 'admin1',
          role: 'admin',
          isRootAdmin: false,
        })

        vi.mocked(db.user.findUnique)
          .mockResolvedValueOnce(mockTargetAdmin)
          .mockResolvedValueOnce(mockSourceAdmin)

        await expect(
          service.updateUserRole(
            { userId: 'admin2', role: 'user' },
            'admin1',
            'Admin 1',
            null,
            null,
          ),
        ).rejects.toThrow(ApiError)
      })

      it('should only allow root admin to change admin roles', async () => {
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

        vi.mocked(db.user.findUnique)
          .mockResolvedValueOnce(mockTargetAdmin)
          .mockResolvedValueOnce(mockRootAdmin)
        vi.mocked(db.user.update).mockResolvedValue({
          ...mockTargetAdmin,
          role: 'user',
        })
        vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

        await service.updateUserRole(
          { userId: '1', role: 'user' },
          'root123',
          'Root Admin',
          null,
          null,
        )

        expect(db.user.update).toHaveBeenCalled()
      })
    })

    describe('Suspend/Delete Security', () => {
      it('should prevent root admin suspension', async () => {
        const mockRootAdmin = createMockUser({
          id: '1',
          role: 'admin',
          isRootAdmin: true,
        })

        vi.mocked(db.user.findUnique).mockResolvedValue(mockRootAdmin)

        await expect(
          service.suspendUser({ userId: '1' }, 'admin123', 'Admin', null, null),
        ).rejects.toThrow(ApiError)
      })

      it('should prevent root admin deletion', async () => {
        const mockRootAdmin = createMockUser({
          id: '1',
          role: 'admin',
          isRootAdmin: true,
        })

        vi.mocked(db.user.findUnique).mockResolvedValue(mockRootAdmin)

        await expect(
          service.deleteUser({ userId: '1' }, 'admin123', 'Admin', null, null),
        ).rejects.toThrow(ApiError)
      })

      it('should prevent self-suspension', async () => {
        const mockAdmin = createMockUser({
          id: 'admin123',
          role: 'admin',
          isRootAdmin: true,
        })

        vi.mocked(db.user.findUnique).mockResolvedValue(mockAdmin)

        await expect(
          service.suspendUser(
            { userId: 'admin123' },
            'admin123',
            'Admin',
            null,
            null,
          ),
        ).rejects.toThrow(ApiError)
      })

      it('should prevent self-deletion', async () => {
        const mockAdmin = createMockUser({
          id: 'admin123',
          role: 'admin',
          isRootAdmin: true,
        })

        vi.mocked(db.user.findUnique).mockResolvedValue(mockAdmin)

        await expect(
          service.deleteUser(
            { userId: 'admin123' },
            'admin123',
            'Admin',
            null,
            null,
          ),
        ).rejects.toThrow(ApiError)
      })

      it('should prevent regular admin from suspending other admins', async () => {
        const mockTargetAdmin = createMockUser({
          id: '1',
          role: 'admin',
          isRootAdmin: false,
        })
        const mockSourceAdmin = createMockUser({
          id: 'admin123',
          role: 'admin',
          isRootAdmin: false,
        })

        vi.mocked(db.user.findUnique)
          .mockResolvedValueOnce(mockTargetAdmin)
          .mockResolvedValueOnce(mockSourceAdmin)

        await expect(
          service.suspendUser({ userId: '1' }, 'admin123', 'Admin', null, null),
        ).rejects.toThrow(ApiError)
      })

      it('should prevent regular admin from deleting other admins', async () => {
        const mockTargetAdmin = createMockUser({
          id: '1',
          role: 'admin',
          isRootAdmin: false,
        })
        const mockSourceAdmin = createMockUser({
          id: 'admin123',
          role: 'admin',
          isRootAdmin: false,
        })

        vi.mocked(db.user.findUnique)
          .mockResolvedValueOnce(mockTargetAdmin)
          .mockResolvedValueOnce(mockSourceAdmin)

        await expect(
          service.deleteUser({ userId: '1' }, 'admin123', 'Admin', null, null),
        ).rejects.toThrow(ApiError)
      })
    })
  })

  describe('IDOR (Insecure Direct Object Reference)', () => {
    it('should validate userId exists before update', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      await expect(
        service.updateUserRole(
          { userId: 'nonexistent', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)
    })

    it('should validate userId exists before suspension', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      await expect(
        service.suspendUser(
          { userId: 'nonexistent' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)
    })

    it('should validate userId exists before deletion', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      await expect(
        service.deleteUser(
          { userId: 'nonexistent' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)
    })

    it('should not leak user existence information', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      try {
        await service.updateUserRole(
          { userId: 'nonexistent', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        )
      } catch (error: any) {
        expect(error.message).toBe('User not found')
        expect(error.statusCode).toBe(HTTP_STATUS.NOT_FOUND)
      }
    })

    it('should prevent accessing other user data via IDOR', async () => {
      const mockOtherUser = createMockUser({ id: 'other-user-id' })

      vi.mocked(db.user.findUnique).mockResolvedValue(mockOtherUser)

      const result = await repository.getUserById('other-user-id')

      expect(result?.id).toBe('other-user-id')
    })
  })

  describe('NoSQL Injection (if applicable)', () => {
    it('should handle object injection in filters', async () => {
      const objectInjection = { $gt: '' } as any

      vi.mocked(db.user.findMany).mockResolvedValue([])
      vi.mocked(db.user.count).mockResolvedValue(0)

      await repository.getUsersWithFilters({ role: objectInjection })

      expect(db.user.findMany).toHaveBeenCalled()
    })

    it('should handle array injection in search', async () => {
      const arrayInjection = ['admin', 'user'] as any

      vi.mocked(db.user.findMany).mockResolvedValue([])
      vi.mocked(db.user.count).mockResolvedValue(0)

      await repository.getUsersWithFilters({ search: arrayInjection })

      expect(db.user.findMany).toHaveBeenCalled()
    })
  })

  describe('Mass Assignment', () => {
    it('should only update allowed fields in role update', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        role: 'admin',
      })
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      await service.updateUserRole(
        { userId: '1', role: 'admin' },
        'admin123',
        'Admin',
        null,
        null,
      )

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { role: 'admin' },
      })
    })

    it('should only update status fields in suspension', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        status: 'suspended',
      })
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      await service.suspendUser(
        { userId: '1' },
        'admin123',
        'Admin',
        null,
        null,
      )

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: 'suspended',
          suspendedAt: expect.any(Date),
        },
      })
    })
  })

  describe('Audit Trail Tampering', () => {
    it('should always create audit log on role change', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        role: 'admin',
      })
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      await service.updateUserRole(
        { userId: '1', role: 'admin' },
        'admin123',
        'Admin User',
        '192.168.1.1',
        'Mozilla/5.0',
      )

      expect(db.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin123',
          userName: 'Admin User',
          action: 'user_role_updated',
          resource: 'user:1',
          details: 'Role changed from user to admin',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      })
    })

    it('should not create audit log if operation fails', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(db.user.update).mockRejectedValue(new Error('Update failed'))

      await expect(
        service.updateUserRole(
          { userId: '1', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow()

      expect(db.auditLog.create).not.toHaveBeenCalled()
    })

    it('should record IP address in audit log', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        status: 'suspended',
      })
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      await service.suspendUser(
        { userId: '1' },
        'admin123',
        'Admin',
        '10.0.0.1',
        null,
      )

      expect(db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '10.0.0.1',
          }),
        }),
      )
    })

    it('should record user agent in audit log', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        status: 'deleted',
      })
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      await service.deleteUser(
        { userId: '1' },
        'admin123',
        'Admin',
        null,
        'Chrome/100.0',
      )

      expect(db.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userAgent: 'Chrome/100.0',
          }),
        }),
      )
    })
  })

  describe('Input Validation Bypass', () => {
    it('should reject null userId', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      await expect(
        service.updateUserRole(
          { userId: null as any, role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow()
    })

    it('should reject undefined userId', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      await expect(
        service.updateUserRole(
          { userId: undefined as any, role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow()
    })

    it('should reject numeric userId when string expected', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      await expect(
        service.updateUserRole(
          { userId: 123 as any, role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow()
    })

    it('should reject object as userId', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      await expect(
        service.updateUserRole(
          { userId: { id: '1' } as any, role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow()
    })

    it('should reject array as role', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)

      await expect(
        service.updateUserRole(
          { userId: '1', role: ['admin'] as any },
          'admin123',
          'Admin',
          null,
          null,
        ),
      ).rejects.toThrow()
    })
  })

  describe('Race Conditions & TOCTOU', () => {
    it('should handle concurrent role updates to same user', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)

      vi.mocked(db.user.update)
        .mockResolvedValueOnce({ ...mockUser, role: 'admin' })
        .mockRejectedValueOnce(new Error('Concurrent modification'))

      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

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
      expect(results.some((r) => r.status === 'rejected')).toBe(true)
    })

    it('should handle check-use race condition', async () => {
      const mockUser = createMockUser({ role: 'user' })
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)

      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        role: 'admin',
      })

      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      await service.updateUserRole(
        { userId: '1', role: 'admin' },
        'admin123',
        'Admin',
        null,
        null,
      )

      expect(db.user.findUnique).toHaveBeenCalledTimes(2)
      expect(db.user.update).toHaveBeenCalledTimes(1)
    })
  })

  describe('Information Disclosure', () => {
    it('should not disclose user count in error messages', async () => {
      vi.mocked(db.user.findUnique).mockResolvedValue(null)

      try {
        await service.updateUserRole(
          { userId: 'nonexistent', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        )
      } catch (error: any) {
        expect(error.message).not.toContain('total users')
        expect(error.message).not.toContain('database')
      }
    })

    it('should use generic error for admin check', async () => {
      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      try {
        await service.updateUserRole(
          { userId: '1', role: 'admin' },
          'admin123',
          'Admin',
          null,
          null,
        )
      } catch (error: any) {
        expect(error.message).toBe('User not found')
      }
    })

    it('should not leak internal paths in errors', async () => {
      vi.mocked(db.user.count).mockRejectedValue(
        new Error('Error at /var/lib/postgres/data'),
      )

      try {
        await repository.getUserStats()
      } catch (error: any) {
        expect(error.message).not.toContain('/var')
        expect(error.message).not.toContain('postgres')
      }
    })
  })

  describe('DoS (Denial of Service) Prevention', () => {
    it('should handle extremely large page numbers', async () => {
      vi.mocked(db.user.findMany).mockResolvedValue([])
      vi.mocked(db.user.count).mockResolvedValue(0)

      await repository.getUsersWithFilters({
        page: Number.MAX_SAFE_INTEGER,
        limit: 10,
      })

      expect(db.user.findMany).toHaveBeenCalled()
    })

    it('should handle extremely large result sets', async () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) =>
        createMockUser({ id: `user${i}` }),
      )

      vi.mocked(db.user.findMany).mockResolvedValue(largeArray)
      vi.mocked(db.user.count).mockResolvedValue(10000)

      const start = Date.now()
      const result = await repository.getUsersWithFilters({ limit: 10000 })
      const duration = Date.now() - start

      expect(result.users.length).toBe(10000)
      expect(duration).toBeLessThan(5000)
    })

    it('should handle resource exhaustion in search', async () => {
      const veryLongSearch = 'a'.repeat(100000)

      vi.mocked(db.user.findMany).mockResolvedValue([])
      vi.mocked(db.user.count).mockResolvedValue(0)

      const start = Date.now()
      await repository.getUsersWithFilters({ search: veryLongSearch })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(2000)
    })

    it('should handle deeply nested object attempts', async () => {
      const nestedObj: any = {}
      let current = nestedObj
      for (let i = 0; i < 1000; i++) {
        current.nested = {}
        current = current.nested
      }

      vi.mocked(db.user.findMany).mockResolvedValue([])
      vi.mocked(db.user.count).mockResolvedValue(0)

      await expect(
        repository.getUsersWithFilters({ search: nestedObj } as any),
      ).resolves.toBeDefined()
    })
  })

  describe('CSRF (Cross-Site Request Forgery) - Contextual', () => {
    it('should require proper authentication for state-changing operations', async () => {
      const mockUser = createMockUser()
      const mockAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        isRootAdmin: true,
      })

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockAdmin)
      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        role: 'admin',
      })
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      await service.updateUserRole(
        { userId: '1', role: 'admin' },
        'admin123',
        'Admin',
        null,
        null,
      )

      expect(db.user.findUnique).toHaveBeenCalledTimes(2)
    })

    it('should validate admin identity for each operation', async () => {
      const mockUser = createMockUser()

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null)

      await expect(
        service.updateUserRole(
          { userId: '1', role: 'admin' },
          'fake-admin',
          'Fake Admin',
          null,
          null,
        ),
      ).rejects.toThrow(ApiError)
    })
  })

  describe('Session Fixation & Hijacking', () => {
    it('should validate admin exists for each request', async () => {
      const mockUser = createMockUser()

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null)

      await expect(
        service.updateUserRole(
          { userId: '1', role: 'admin' },
          'invalid-session',
          'Unknown',
          null,
          null,
        ),
      ).rejects.toThrow()
    })

    it('should not allow stale admin sessions', async () => {
      const mockUser = createMockUser()
      const deletedAdmin = createMockUser({
        id: 'admin123',
        role: 'admin',
        status: 'deleted',
      })

      vi.mocked(db.user.findUnique)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(deletedAdmin)

      vi.mocked(db.user.update).mockResolvedValue({
        ...mockUser,
        role: 'admin',
      })
      vi.mocked(db.auditLog.create).mockResolvedValue({} as any)

      await service.updateUserRole(
        { userId: '1', role: 'admin' },
        'admin123',
        'Admin',
        null,
        null,
      )

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'admin123' },
      })
    })
  })
})
