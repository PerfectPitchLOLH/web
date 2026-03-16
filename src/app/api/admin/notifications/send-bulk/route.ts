import { NextRequest } from 'next/server'

import { notificationAdminController } from '@/server/domains/notification'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'admin') {
    return createErrorResponse(
      'UNAUTHORIZED',
      'Accès non autorisé',
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  return notificationAdminController.sendBulkNotification(request)
}
