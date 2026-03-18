import { auth } from '@/server/lib/auth'
import { db } from '@/server/lib/database'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
} from '@/server/shared/utils'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Not authenticated',
        null,
        HTTP_STATUS.UNAUTHORIZED,
      )
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
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
        null,
        HTTP_STATUS.NOT_FOUND,
      )
    }

    return createSuccessResponse(user, HTTP_STATUS.OK)
  } catch {
    return createErrorResponse(
      'INTERNAL_ERROR',
      'Failed to fetch user',
      null,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    )
  }
}
