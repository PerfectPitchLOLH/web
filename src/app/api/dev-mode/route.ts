import { NextRequest } from 'next/server'

import { devModeController } from '@/server/domains/dev-mode'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import {
  createErrorResponse,
  handleApiError,
} from '@/server/shared/utils/api.utils'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Authentication required',
        null,
        HTTP_STATUS.UNAUTHORIZED,
      )
    }

    return devModeController.getStatus(request, session.user.role)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Authentication required',
        null,
        HTTP_STATUS.UNAUTHORIZED,
      )
    }

    return devModeController.activate(request, session.user.role)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return createErrorResponse(
        'UNAUTHORIZED',
        'Authentication required',
        null,
        HTTP_STATUS.UNAUTHORIZED,
      )
    }

    return devModeController.deactivate(request, session.user.role)
  } catch (error) {
    return handleApiError(error)
  }
}
