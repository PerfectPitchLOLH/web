import { timingSafeEqual } from 'crypto'
import { NextRequest } from 'next/server'

import { transcriptionController } from '@/server/domains/transcription'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

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

  if (!authHeader || !safeEqual(authHeader, expectedAuth)) {
    return createErrorResponse(
      'UNAUTHORIZED',
      'Non autorisé',
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  return transcriptionController.reconcileActiveJobs()
}
