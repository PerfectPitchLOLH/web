import { NextRequest } from 'next/server'

import { db } from '@/server/lib/database'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

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

  try {
    const plans = await db.subscriptionPlan.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    })

    return createSuccessResponse(plans)
  } catch (error) {
    return handleApiError(error)
  }
}
