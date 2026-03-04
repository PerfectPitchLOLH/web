import { db } from '@/server/lib/database'

export type CreateImpersonationLogDTO = {
  impersonationSessionId: string
  action: string
  method: string
  path: string
  statusCode?: number | null
  requestBody?: string | null
  responseBody?: string | null
  ip?: string | null
  userAgent?: string | null
  duration?: number | null
}

export class ImpersonationLogRepository {
  async create(data: CreateImpersonationLogDTO) {
    return db.impersonationLog.create({
      data,
    })
  }

  async findBySessionId(sessionId: string) {
    return db.impersonationLog.findMany({
      where: {
        impersonationSessionId: sessionId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    })
  }

  async findBySessionIdPaginated(
    sessionId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      db.impersonationLog.findMany({
        where: {
          impersonationSessionId: sessionId,
        },
        orderBy: {
          timestamp: 'desc',
        },
        skip,
        take: limit,
      }),
      db.impersonationLog.count({
        where: {
          impersonationSessionId: sessionId,
        },
      }),
    ])

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  async getActionStats(sessionId: string) {
    const logs = await db.impersonationLog.findMany({
      where: {
        impersonationSessionId: sessionId,
      },
      select: {
        action: true,
        method: true,
        statusCode: true,
      },
    })

    const stats = {
      totalActions: logs.length,
      byMethod: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      successRate: 0,
    }

    let successCount = 0

    logs.forEach((log) => {
      stats.byMethod[log.method] = (stats.byMethod[log.method] || 0) + 1

      if (log.statusCode) {
        const statusCategory = `${Math.floor(log.statusCode / 100)}xx`
        stats.byStatus[statusCategory] =
          (stats.byStatus[statusCategory] || 0) + 1

        if (log.statusCode < 400) {
          successCount++
        }
      }
    })

    stats.successRate =
      stats.totalActions > 0 ? (successCount / stats.totalActions) * 100 : 0

    return stats
  }
}
