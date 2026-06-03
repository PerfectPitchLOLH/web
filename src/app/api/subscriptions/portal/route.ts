import { NextRequest } from 'next/server'

import { subscriptionController } from '@/server/domains/subscription'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export async function POST(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return subscriptionController.createPortalSession(
    auth.session.user.id,
    request,
  )
}
