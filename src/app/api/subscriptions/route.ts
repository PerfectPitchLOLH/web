import { NextRequest } from 'next/server'

import { subscriptionController } from '@/server/domains/subscription'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

export async function GET() {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse(
      'UNAUTHORIZED',
      undefined,
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  return subscriptionController.getUserSubscription(session.user.id)
}

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id || !session?.user?.email) {
    return createErrorResponse(
      'UNAUTHORIZED',
      undefined,
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  return subscriptionController.createCheckoutSession(
    session.user.id,
    session.user.email,
    request,
  )
}
