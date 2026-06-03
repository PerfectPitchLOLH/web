import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ImpersonationRepository } from '../impersonation.repository'

vi.mock('@/server/lib/database', () => ({
  db: {
    impersonationSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { db } from '@/server/lib/database'

describe('ImpersonationRepository', () => {
  let repository: ImpersonationRepository

  beforeEach(() => {
    repository = new ImpersonationRepository()
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create new impersonation session', async () => {
      const createData = {
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }

      const mockSession = {
        id: 'session123',
        ...createData,
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(db.impersonationSession.create).mockResolvedValue(mockSession)

      const result = await repository.create(createData)

      expect(result).toEqual(mockSession)
      expect(db.impersonationSession.create).toHaveBeenCalledWith({
        data: createData,
      })
    })

    it('should create session with null ip and userAgent', async () => {
      const createData = {
        adminId: 'admin123',
        targetUserId: 'user123',
        ip: null,
        userAgent: null,
      }

      const mockSession = {
        id: 'session123',
        ...createData,
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
      }

      vi.mocked(db.impersonationSession.create).mockResolvedValue(mockSession)

      const result = await repository.create(createData)

      expect(result).toEqual(mockSession)
      expect(db.impersonationSession.create).toHaveBeenCalledWith({
        data: createData,
      })
    })
  })

  describe('findActiveByAdminId', () => {
    it('should return active session with user details', async () => {
      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
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

      vi.mocked(db.impersonationSession.findFirst).mockResolvedValue(
        mockSession,
      )

      const result = await repository.findActiveByAdminId('admin123')

      expect(result).toEqual(mockSession)
      expect(db.impersonationSession.findFirst).toHaveBeenCalledWith({
        where: {
          adminId: 'admin123',
          isActive: true,
        },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })
    })

    it('should return null when no active session exists', async () => {
      vi.mocked(db.impersonationSession.findFirst).mockResolvedValue(null)

      const result = await repository.findActiveByAdminId('admin123')

      expect(result).toBeNull()
      expect(db.impersonationSession.findFirst).toHaveBeenCalledWith({
        where: {
          adminId: 'admin123',
          isActive: true,
        },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })
    })
  })

  describe('findById', () => {
    it('should return session by id', async () => {
      const mockSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        startedAt: new Date(),
        endedAt: null,
        isActive: true,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
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

      vi.mocked(db.impersonationSession.findUnique).mockResolvedValue(
        mockSession,
      )

      const result = await repository.findById('session123')

      expect(result).toEqual(mockSession)
      expect(db.impersonationSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'session123' },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })
    })

    it('should return null when session not found', async () => {
      vi.mocked(db.impersonationSession.findUnique).mockResolvedValue(null)

      const result = await repository.findById('nonexistent')

      expect(result).toBeNull()
      expect(db.impersonationSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      })
    })
  })

  describe('endSession', () => {
    it('should end session and set endedAt and isActive', async () => {
      const endedAt = new Date()
      const mockUpdatedSession = {
        id: 'session123',
        adminId: 'admin123',
        targetUserId: 'user123',
        startedAt: new Date(),
        endedAt,
        isActive: false,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      }

      vi.mocked(db.impersonationSession.update).mockResolvedValue(
        mockUpdatedSession,
      )

      const result = await repository.endSession('session123')

      expect(result).toEqual(mockUpdatedSession)
      expect(result.isActive).toBe(false)
      expect(result.endedAt).toBeDefined()
      expect(db.impersonationSession.update).toHaveBeenCalledWith({
        where: { id: 'session123' },
        data: {
          endedAt: expect.any(Date),
          isActive: false,
        },
      })
    })
  })

  describe('endAllActiveSessionsForAdmin', () => {
    it('should end all active sessions for admin', async () => {
      const mockResult = { count: 3 }

      vi.mocked(db.impersonationSession.updateMany).mockResolvedValue(
        mockResult,
      )

      const result = await repository.endAllActiveSessionsForAdmin('admin123')

      expect(result).toEqual({ count: 3 })
      expect(db.impersonationSession.updateMany).toHaveBeenCalledWith({
        where: {
          adminId: 'admin123',
          isActive: true,
        },
        data: {
          endedAt: expect.any(Date),
          isActive: false,
        },
      })
    })

    it('should return zero count when no active sessions exist', async () => {
      const mockResult = { count: 0 }

      vi.mocked(db.impersonationSession.updateMany).mockResolvedValue(
        mockResult,
      )

      const result = await repository.endAllActiveSessionsForAdmin('admin123')

      expect(result).toEqual({ count: 0 })
    })
  })

  describe('countActiveSessions', () => {
    it('should count active sessions for admin', async () => {
      vi.mocked(db.impersonationSession.count).mockResolvedValue(2)

      const result = await repository.countActiveSessions('admin123')

      expect(result).toBe(2)
      expect(db.impersonationSession.count).toHaveBeenCalledWith({
        where: {
          adminId: 'admin123',
          isActive: true,
        },
      })
    })

    it('should return zero when no active sessions exist', async () => {
      vi.mocked(db.impersonationSession.count).mockResolvedValue(0)

      const result = await repository.countActiveSessions('admin123')

      expect(result).toBe(0)
    })
  })
})
