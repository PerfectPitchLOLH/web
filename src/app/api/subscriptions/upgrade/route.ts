import { NextRequest } from 'next/server'

import { subscriptionController } from '@/server/domains/subscription'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export async function PATCH(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return subscriptionController.upgradeSubscription(
    auth.session.user.id,
    request,
  )
}
