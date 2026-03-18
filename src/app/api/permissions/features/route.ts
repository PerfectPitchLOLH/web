import { NextRequest, NextResponse } from 'next/server'

import { permissionService } from '@/server/domains/permission'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

export async function GET(_request: NextRequest) {
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

    const features = await permissionService.getAvailableFeatures(
      session.user.id,
    )

    return NextResponse.json(createSuccessResponse(features))
  } catch (error) {
    return handleApiError(error)
  }
}
