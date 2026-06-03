import { db } from '@/server/lib/database'

import type {
  CreateImpersonationSessionDTO,
  ImpersonationSessionEntity,
  ImpersonationSessionWithUsers,
} from './impersonation.types'

export class ImpersonationRepository {
  async create(
    data: CreateImpersonationSessionDTO,
  ): Promise<ImpersonationSessionEntity> {
    return db.impersonationSession.create({
      data,
    })
  }

  async findActiveByAdminId(
    adminId: string,
  ): Promise<ImpersonationSessionWithUsers | null> {
    return db.impersonationSession.findFirst({
      where: {
        adminId,
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
  }

  async findById(id: string): Promise<ImpersonationSessionWithUsers | null> {
    return db.impersonationSession.findUnique({
      where: { id },
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
  }

  async endSession(sessionId: string): Promise<ImpersonationSessionEntity> {
    return db.impersonationSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        isActive: false,
      },
    })
  }

  async endAllActiveSessionsForAdmin(
    adminId: string,
  ): Promise<{ count: number }> {
    return db.impersonationSession.updateMany({
      where: {
        adminId,
        isActive: true,
      },
      data: {
        endedAt: new Date(),
        isActive: false,
      },
    })
  }

  async countActiveSessions(adminId: string): Promise<number> {
    return db.impersonationSession.count({
      where: {
        adminId,
        isActive: true,
      },
    })
  }
}
