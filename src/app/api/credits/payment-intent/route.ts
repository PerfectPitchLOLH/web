import { NextRequest } from 'next/server'

import { initializeCreditController } from '@/server/domains/credit'
import { paymentService } from '@/server/domains/payment'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

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

  const creditController = initializeCreditController(paymentService)

  return creditController.createBundlePurchaseIntent(
    session.user.id,
    session.user.email,
    request,
  )
}
