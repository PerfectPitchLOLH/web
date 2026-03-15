import { NextRequest } from 'next/server'

import { creditController } from '@/server/domains/credit'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return createErrorResponse(
      'UNAUTHORIZED',
      undefined,
      undefined,
      HTTP_STATUS.UNAUTHORIZED,
    )
  }

  return creditController.getTransactionHistory(session.user.id, request)
}
