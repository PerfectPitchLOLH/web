import type { AdminRepository } from '@/server/domains/admin/admin.repository'
import { auditLogger } from '@/server/shared/utils/audit.logger'

import { IMPERSONATION_ACTIONS } from './impersonation.constants'
import type {
  CreateImpersonationLogDTO,
  ImpersonationLogRepository,
} from './impersonation-log.repository'

const MAX_BODY_LENGTH = 5000

export class ImpersonationLogService {
  constructor(
    private repository: ImpersonationLogRepository,
    private adminRepository?: AdminRepository,
  ) {}

  async logAction(
    sessionId: string,
    adminId: string,
    targetUserId: string,
    data: {
      action: string
      method: string
      path: string
      statusCode?: number
      requestBody?: unknown
      responseBody?: unknown
      ip?: string | null
      userAgent?: string | null
      duration?: number
      adminName?: string
      targetUserName?: string
    },
  ) {
    const truncateBody = (body: unknown): string | null => {
      if (!body) return null
      try {
        const stringified = JSON.stringify(body)
        if (stringified.length > MAX_BODY_LENGTH) {
          return stringified.substring(0, MAX_BODY_LENGTH) + '... [truncated]'
        }
        return stringified
      } catch {
        return '[Non-serializable data]'
      }
    }

    const logData: CreateImpersonationLogDTO = {
      impersonationSessionId: sessionId,
      action: data.action,
      method: data.method,
      path: data.path,
      statusCode: data.statusCode ?? null,
      requestBody: truncateBody(data.requestBody),
      responseBody: truncateBody(data.responseBody),
      ip: data.ip ?? null,
      userAgent: data.userAgent ?? null,
      duration: data.duration ?? null,
    }

    await this.repository.create(logData)

    auditLogger.logImpersonationAction(
      adminId,
      targetUserId,
      data.action,
      data.method,
      data.path,
      data.statusCode ?? null,
      data.ip ?? null,
    )

    if (this.adminRepository) {
      await this.adminRepository.createAuditLog(
        adminId,
        data.adminName || 'Unknown Admin',
        IMPERSONATION_ACTIONS.ACTION,
        `user:${targetUserId}`,
        `${data.method} ${data.path} (${data.statusCode || 'unknown'}) as ${data.targetUserName || 'unknown user'}`,
        data.ip ?? null,
        data.userAgent ?? null,
      )
    }
  }

  async getSessionLogs(
    sessionId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    return this.repository.findBySessionIdPaginated(sessionId, page, limit)
  }

  async getSessionStats(sessionId: string) {
    return this.repository.getActionStats(sessionId)
  }
}
