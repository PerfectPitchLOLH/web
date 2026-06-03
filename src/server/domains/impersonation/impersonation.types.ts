import type { ImpersonationSession as PrismaImpersonationSession } from '@prisma/client'

export type ImpersonationSessionEntity = PrismaImpersonationSession

export type CreateImpersonationSessionDTO = {
  adminId: string
  targetUserId: string
  ip: string | null
  userAgent: string | null
}

export type ImpersonationSessionWithUsers = ImpersonationSessionEntity & {
  admin: {
    id: string
    name: string
    email: string
  }
  targetUser: {
    id: string
    name: string
    email: string
    role: string
  }
}

export type ActiveImpersonationInfo = {
  sessionId: string
  adminId: string
  adminName: string
  adminEmail: string
  targetUserId: string
  targetUserName: string
  targetUserEmail: string
  targetUserRole: string
  startedAt: Date
}
