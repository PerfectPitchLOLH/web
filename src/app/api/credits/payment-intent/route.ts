import { NextRequest } from 'next/server'

import { creditService } from '@/server/domains/credit'
import { CreditController } from '@/server/domains/credit/credit.controller'
import { paymentService } from '@/server/domains/payment'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

const creditControllerWithPayment = new CreditController(
  creditService,
  paymentService,
)

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

  return creditControllerWithPayment.createBundlePurchaseCheckout(
    session.user.id,
    session.user.email,
    request,
  )
}
