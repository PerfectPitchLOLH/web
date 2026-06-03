import { NextRequest } from 'next/server'

import { creditController } from '@/server/domains/credit'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'
import { requireActiveSubscription } from '@/server/shared/middleware/subscription.middleware'

export async function GET(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response

  const subscriptionError = await requireActiveSubscription(request)
  if (subscriptionError) return subscriptionError

  return creditController.getBundles()
}
