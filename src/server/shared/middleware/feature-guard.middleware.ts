import { NextRequest, NextResponse } from 'next/server'

import type { FeatureKey } from '@/server/domains/permission'
import { permissionService } from '@/server/domains/permission'
import { auth } from '@/server/lib/auth'
import { HTTP_STATUS } from '@/server/shared/constants/http.constants'
import { createErrorResponse } from '@/server/shared/utils/api.utils'

export type FeatureGuardOptions = {
  feature: FeatureKey
  getCurrentUsage?: (userId: string) => Promise<number>
  customErrorMessage?: string
}

export async function requireFeature(
  request: NextRequest,
  options: FeatureGuardOptions,
): Promise<NextResponse | null> {
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

  const { feature, getCurrentUsage, customErrorMessage } = options

  const usage = getCurrentUsage
    ? await getCurrentUsage(session.user.id)
    : undefined
  const result = await permissionService.checkFeatureAccessForUser(
    session.user.id,
    feature,
    usage,
  )

  if (!result.hasAccess) {
    return NextResponse.json(
      createErrorResponse(
        'FORBIDDEN',
        customErrorMessage || result.reason || 'Accès refusé',
        {
          feature,
          upgradeRequired: result.upgradeRequired,
          currentLimit: result.currentLimit,
          usedLimit: result.usedLimit,
        },
        HTTP_STATUS.FORBIDDEN,
      ),
      { status: HTTP_STATUS.FORBIDDEN },
    )
  }

  return null
}

export function withFeatureGuard(
  feature: FeatureKey,
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>,
  options?: Partial<FeatureGuardOptions>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
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

    const guardResult = await requireFeature(request, {
      feature,
      ...options,
    })

    if (guardResult) {
      return guardResult
    }

    return handler(request, session.user.id)
  }
}
