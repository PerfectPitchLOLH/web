import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { ApiError } from '@/server/shared/utils/api.utils'

import type { AdminRepository } from '../admin/admin.repository'
import type { UserRepository } from '../user/user.repository'
import {
  IMPERSONATION_ACTIONS,
  MAX_SESSION_DURATION_MS,
} from './impersonation.constants'
import type { ImpersonationRepository } from './impersonation.repository'
import type {
  ActiveImpersonationInfo,
  CreateImpersonationSessionDTO,
  ImpersonationSessionEntity,
} from './impersonation.types'

export class ImpersonationService {
  constructor(
    private repository: ImpersonationRepository,
    private userRepository: UserRepository,
    private adminRepository: AdminRepository,
  ) {}

  async startImpersonation(
    adminId: string,
    targetUserId: string,
    ip: string | null,
    userAgent: string | null,
  ): Promise<ImpersonationSessionEntity> {
    const admin = await this.userRepository.findById(adminId)
    if (!admin) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Admin user not found',
      )
    }

    if (admin.role !== 'admin') {
      throw new ApiError(
        'FORBIDDEN',
        HTTP_STATUS.FORBIDDEN,
        'Only administrators can impersonate users',
      )
    }

    const targetUser = await this.userRepository.findById(targetUserId)
    if (!targetUser) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Target user not found',
      )
    }

    if (targetUser.role === 'admin') {
      throw new ApiError(
        'FORBIDDEN',
        HTTP_STATUS.FORBIDDEN,
        'Cannot impersonate another administrator',
      )
    }

    if (adminId === targetUserId) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'Cannot impersonate yourself',
      )
    }

    await this.repository.endAllActiveSessionsForAdmin(adminId)

    const sessionData: CreateImpersonationSessionDTO = {
      adminId,
      targetUserId,
      ip,
      userAgent,
    }

    const session = await this.repository.create(sessionData)

    await this.adminRepository.createAuditLog(
      adminId,
      admin.name || admin.email,
      IMPERSONATION_ACTIONS.STARTED,
      `user:${targetUserId}`,
      `Started impersonating ${targetUser.name || targetUser.email}`,
      ip,
      userAgent,
    )

    return session
  }

  async getActiveImpersonation(
    adminId: string,
  ): Promise<ActiveImpersonationInfo | null> {
    const session = await this.repository.findActiveByAdminId(adminId)

    if (!session) {
      return null
    }

    const sessionAge = Date.now() - session.startedAt.getTime()
    if (sessionAge > MAX_SESSION_DURATION_MS) {
      await this.repository.endSession(session.id)
      return null
    }

    return {
      sessionId: session.id,
      adminId: session.adminId,
      adminName: session.admin.name,
      adminEmail: session.admin.email,
      targetUserId: session.targetUserId,
      targetUserName: session.targetUser.name,
      targetUserEmail: session.targetUser.email,
      targetUserRole: session.targetUser.role,
      startedAt: session.startedAt,
    }
  }

  async endImpersonation(
    sessionId: string,
    ip: string | null = null,
  ): Promise<void> {
    const session = await this.repository.findById(sessionId)

    if (!session) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Impersonation session not found',
      )
    }

    if (!session.isActive) {
      throw new ApiError(
        'VALIDATION_ERROR',
        HTTP_STATUS.BAD_REQUEST,
        'Session is already ended',
      )
    }

    await this.repository.endSession(sessionId)

    await this.adminRepository.createAuditLog(
      session.adminId,
      session.admin.name || session.admin.email,
      IMPERSONATION_ACTIONS.ENDED,
      `user:${session.targetUserId}`,
      `Ended impersonation of ${session.targetUser.name || session.targetUser.email}`,
      ip,
      null,
    )
  }

  async validateImpersonationSession(
    sessionId: string,
  ): Promise<ActiveImpersonationInfo> {
    const session = await this.repository.findById(sessionId)

    if (!session) {
      throw new ApiError(
        'NOT_FOUND',
        HTTP_STATUS.NOT_FOUND,
        'Impersonation session not found',
      )
    }

    if (!session.isActive) {
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED,
        'Impersonation session has ended',
      )
    }

    const sessionAge = Date.now() - session.startedAt.getTime()
    if (sessionAge > MAX_SESSION_DURATION_MS) {
      await this.repository.endSession(sessionId)
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED,
        'Impersonation session has expired',
      )
    }

    const activeSession = await this.repository.findActiveByAdminId(
      session.adminId,
    )

    if (!activeSession) {
      throw new ApiError(
        'UNAUTHORIZED',
        HTTP_STATUS.UNAUTHORIZED,
        'No active impersonation session found',
      )
    }

    return {
      sessionId: activeSession.id,
      adminId: activeSession.adminId,
      adminName: activeSession.admin.name,
      adminEmail: activeSession.admin.email,
      targetUserId: activeSession.targetUserId,
      targetUserName: activeSession.targetUser.name,
      targetUserEmail: activeSession.targetUser.email,
      targetUserRole: activeSession.targetUser.role,
      startedAt: activeSession.startedAt,
    }
  }
}
