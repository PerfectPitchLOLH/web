import { NextRequest } from 'next/server'

import type { FeatureKey } from '@/server/domains/permission'
import { permissionService } from '@/server/domains/permission'
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
    const { searchParams } = request.nextUrl
    const feature = searchParams.get('feature') as FeatureKey
    const usageParam = searchParams.get('usage')

    if (!feature) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Le paramètre "feature" est requis',
        undefined,
        HTTP_STATUS.BAD_REQUEST,
      )
    }

    const usage = usageParam ? parseInt(usageParam, 10) : undefined
    const result = await permissionService.checkFeatureAccessForUser(
      auth.session.user.id,
      feature,
      usage,
    )

    return createSuccessResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
