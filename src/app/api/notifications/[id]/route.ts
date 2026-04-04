import { NextRequest } from 'next/server'

import { notificationController } from '@/server/domains/notification'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  const { id } = await context.params
  return notificationController.getNotificationById(id, auth.session.user.id)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  const { id } = await context.params
  const action = request.nextUrl.searchParams.get('action')

  if (action === 'mark-read') {
    return notificationController.markAsRead(id, auth.session.user.id)
  }

  return notificationController.updateNotification(
    id,
    auth.session.user.id,
    request,
  )
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  const { id } = await context.params
  return notificationController.deleteNotification(id, auth.session.user.id)
}
