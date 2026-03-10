import { NextRequest, NextResponse } from 'next/server'

import type { FeatureKey } from '@/server/domains/permission'
import { permissionService } from '@/server/domains/permission'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        createErrorResponse(
          'UNAUTHORIZED',
          'Non authentifié',
          undefined,
          HTTP_STATUS.UNAUTHORIZED,
        ),
        { status: HTTP_STATUS.UNAUTHORIZED },
      )
    }

    const { searchParams } = request.nextUrl
    const feature = searchParams.get('feature') as FeatureKey
    const usageParam = searchParams.get('usage')

    if (!feature) {
      return NextResponse.json(
        createErrorResponse(
          'VALIDATION_ERROR',
          'Le paramètre "feature" est requis',
          undefined,
          HTTP_STATUS.BAD_REQUEST,
        ),
        { status: HTTP_STATUS.BAD_REQUEST },
      )
    }

    const usage = usageParam ? parseInt(usageParam, 10) : undefined

    const result = await permissionService.checkFeatureAccessForUser(
      session.user.id,
      feature,
      usage,
    )

    return NextResponse.json(createSuccessResponse(result))
  } catch (error) {
    return handleApiError(error)
  }
}
