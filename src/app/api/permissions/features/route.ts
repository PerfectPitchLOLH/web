import { NextRequest } from 'next/server'

import { permissionService } from '@/server/domains/permission'
import { validateApiAuth } from '@/server/shared/middleware/auth.middleware'
import {
  createSuccessResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

export async function GET(request: NextRequest) {
  const auth = await validateApiAuth(request)
  if (!auth.ok) return auth.response

  try {
    const features = await permissionService.getAvailableFeatures(
      auth.session.user.id,
    )
    return createSuccessResponse(features)
  } catch (error) {
    return handleApiError(error)
  }
}
