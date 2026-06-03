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

  try {
    const user = await db.user.findUnique({
      where: { email: auth.session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isRootAdmin: true,
        image: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return createErrorResponse(
        'NOT_FOUND',
        'User not found',
        undefined,
        HTTP_STATUS.NOT_FOUND,
      )
    }

    return createSuccessResponse(user)
  } catch (error) {
    return handleApiError(error)
  }
}
