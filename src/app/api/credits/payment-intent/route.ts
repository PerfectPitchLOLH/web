import { NextRequest } from 'next/server'

import { creditService } from '@/server/domains/credit'
import { CreditController } from '@/server/domains/credit/credit.controller'
import { paymentService } from '@/server/domains/payment'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

const creditControllerWithPayment = new CreditController(
  creditService,
  paymentService,
)

export async function POST(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return creditControllerWithPayment.createBundlePurchaseCheckout(
    auth.session.user.id,
    auth.session.user.email,
    request,
  )
}
