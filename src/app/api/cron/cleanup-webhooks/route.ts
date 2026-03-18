import { NextRequest } from 'next/server'

import { subscriptionRepository } from '@/server/domains/subscription'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
} from '@/server/shared/utils/api.utils'

const TTL_HOURS = 72

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
    const deleted =
      await subscriptionRepository.deleteOldWebhookEvents(TTL_HOURS)

    return createSuccessResponse({
      deleted,
      ttlHours: TTL_HOURS,
    })
  } catch (error) {
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Erreur lors du nettoyage des webhooks',
      { error: error instanceof Error ? error.message : 'Unknown error' },
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    )
  }
}
