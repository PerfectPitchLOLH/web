import { NextRequest } from 'next/server'

import { notificationController } from '@/server/domains/notification'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export async function POST(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return notificationController.markAllAsRead(auth.session.user.id)
}
