import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { AdminRepository } from '../../admin/admin.repository'
import { createMockUser } from '../../user/__tests__/test-utils'
import type { UserRepository } from '../../user/user.repository'
import { MAX_SESSION_DURATION_MS } from '../impersonation.constants'
import type { ImpersonationRepository } from '../impersonation.repository'
import { ImpersonationService } from '../impersonation.service'

vi.mock('@/server/lib/database')

describe('ImpersonationService - Deep Tests', () => {
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
      countActiveSessions: vi.fn(),
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

  describe('Validation Edge Cases - startImpersonation', () => {
    it('should reject empty string adminId', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null)

      await expect(
        service.startImpersonation('', 'user123', null, null),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: 'Admin user not found',
      })
    })

    it('should reject very long adminId (>1000 chars)', async () => {
      const longId = 'c' + 'a'.repeat(1000)

      vi.mocked(mockUserRepo.findById).mockResolvedValue(null)

      await expect(
        service.startImpersonation(longId, 'user123', null, null),
      ).rejects.toThrow(ApiError)
    })

    it('should reject empty string targetUserId', async () => {
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
        service.startImpersonation('admin123', '', null, null),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: 'Target user not found',
      })
    })

    it('should accept null IP and userAgent', async () => {
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
        ip: null,
        userAgent: null,
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(targetUser)

      vi.mocked(
        mockImpersonationRepo.endAllActiveSessionsForAdmin,
      ).mockResolvedValue({ count: 0 })

      vi.mocked(mockImpersonationRepo.create).mockResolvedValue(mockSession)

      const result = await service.startImpersonation(
        'admin123',
        'user123',
        null,
        null,
      )

      expect(result.ip).toBeNull()
      expect(result.userAgent).toBeNull()
    })

    it('should handle extremely long IP address (IPv6 + port)', async () => {
      const longIpv6 =
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334:2001:0db8:85a3:0000:0000:8a2e:0370:7334:8080'

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
        ip: longIpv6,
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
      ).mockResolvedValue({ count: 0 })

      vi.mocked(mockImpersonationRepo.create).mockResolvedValue(mockSession)

      const result = await service.startImpersonation(
        'admin123',
        'user123',
        longIpv6,
        'Mozilla/5.0',
      )

      expect(result.ip).toBe(longIpv6)
    })

    it('should handle extremely long user agent (>10000 chars)', async () => {
      const longUserAgent = 'Mozilla/5.0 ' + 'a'.repeat(10000)

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
        userAgent: longUserAgent,
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(targetUser)

      vi.mocked(
        mockImpersonationRepo.endAllActiveSessionsForAdmin,
      ).mockResolvedValue({ count: 0 })

      vi.mocked(mockImpersonationRepo.create).mockResolvedValue(mockSession)

      const result = await service.startImpersonation(
        'admin123',
        'user123',
        '192.168.1.1',
        longUserAgent,
      )

      expect(result.userAgent).toBe(longUserAgent)
    })

    it('should reject malformed IP address with injection attempt', async () => {
      const maliciousIp = "192.168.1.1'; DROP TABLE users; --"

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
        ip: maliciousIp,
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
      ).mockResolvedValue({ count: 0 })

      vi.mocked(mockImpersonationRepo.create).mockResolvedValue(mockSession)

      const result = await service.startImpersonation(
        'admin123',
        'user123',
        maliciousIp,
        'Mozilla/5.0',
      )

      expect(result).toBeDefined()
    })

    it('should handle user agent with XSS attempt', async () => {
      const xssUserAgent = '<script>alert("XSS")</script>'

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
        userAgent: xssUserAgent,
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(targetUser)

      vi.mocked(
        mockImpersonationRepo.endAllActiveSessionsForAdmin,
      ).mockResolvedValue({ count: 0 })

      vi.mocked(mockImpersonationRepo.create).mockResolvedValue(mockSession)

      const result = await service.startImpersonation(
        'admin123',
        'user123',
        '192.168.1.1',
        xssUserAgent,
      )

      expect(result.userAgent).toBe(xssUserAgent)
    })
  })

  describe('Business Logic Edge Cases', () => {
    it('should correctly end multiple active sessions for same admin', async () => {
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
      ).mockResolvedValue({ count: 5 })

      vi.mocked(mockImpersonationRepo.create).mockResolvedValue(mockSession)

      await service.startImpersonation(
        'admin123',
        'user123',
        '192.168.1.1',
        'Mozilla/5.0',
      )

      expect(
        mockImpersonationRepo.endAllActiveSessionsForAdmin,
      ).toHaveBeenCalledWith('admin123')
    })

    it('should create audit log even if previous sessions end fails', async () => {
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

      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(targetUser)

      vi.mocked(
        mockImpersonationRepo.endAllActiveSessionsForAdmin,
      ).mockRejectedValue(new Error('Database error'))

      await expect(
        service.startImpersonation(
          'admin123',
          'user123',
          '192.168.1.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow('Database error')
    })

    it('should rollback if session creation fails after ending previous sessions', async () => {
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

      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(targetUser)

      vi.mocked(
        mockImpersonationRepo.endAllActiveSessionsForAdmin,
      ).mockResolvedValue({ count: 2 })

      vi.mocked(mockImpersonationRepo.create).mockRejectedValue(
        new Error('Failed to create session'),
      )

      await expect(
        service.startImpersonation(
          'admin123',
          'user123',
          '192.168.1.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow('Failed to create session')
    })

    it('should handle admin with no name (null name)', async () => {
      const adminUser = createMockUser({
        id: 'admin123',
        email: 'admin@test.com',
        name: null as any,
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
      ).mockResolvedValue({ count: 0 })

      vi.mocked(mockImpersonationRepo.create).mockResolvedValue(mockSession)

      await service.startImpersonation(
        'admin123',
        'user123',
        '192.168.1.1',
        'Mozilla/5.0',
      )

      expect(mockAdminRepo.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'admin@test.com',
        'impersonation_started',
        'user:user123',
        expect.stringContaining('Target User'),
        '192.168.1.1',
        'Mozilla/5.0',
      )
    })

    it('should handle target user with no name (null name)', async () => {
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
        name: null as any,
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
      ).mockResolvedValue({ count: 0 })

      vi.mocked(mockImpersonationRepo.create).mockResolvedValue(mockSession)

      await service.startImpersonation(
        'admin123',
        'user123',
        '192.168.1.1',
        'Mozilla/5.0',
      )

      expect(mockAdminRepo.createAuditLog).toHaveBeenCalledWith(
        'admin123',
        'Admin User',
        'impersonation_started',
        'user:user123',
        expect.stringContaining('user@test.com'),
        '192.168.1.1',
        'Mozilla/5.0',
      )
    })
  })

  describe('Session Timeout - Edge Cases', () => {
    it('should end session exactly at MAX_SESSION_DURATION_MS', async () => {
      const startedAt = new Date(Date.now() - MAX_SESSION_DURATION_MS)

      const session = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt,
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
        session,
      )

      vi.mocked(mockImpersonationRepo.endSession).mockResolvedValue({
        ...session,
        endedAt: new Date(),
        isActive: false,
      })

      const result = await service.getActiveImpersonation('admin123')

      expect(result).toBeNull()
      expect(mockImpersonationRepo.endSession).toHaveBeenCalledWith(
        'session123',
      )
    })

    it('should NOT end session just before MAX_SESSION_DURATION_MS', async () => {
      const startedAt = new Date(Date.now() - MAX_SESSION_DURATION_MS + 1000)

      const session = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt,
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
        session,
      )

      const result = await service.getActiveImpersonation('admin123')

      expect(result).not.toBeNull()
      expect(result?.sessionId).toBe('session123')
      expect(mockImpersonationRepo.endSession).not.toHaveBeenCalled()
    })

    it('should end session far beyond MAX_SESSION_DURATION_MS (hours old)', async () => {
      const startedAt = new Date(Date.now() - MAX_SESSION_DURATION_MS * 10)

      const session = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt,
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
        session,
      )

      vi.mocked(mockImpersonationRepo.endSession).mockResolvedValue({
        ...session,
        endedAt: new Date(),
        isActive: false,
      })

      const result = await service.getActiveImpersonation('admin123')

      expect(result).toBeNull()
      expect(mockImpersonationRepo.endSession).toHaveBeenCalled()
    })

    it('should return null if no active session exists', async () => {
      vi.mocked(mockImpersonationRepo.findActiveByAdminId).mockResolvedValue(
        null,
      )

      const result = await service.getActiveImpersonation('admin123')

      expect(result).toBeNull()
      expect(mockImpersonationRepo.endSession).not.toHaveBeenCalled()
    })
  })

  describe('validateImpersonationSession - Deep Tests', () => {
    it('should reject non-existent session', async () => {
      vi.mocked(mockImpersonationRepo.findById).mockResolvedValue(null)

      await expect(
        service.validateImpersonationSession('nonexistent'),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: HTTP_STATUS.NOT_FOUND,
        message: 'Impersonation session not found',
      })
    })

    it('should reject inactive session', async () => {
      const inactiveSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(Date.now() - 5 * 60 * 1000),
        endedAt: new Date(),
        isActive: false,
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

      vi.mocked(mockImpersonationRepo.findById).mockResolvedValue(
        inactiveSession,
      )

      await expect(
        service.validateImpersonationSession('session123'),
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Impersonation session has ended',
      })
    })

    it('should reject expired session and end it', async () => {
      const expiredSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(Date.now() - MAX_SESSION_DURATION_MS - 1000),
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

      vi.mocked(mockImpersonationRepo.findById).mockResolvedValue(
        expiredSession,
      )

      vi.mocked(mockImpersonationRepo.endSession).mockResolvedValue({
        ...expiredSession,
        endedAt: new Date(),
        isActive: false,
      })

      await expect(
        service.validateImpersonationSession('session123'),
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'Impersonation session has expired',
      })

      expect(mockImpersonationRepo.endSession).toHaveBeenCalledWith(
        'session123',
      )
    })

    it('should reject if no active session found by adminId after validation', async () => {
      const session = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(Date.now() - 5 * 60 * 1000),
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

      vi.mocked(mockImpersonationRepo.findById).mockResolvedValue(session)
      vi.mocked(mockImpersonationRepo.findActiveByAdminId).mockResolvedValue(
        null,
      )

      await expect(
        service.validateImpersonationSession('session123'),
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'No active impersonation session found',
      })
    })

    it('should successfully validate active session', async () => {
      const session = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        startedAt: new Date(Date.now() - 5 * 60 * 1000),
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

      vi.mocked(mockImpersonationRepo.findById).mockResolvedValue(session)
      vi.mocked(mockImpersonationRepo.findActiveByAdminId).mockResolvedValue(
        session,
      )

      const result = await service.validateImpersonationSession('session123')

      expect(result).toMatchObject({
        sessionId: 'session123',
        adminId: 'admin123',
        adminName: 'Admin User',
        adminEmail: 'admin@test.com',
        targetUserId: 'user123',
        targetUserName: 'Target User',
        targetUserEmail: 'user@test.com',
        targetUserRole: 'user',
      })
    })
  })

  describe('Race Conditions and Concurrency', () => {
    it('should handle concurrent startImpersonation calls for same admin', async () => {
      const adminUser = createMockUser({
        id: 'admin123',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        isRootAdmin: true,
        emailVerified: new Date(),
      })

      const targetUser1 = createMockUser({
        id: 'user1',
        email: 'user1@test.com',
        name: 'User 1',
        role: 'user',
        emailVerified: new Date(),
      })

      const targetUser2 = createMockUser({
        id: 'user2',
        email: 'user2@test.com',
        name: 'User 2',
        role: 'user',
        emailVerified: new Date(),
      })

      vi.mocked(mockUserRepo.findById).mockImplementation(
        async (id: string) => {
          if (id === 'admin123') return adminUser
          if (id === 'user1') return targetUser1
          if (id === 'user2') return targetUser2
          return null
        },
      )

      vi.mocked(
        mockImpersonationRepo.endAllActiveSessionsForAdmin,
      ).mockResolvedValue({ count: 0 })

      vi.mocked(mockImpersonationRepo.create)
        .mockResolvedValueOnce({
          id: 'session1',
          adminId: 'admin123',
          targetUserId: 'user1',
          ip: null,
          userAgent: null,
          startedAt: new Date(),
          endedAt: null,
          isActive: true,
        })
        .mockResolvedValueOnce({
          id: 'session2',
          adminId: 'admin123',
          targetUserId: 'user2',
          ip: null,
          userAgent: null,
          startedAt: new Date(),
          endedAt: null,
          isActive: true,
        })

      const promise1 = service.startImpersonation(
        'admin123',
        'user1',
        null,
        null,
      )
      const promise2 = service.startImpersonation(
        'admin123',
        'user2',
        null,
        null,
      )

      const [result1, result2] = await Promise.all([promise1, promise2])

      expect(result1.targetUserId).toBe('user1')
      expect(result2.targetUserId).toBe('user2')
    })

    it('should handle concurrent endImpersonation calls for same session', async () => {
      const session = {
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

      vi.mocked(mockImpersonationRepo.findById)
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce({
          ...session,
          isActive: false,
          endedAt: new Date(),
        })

      vi.mocked(mockImpersonationRepo.endSession).mockResolvedValue({
        ...session,
        endedAt: new Date(),
        isActive: false,
      })

      const promise1 = service.endImpersonation('session123')
      const promise2 = service.endImpersonation('session123')

      const results = await Promise.allSettled([promise1, promise2])

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
    })
  })

  describe('Idempotence', () => {
    it('should be idempotent for endImpersonation on already ended session', async () => {
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

      vi.mocked(mockImpersonationRepo.findById).mockResolvedValue(
        inactiveSession,
      )

      await expect(service.endImpersonation('session123')).rejects.toThrow(
        ApiError,
      )

      expect(mockImpersonationRepo.endSession).not.toHaveBeenCalled()
    })
  })

  describe('Error Recovery', () => {
    it('should handle database error during session creation', async () => {
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

      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(targetUser)

      vi.mocked(
        mockImpersonationRepo.endAllActiveSessionsForAdmin,
      ).mockResolvedValue({ count: 0 })

      vi.mocked(mockImpersonationRepo.create).mockRejectedValue(
        new Error('Database connection lost'),
      )

      await expect(
        service.startImpersonation(
          'admin123',
          'user123',
          '192.168.1.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow('Database connection lost')
    })

    it('should handle audit log creation failure gracefully', async () => {
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
      ).mockResolvedValue({ count: 0 })

      vi.mocked(mockImpersonationRepo.create).mockResolvedValue(mockSession)

      vi.mocked(mockAdminRepo.createAuditLog).mockRejectedValue(
        new Error('Audit log service unavailable'),
      )

      await expect(
        service.startImpersonation(
          'admin123',
          'user123',
          '192.168.1.1',
          'Mozilla/5.0',
        ),
      ).rejects.toThrow('Audit log service unavailable')
    })
  })
})
