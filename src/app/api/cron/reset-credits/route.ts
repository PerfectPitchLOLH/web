import { NextRequest } from 'next/server'

import { creditRepository, creditService } from '@/server/domains/credit'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET) {
    return createErrorResponse(
      'CONFIGURATION_ERROR',
      'CRON_SECRET not configured',
      undefined,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    )
  }

  if (authHeader !== expectedAuth) {
    return createErrorResponse(
      'UNAUTHORIZED',
      'Non autorisé',
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  try {
    const creditsToRefill =
      await creditRepository.findUsersNeedingMonthlyRefill()
    const userIds = creditsToRefill.map((c) => c.userId)

    if (userIds.length === 0) {
      return createSuccessResponse({
        processed: 0,
        success: 0,
        failed: 0,
        message: 'No users need credit refill at this time',
      })
    }

    const result = await creditService.batchRefillMonthlyCredits(userIds)

    return createSuccessResponse({
      processed: userIds.length,
      success: result.success,
      failed: result.failed,
      errors: result.errors,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
