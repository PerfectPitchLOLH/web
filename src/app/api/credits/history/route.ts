import { NextRequest } from 'next/server'

import { creditController } from '@/server/domains/credit'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'

export async function GET(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  return creditController.getTransactionHistory(auth.session.user.id, request)
}
