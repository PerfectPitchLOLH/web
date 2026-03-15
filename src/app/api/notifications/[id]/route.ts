import { NextRequest } from 'next/server'

import { notificationController } from '@/server/domains/notification'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse(
      'UNAUTHORIZED',
      undefined,
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  const { id } = await context.params

  return notificationController.getNotificationById(id, session.user.id)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse(
      'UNAUTHORIZED',
      undefined,
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  const { id } = await context.params
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  if (action === 'mark-read') {
    return notificationController.markAsRead(id, session.user.id)
  }

  return notificationController.updateNotification(id, session.user.id, request)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse(
      'UNAUTHORIZED',
      undefined,
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  const { id } = await context.params

  return notificationController.deleteNotification(id, session.user.id)
}
