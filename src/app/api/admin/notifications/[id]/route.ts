import type { NextRequest } from 'next/server'

import { notificationAdminController } from '@/server/domains/notification'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await auth()

  if (!session?.user || session.user.role !== 'admin') {
    return createErrorResponse(
      'FORBIDDEN',
      'Admin access required',
      undefined,
      HTTP_STATUS.FORBIDDEN,
    )
  }

  const { id } = await context.params

  return notificationAdminController.deleteNotification(id)
}
