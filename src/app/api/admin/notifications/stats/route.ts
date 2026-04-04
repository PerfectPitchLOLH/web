import { NextRequest } from 'next/server'

import { notificationAdminController } from '@/server/domains/notification'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response
  if (auth.session.user.role !== 'admin') {
    return createErrorResponse(
      'FORBIDDEN',
      undefined,
      undefined,
      HTTP_STATUS.FORBIDDEN,
    )
  }
  return notificationAdminController.getStats(request)
}
