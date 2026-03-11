import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { AdminRepository } from '../../admin/admin.repository'
import { createMockUser } from '../../user/__tests__/test-utils'
import type { UserRepository } from '../../user/user.repository'
import type { ImpersonationRepository } from '../impersonation.repository'
import { ImpersonationService } from '../impersonation.service'

vi.mock('@/server/lib/database')

describe('ImpersonationService - Security Tests', () => {
  let service: ImpersonationService
  let mockImpersonationRepo: ImpersonationRepository
  let mockUserRepo: UserRepository
  let mockAdminRepo: AdminRepository

  beforeEach(() => {
    mockImpersonationRepo = {
      create: vi.fn(),
      findActiveByAdminId: vi.fn(),
      findById: vi.fn(),
      endSession: vi.fn(),
      endAllActiveSessionsForAdmin: vi.fn(),
    } as unknown as ImpersonationRepository

    mockUserRepo = {
      findById: vi.fn(),
    } as unknown as UserRepository

    mockAdminRepo = {
      createAuditLog: vi.fn(),
    } as unknown as AdminRepository

    service = new ImpersonationService(
      mockImpersonationRepo,
      mockUserRepo,
      mockAdminRepo,
    )
    vi.clearAllMocks()
  })

  describe('startImpersonation - Security Validations', () => {
    it('should reject when admin user does not exist', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null)

      await expect(
        service.startImpersonation('admin123', 'user123', null, null),
      ).rejects.toThrow(ApiError)

      await expect(
        service.startImpersonation('admin123', 'user123', null, null),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: 'Admin user not found',
      })
    })

    it('should reject when admin is not actually an admin', async () => {
      const nonAdminUser = createMockUser({
        id: 'user123',
        email: 'user@test.com',
        name: 'Regular User',
        role: 'user',
        emailVerified: new Date(),
      })

      vi.mocked(mockUserRepo.findById).mockResolvedValue(nonAdminUser)

      await expect(
        service.startImpersonation('user123', 'target123', null, null),
      ).rejects.toThrow(ApiError)

      await expect(
        service.startImpersonation('user123', 'target123', null, null),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: 'Only administrators can impersonate users',
      })
    })

    it('should reject when target user does not exist', async () => {
      const adminUser = createMockUser({
        id: 'admin123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        isRootAdmin: true,
        emailVerified: new Date(),
      })

      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(null)

      await expect(
        service.startImpersonation('admin123', 'nonexistent', null, null),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: 'Target user not found',
      })
    })

    it('should reject impersonation of another admin', async () => {
      const adminUser = createMockUser({
        id: 'admin123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        isRootAdmin: true,
        emailVerified: new Date(),
      })
      const targetAdmin = createMockUser({
        id: 'admin456',
        email: 'admin2@test.com',
        name: 'Another Admin',
        role: 'admin',
        emailVerified: new Date(),
      })

      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(targetAdmin)

      await expect(
        service.startImpersonation('admin123', 'admin456', null, null),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: 'Cannot impersonate another administrator',
      })
    })

    it('should reject self-impersonation (admin role checked first)', async () => {
      const adminUser = createMockUser({
        id: 'admin123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        isRootAdmin: true,
        emailVerified: new Date(),
      })

      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(adminUser)

      await expect(
        service.startImpersonation('admin123', 'admin123', null, null),
      ).rejects.toMatchObject({
        code: 'FORBIDDEN',
        statusCode: HTTP_STATUS.FORBIDDEN,
        message: 'Cannot impersonate another administrator',
      })
    })

    it('should allow valid impersonation and end previous sessions', async () => {
      const adminUser = createMockUser({
        id: 'admin123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        isRootAdmin: true,
        emailVerified: new Date(),
      })
      const targetUser = createMockUser({
        id: 'user123',
        email: 'user@test.com',
        name: 'Target User',
        role: 'user',
        emailVerified: new Date(),
      })

      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(targetUser)

      vi.mocked(
        mockImpersonationRepo.endAllActiveSessionsForAdmin,
      ).mockResolvedValue({ count: 1 })

      vi.mocked(mockImpersonationRepo.create).mockResolvedValue(mockSession)

      const result = await service.startImpersonation(
        'admin123',
        'user123',
        '192.168.1.1',
        'Mozilla/5.0',
      )

      expect(result).toEqual(mockSession)
      expect(
        mockImpersonationRepo.endAllActiveSessionsForAdmin,
      ).toHaveBeenCalledWith('admin123')
      expect(mockImpersonationRepo.create).toHaveBeenCalledWith({
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      })
    })
  })

  describe('endImpersonation - Security Validations', () => {
    it('should reject when session does not exist', async () => {
      vi.mocked(mockImpersonationRepo.findById).mockResolvedValue(null)

      await expect(service.endImpersonation('nonexistent')).rejects.toThrow(
        ApiError,
      )

      await expect(
        service.endImpersonation('nonexistent'),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: 'Impersonation session not found',
      })
    })

    it('should reject when session is already inactive', async () => {
      const inactiveSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(),
        endedAt: new Date(),
        isActive: false,
        admin: {
          id: 'admin123',
          name: 'Admin',
          email: 'admin@test.com',
        },
        targetUser: {
          id: 'user123',
          name: 'Target User',
          email: 'target@test.com',
          role: 'user',
        },
      }

      vi.mocked(mockImpersonationRepo.findById).mockResolvedValue(
        inactiveSession,
      )

      await expect(service.endImpersonation('session123')).rejects.toThrow(
        ApiError,
      )

      await expect(
        service.endImpersonation('session123'),
      ).rejects.toMatchObject({
        code: 'VALIDATION_ERROR',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Session is already ended',
      })
    })

    it('should successfully end active session', async () => {
      const activeSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
        admin: {
          id: 'admin123',
          name: 'Admin User',
          email: 'admin@test.com',
        },
        targetUser: {
          id: 'user123',
          name: 'Target User',
          email: 'user@test.com',
          role: 'user',
        },
      }

      vi.mocked(mockImpersonationRepo.findById).mockResolvedValue(activeSession)
      vi.mocked(mockImpersonationRepo.endSession).mockResolvedValue({
        ...activeSession,
        endedAt: new Date(),
        isActive: false,
      })

      await expect(
        service.endImpersonation('session123'),
      ).resolves.not.toThrow()

      expect(mockImpersonationRepo.endSession).toHaveBeenCalledWith(
        'session123',
      )
      expect(mockAdminRepo.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'impersonation_ended',
        'user:user123',
        'Ended impersonation of Target User',
        null,
        null,
      )
    })
  })

  describe('getActiveImpersonation - Session Timeout', () => {
    it('should return null and end session when session is expired (> 30 min)', async () => {
      const expiredStartDate = new Date(Date.now() - 31 * 60 * 1000)

      const expiredSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt: expiredStartDate,
        endedAt: null,
        isActive: true,
        admin: {
          id: 'admin123',
          name: 'Admin User',
          email: 'admin@test.com',
        },
        targetUser: {
          id: 'user123',
          name: 'Target User',
          email: 'user@test.com',
          role: 'user',
        },
      }

      vi.mocked(mockImpersonationRepo.findActiveByAdminId).mockResolvedValue(
        expiredSession,
      )
      vi.mocked(mockImpersonationRepo.endSession).mockResolvedValue({
        ...expiredSession,
        endedAt: new Date(),
        isActive: false,
      })

      const result = await service.getActiveImpersonation('admin123')

      expect(result).toBeNull()
      expect(mockImpersonationRepo.endSession).toHaveBeenCalledWith(
        'session123',
      )
    })

    it('should return session info when session is still valid', async () => {
      const validStartDate = new Date(Date.now() - 15 * 60 * 1000)

      const validSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt: validStartDate,
        endedAt: null,
        isActive: true,
        admin: {
          id: 'admin123',
          name: 'Admin User',
          email: 'admin@test.com',
        },
        targetUser: {
          id: 'user123',
          name: 'Target User',
          email: 'user@test.com',
          role: 'user',
        },
      }

      vi.mocked(mockImpersonationRepo.findActiveByAdminId).mockResolvedValue(
        validSession,
      )

      const result = await service.getActiveImpersonation('admin123')

      expect(result).toMatchObject({
        sessionId: 'session123',
        adminId: 'admin123',
        adminName: 'Admin User',
        adminEmail: 'admin@test.com',
        targetUserId: 'user123',
        targetUserName: 'Target User',
        targetUserEmail: 'user@test.com',
        targetUserRole: 'user',
        startedAt: validStartDate,
      })
      expect(mockImpersonationRepo.endSession).not.toHaveBeenCalled()
    })
  })
})
