import { NextRequest } from 'next/server'

import { auth } from '@/server/lib/auth'
import { db } from '@/server/lib/database'
import {
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

export async function GET(_request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== 'admin') {
      return new Response('Unauthorized', { status: 401 })
    }

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
