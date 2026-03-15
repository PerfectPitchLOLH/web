import { notificationController } from '@/server/domains/notification'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

export async function POST() {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse(
      'UNAUTHORIZED',
      undefined,
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  return notificationController.markAllAsRead(session.user.id)
}
